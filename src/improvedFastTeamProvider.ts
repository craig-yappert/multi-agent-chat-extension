import * as vscode from 'vscode';
import * as WebSocket from 'ws';
import { AgentConfig, AgentManager } from './agents';
import { SmartAgentSelector } from './smartAgentSelector';
import { RequestManager } from './requestManager';
import { IntelligentProvider } from './providers/intelligentProvider';

export interface ImprovedTeamConfig {
    maxAgents: number;
    timeout: number;
    useSmartSelection: boolean;
    enableProgress: boolean;
}

export class ImprovedFastTeamProvider {
    private smartSelector: SmartAgentSelector;
    private requestManager: RequestManager;
    private intelligentProvider: IntelligentProvider;
    private wsConnection?: WebSocket;

    constructor(
        private context: vscode.ExtensionContext,
        private agentManager: AgentManager,
        private onStreamCallback?: (chunk: string, agentId: string) => void
    ) {
        this.smartSelector = new SmartAgentSelector();
        this.requestManager = new RequestManager(3); // Max 3 concurrent requests
        this.intelligentProvider = new IntelligentProvider(context);

        // Set up request manager event listeners
        this.setupRequestManagerEvents();
    }

    /**
     * Send a message to the team with improved performance
     */
    async sendImprovedTeamMessage(
        message: string,
        agentConfig: AgentConfig,
        context?: any
    ): Promise<string> {
        const config = vscode.workspace.getConfiguration('claudeCodeChat');
        const teamConfig: ImprovedTeamConfig = {
            maxAgents: config.get<number>('performance.maxConcurrentAgents', 3),
            timeout: config.get<number>('performance.requestTimeout', 15000),
            useSmartSelection: config.get<boolean>('performance.smartAgentSelection', true),
            enableProgress: config.get<boolean>('performance.enableStreaming', true)
        };

        const startTime = Date.now();
        console.log(`[ImprovedTeam] Starting team query with config:`, teamConfig);

        // Smart agent selection
        const allAgents = this.agentManager.getAllAgents().filter(a => a.id !== 'team');
        const selectedAgents = teamConfig.useSmartSelection
            ? this.smartSelector.selectAgents(message, allAgents, teamConfig.maxAgents)
            : allAgents.slice(0, teamConfig.maxAgents);

        console.log(`[ImprovedTeam] Selected ${selectedAgents.length} agents:`,
            selectedAgents.map(a => a.name).join(', '));

        // Send progress update
        if (teamConfig.enableProgress && this.onStreamCallback) {
            this.onStreamCallback(
                `🔍 Analyzing request and selecting agents: ${selectedAgents.map(a => a.icon).join(' ')}\n\n`,
                'team'
            );
        }

        // Process agents in parallel with proper cancellation
        const responses = await this.processAgentsParallel(
            selectedAgents,
            message,
            teamConfig,
            context
        );

        // Check if we got any responses
        if (responses.length === 0) {
            return `${agentConfig.icon} **${agentConfig.name}**: Unable to get agent responses. Please try again.`;
        }

        // Synthesize responses
        const synthesis = await this.synthesizeResponses(responses, message, agentConfig);

        const elapsed = Date.now() - startTime;
        return `${agentConfig.icon} **${agentConfig.name} Response**\n\n${synthesis}\n\n---\n*${responses.length} agents responded in ${(elapsed/1000).toFixed(1)}s*`;
    }

    /**
     * Process agents in parallel with proper timeout and cancellation
     */
    private async processAgentsParallel(
        agents: AgentConfig[],
        message: string,
        config: ImprovedTeamConfig,
        context?: any
    ): Promise<Array<{agent: string; response: string}>> {
        const responses: Array<{agent: string; response: string}> = [];
        const requestPromises: Promise<void>[] = [];

        for (const agent of agents) {
            const promise = this.processAgent(agent, message, config, context)
                .then(response => {
                    if (response) {
                        responses.push({ agent: agent.name, response });

                        // Stream progress
                        if (config.enableProgress && this.onStreamCallback) {
                            this.onStreamCallback(
                                `✅ ${agent.icon} ${agent.name} responded\n`,
                                'team'
                            );
                        }
                    }
                })
                .catch(error => {
                    console.error(`[ImprovedTeam] Agent ${agent.name} failed:`, error);

                    // Stream error
                    if (config.enableProgress && this.onStreamCallback) {
                        this.onStreamCallback(
                            `❌ ${agent.icon} ${agent.name} failed\n`,
                            'team'
                        );
                    }
                });

            requestPromises.push(promise);
        }

        // Wait for all agents with overall timeout
        const timeoutPromise = new Promise<void>((_, reject) => {
            setTimeout(() => reject(new Error('Overall timeout')), config.timeout + 5000);
        });

        try {
            await Promise.race([
                Promise.allSettled(requestPromises),
                timeoutPromise
            ]);
        } catch (error) {
            console.log('[ImprovedTeam] Overall timeout reached, cancelling remaining requests');
            this.requestManager.cancelAll('Overall timeout');
        }

        return responses;
    }

