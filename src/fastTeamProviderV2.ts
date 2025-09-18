import * as vscode from 'vscode';
import { AgentConfig } from './agents';
import { IntelligentProvider } from './providers/intelligentProvider';

/**
 * FastTeamProviderV2 - Optimized for speed with smart agent selection
 */
export class FastTeamProviderV2 {
    private intelligentProvider: IntelligentProvider;
    private activeRequests: Map<string, AbortController> = new Map();

    constructor(
        private context: vscode.ExtensionContext,
        private onStreamCallback?: (chunk: string, agentId: string) => void
    ) {
        this.intelligentProvider = new IntelligentProvider(context);
    }

    async sendFastTeamMessage(
        message: string,
        agentConfig: AgentConfig,
        context?: any
    ): Promise<string> {
        const startTime = Date.now();
        console.log(`[FastTeamV2] Starting optimized team query`);

        // Smart agent selection - only query 2-3 most relevant agents
        const selectedAgents = this.selectRelevantAgents(message);
        console.log(`[FastTeamV2] Selected ${selectedAgents.length} agents:`,
            selectedAgents.map(a => a.name).join(', '));

        // Create abort controller for this request
        const requestId = `team_${Date.now()}`;
        const abortController = new AbortController();
        this.activeRequests.set(requestId, abortController);

        try {
            // Process only selected agents in parallel
            const responses = await this.processAgentsOptimized(
                selectedAgents,
                message,
                abortController.signal,
                context
            );

            // Check if we got any responses
            if (responses.length === 0) {
                return `${agentConfig.icon} **${agentConfig.name}**: No agents responded in time. Please try again.`;
            }

            // Quick synthesis
            const synthesis = this.quickSynthesis(responses);
            const elapsed = Date.now() - startTime;

            return `${agentConfig.icon} **${agentConfig.name} Response (Fast Mode)**\n\n${synthesis}\n\n---\n*${responses.length} agents responded in ${(elapsed/1000).toFixed(1)}s*`;

        } finally {
            // Clean up
            this.activeRequests.delete(requestId);
        }
    }

    /**
     * Select 2-3 most relevant agents based on message content
     */
    private selectRelevantAgents(message: string): Array<{id: string, name: string, role: string}> {
        const msgLower = message.toLowerCase();
        const agents = [];

        // Quick keyword-based selection
        if (msgLower.includes('test') || msgLower.includes('validate') || msgLower.includes('verify')) {
            agents.push({ id: 'reviewer', name: 'Reviewer', role: 'Quality Assurance' });
            agents.push({ id: 'executor', name: 'Executor', role: 'Testing & Execution' });
        } else if (msgLower.includes('design') || msgLower.includes('architect') || msgLower.includes('plan')) {
            agents.push({ id: 'architect', name: 'Architect', role: 'System Design' });
            agents.push({ id: 'reviewer', name: 'Reviewer', role: 'Design Review' });
        } else if (msgLower.includes('implement') || msgLower.includes('code') || msgLower.includes('build')) {
            agents.push({ id: 'coder', name: 'Coder', role: 'Implementation' });
            agents.push({ id: 'architect', name: 'Architect', role: 'Technical Guidance' });
        } else if (msgLower.includes('document') || msgLower.includes('explain')) {
            agents.push({ id: 'documenter', name: 'Documenter', role: 'Documentation' });
            agents.push({ id: 'coder', name: 'Coder', role: 'Technical Details' });
        } else {
            // Default: coder and reviewer
            agents.push({ id: 'coder', name: 'Coder', role: 'General Development' });
            agents.push({ id: 'reviewer', name: 'Reviewer', role: 'Quality Check' });
        }

        // Always include coordinator if not already selected (up to 3 agents max)
        if (agents.length < 3 && !agents.find(a => a.id === 'coordinator')) {
            agents.push({ id: 'coordinator', name: 'Coordinator', role: 'Synthesis' });
        }

        return agents.slice(0, 3); // Maximum 3 agents
    }

    /**
     * Process selected agents with optimized timeout and cancellation
     */
    private async processAgentsOptimized(
        agents: Array<{id: string, name: string, role: string}>,
        message: string,
        signal: AbortSignal,
        context?: any
    ): Promise<Array<{agent: string, response: string}>> {
        const responses: Array<{agent: string, response: string}> = [];
        const timeout = 8000; // 8 second timeout per agent

        // Process all agents in parallel
        const promises = agents.map(agent =>
            this.processAgentWithTimeout(agent, message, timeout, signal, context)
                .then(response => {
                    if (response && !signal.aborted) {
                        responses.push({ agent: agent.name, response });
                        console.log(`[FastTeamV2] ${agent.name} responded`);
                    }
                })
                .catch(err => {
                    console.log(`[FastTeamV2] ${agent.name} failed:`, err.message);
                })
        );

        // Wait for first 2 responses or timeout
        await this.waitForFirstResponses(promises, responses, 2, 10000); // 10s total timeout

        return responses;
    }

    /**
     * Process a single agent with timeout
     */
    private async processAgentWithTimeout(
        agent: {id: string, name: string, role: string},
        message: string,
        timeout: number,
        signal: AbortSignal,
        context?: any
    ): Promise<string | null> {
        if (signal.aborted) return null;

        const agentConfig: AgentConfig = {
            id: agent.id,
            name: agent.name,
            role: agent.role,
            description: '',
            icon: '🤖',
            color: '#000',
            capabilities: [],
            provider: 'claude',
            model: 'sonnet',
            specializations: []
        };

        const prompt = `As ${agent.name} (${agent.role}), briefly respond to: ${message}`;

        return Promise.race([
            this.intelligentProvider.sendMessage(prompt, agentConfig, context),
            new Promise<null>((resolve) => {
                setTimeout(() => resolve(null), timeout);
                signal.addEventListener('abort', () => resolve(null));
            })
        ]);
    }

    /**
     * Wait for first N responses or timeout
     */
    private async waitForFirstResponses(
        promises: Promise<void>[],
        responses: Array<{agent: string, response: string}>,
        minResponses: number,
        maxWaitTime: number
    ): Promise<void> {
        const startTime = Date.now();

        return new Promise((resolve) => {
            // Check if we have enough responses
            const checkResponses = () => {
                if (responses.length >= minResponses) {
                    resolve();
                    return true;
                }
                if (Date.now() - startTime > maxWaitTime) {
                    resolve();
                    return true;
                }
                return false;
            };

            // Poll for responses
            const interval = setInterval(() => {
                if (checkResponses()) {
                    clearInterval(interval);
                }
            }, 100);

            // Also resolve when all promises complete
            Promise.allSettled(promises).then(() => {
                clearInterval(interval);
                resolve();
            });
        });
    }

    /**
     * Quick synthesis without API call
     */
    private quickSynthesis(responses: Array<{agent: string, response: string}>): string {
        if (responses.length === 0) {
            return 'No responses received.';
        }

        if (responses.length === 1) {
            return responses[0].response;
        }

        // Combine responses
        let synthesis = '';
        responses.forEach(({ agent, response }) => {
            // Extract first key point from each response
            const firstSentence = response.split(/[.!?]/)[0];
            if (firstSentence) {
                synthesis += `**${agent}**: ${firstSentence.trim()}.\n\n`;
            }
        });

        return synthesis.trim();
    }

    /**
     * Cancel all active requests
     */
    cancelAll(): void {
        for (const [id, controller] of this.activeRequests) {
            console.log(`[FastTeamV2] Cancelling request ${id}`);
            controller.abort();
        }
        this.activeRequests.clear();
    }
}