    /**
     * Process a single agent with proper timeout
     */
    private async processAgent(
        agent: AgentConfig,
        message: string,
        config: ImprovedTeamConfig,
        context?: any
    ): Promise<string | null> {
        const agentPrompt = `As ${agent.name} (${agent.role}), provide your perspective on: ${message}`;

        try {
            // Try intelligent provider first for speed
            const response = await Promise.race([
                this.intelligentProvider.sendMessage(agentPrompt, agent, context),
                new Promise<string>((_, reject) =>
                    setTimeout(() => reject(new Error('Timeout')), config.timeout)
                )
            ]);

            return response;
        } catch (error) {
            console.error(`[ImprovedTeam] Agent ${agent.name} error:`, error);
            return null;
        }
    }

    /**
     * Synthesize multiple agent responses into a cohesive team response
     */
    private async synthesizeResponses(
        responses: Array<{agent: string; response: string}>,
        originalMessage: string,
        agentConfig: AgentConfig
    ): Promise<string> {
        // If only one response, return it directly
        if (responses.length === 1) {
            return responses[0].response;
        }

        // Quick local synthesis for speed
        const synthesis = this.localSynthesis(responses, originalMessage);

        // Optionally enhance with API call if time permits
        // (This could be done async and cached for future use)

        return synthesis;
    }

    /**
     * Local synthesis without API call
     */
    private localSynthesis(
        responses: Array<{agent: string; response: string}>,
        originalMessage: string
    ): string {
        const perspectives: string[] = [];

        // Extract key points from each response
        for (const { agent, response } of responses) {
            const keyPoints = this.extractKeyPoints(response);
            if (keyPoints.length > 0) {
                perspectives.push(`**${agent}**: ${keyPoints.join('; ')}`);
            }
        }

        // Build synthesis
        let synthesis = '### Team Analysis\n\n';

        // Add consensus points
        const consensus = this.findConsensus(responses);
        if (consensus.length > 0) {
            synthesis += '**Consensus Points:**\n';
            consensus.forEach(point => synthesis += `• ${point}\n`);
            synthesis += '\n';
        }

        // Add individual perspectives
        if (perspectives.length > 0) {
            synthesis += '**Individual Perspectives:**\n';
            perspectives.forEach(p => synthesis += `${p}\n`);
            synthesis += '\n';
        }

        // Add recommendation
        synthesis += '**Recommendation:**\n';
        synthesis += this.generateRecommendation(responses, originalMessage);

        return synthesis;
    }

    /**
     * Extract key points from a response
     */
    private extractKeyPoints(response: string): string[] {
        const points: string[] = [];
        const lines = response.split('\n').filter(l => l.trim().length > 0);

        // Look for bullet points or numbered lists
        for (const line of lines) {
            if (line.match(/^[\-\*•]\s+/) || line.match(/^\d+[\.\)]\s+/)) {
                points.push(line.replace(/^[\-\*•\d\.\)]\s+/, '').trim());
            }
        }

        // If no bullets found, take first sentence
        if (points.length === 0 && lines.length > 0) {
            const firstSentence = lines[0].split(/[.!?]/)[0];
            if (firstSentence) points.push(firstSentence.trim());
        }

        return points.slice(0, 3); // Limit to 3 key points
    }

    /**
     * Find consensus points across responses
     */
    private findConsensus(responses: Array<{agent: string; response: string}>): string[] {
        const consensus: string[] = [];

        // Simple keyword-based consensus detection
        const keywords = new Map<string, number>();

        for (const { response } of responses) {
            const words = response.toLowerCase().split(/\W+/);
            for (const word of words) {
                if (word.length > 4) { // Skip short words
                    keywords.set(word, (keywords.get(word) || 0) + 1);
                }
            }
        }

        // Find words mentioned by multiple agents
        const threshold = Math.ceil(responses.length * 0.6);
        const commonWords = Array.from(keywords.entries())
            .filter(([_, count]) => count >= threshold)
            .map(([word]) => word)
            .slice(0, 5);

        if (commonWords.length > 0) {
            consensus.push(`Focus on ${commonWords.join(', ')}`);
        }

        return consensus;
    }

    /**
     * Generate a recommendation based on responses
     */
    private generateRecommendation(
        responses: Array<{agent: string; response: string}>,
        originalMessage: string
    ): string {
        const msgLower = originalMessage.toLowerCase();

        if (msgLower.includes('implement') || msgLower.includes('build')) {
            return 'Based on team analysis, proceed with implementation focusing on the consensus points above.';
        } else if (msgLower.includes('fix') || msgLower.includes('debug')) {
            return 'The team recommends investigating the identified issues and applying the suggested fixes.';
        } else if (msgLower.includes('review') || msgLower.includes('check')) {
            return 'The team suggests addressing the review points before proceeding.';
        } else {
            return 'Consider the team perspectives above and proceed with the approach that best fits your requirements.';
        }
    }

    /**
     * Set up event listeners for request manager
     */
    private setupRequestManagerEvents(): void {
        this.requestManager.on('request-start', (data) => {
            console.log(`[RequestManager] Starting: ${data.agent}`);
        });

        this.requestManager.on('request-complete', (data) => {
            console.log(`[RequestManager] Completed: ${data.agent} in ${data.duration}ms`);
        });

        this.requestManager.on('request-error', (data) => {
            console.error(`[RequestManager] Error: ${data.agent} - ${data.error}`);
        });

        this.requestManager.on('response-chunk', (data) => {
            if (this.onStreamCallback) {
                this.onStreamCallback(data.chunk, data.agent);
            }
        });
    }

    /**
     * Clean up resources
     */
    dispose(): void {
        this.requestManager.cancelAll('Provider disposed');
    }
}