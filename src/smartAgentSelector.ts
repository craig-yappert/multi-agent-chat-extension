import { AgentConfig } from './agents';

interface AgentScore {
    agent: AgentConfig;
    score: number;
    reasons: string[];
}

export class SmartAgentSelector {
    // Keywords associated with each agent
    private agentKeywords: Map<string, string[]> = new Map([
        ['architect', ['design', 'architecture', 'structure', 'pattern', 'system', 'plan', 'blueprint', 'framework', 'strategy']],
        ['coder', ['code', 'implement', 'function', 'class', 'method', 'variable', 'syntax', 'program', 'develop', 'write']],
        ['executor', ['run', 'execute', 'file', 'command', 'terminal', 'bash', 'script', 'operation', 'perform', 'action']],
        ['reviewer', ['review', 'check', 'test', 'quality', 'bug', 'issue', 'improve', 'analyze', 'evaluate', 'assess']],
        ['documenter', ['document', 'explain', 'describe', 'comment', 'readme', 'guide', 'tutorial', 'help', 'clarify', 'annotate']],
        ['coordinator', ['coordinate', 'manage', 'organize', 'delegate', 'orchestrate', 'collaborate', 'team', 'workflow', 'process']]
    ]);

    // Contextual patterns for complex queries
    private contextPatterns: Map<string, string[]> = new Map([
        ['architecture', ['architect', 'reviewer']],
        ['implementation', ['coder', 'executor']],
        ['debugging', ['reviewer', 'coder']],
        ['documentation', ['documenter', 'reviewer']],
        ['refactoring', ['coder', 'architect', 'reviewer']],
        ['testing', ['reviewer', 'executor']],
        ['deployment', ['executor', 'coordinator']],
        ['optimization', ['architect', 'coder', 'reviewer']]
    ]);

    /**
     * Select the most relevant agents for a given message
     */
    selectAgents(
        message: string,
        allAgents: AgentConfig[],
        maxAgents: number = 3,
        forceTeamMode: boolean = false
    ): AgentConfig[] {
        // If forcing team mode or explicitly requesting all agents
        if (forceTeamMode || this.isFullTeamRequest(message)) {
            return allAgents;
        }

        // Calculate scores for each agent
        const scores = this.scoreAgents(message, allAgents);

        // Sort by score and select top agents
        const selected = scores
            .sort((a, b) => b.score - a.score)
            .slice(0, maxAgents)
            .filter(s => s.score > 0) // Only include agents with positive scores
            .map(s => s.agent);

        // Ensure at least one agent is selected
        if (selected.length === 0 && allAgents.length > 0) {
            // Default to coder as the primary agent
            const coder = allAgents.find(a => a.id === 'coder');
            return coder ? [coder] : [allAgents[0]];
        }

        return selected;
    }

    /**
     * Score agents based on message relevance
     */
    private scoreAgents(message: string, agents: AgentConfig[]): AgentScore[] {
        const messageLower = message.toLowerCase();
        const words = this.tokenize(messageLower);

        return agents.map(agent => {
            let score = 0;
            const reasons: string[] = [];

            // Check direct keywords
            const keywords = this.agentKeywords.get(agent.id) || [];
            for (const keyword of keywords) {
                if (messageLower.includes(keyword)) {
                    score += 10;
                    reasons.push(`Keyword match: ${keyword}`);
                }
            }

            // Check word-level matches
            for (const word of words) {
                if (keywords.some(k => k.includes(word) || word.includes(k))) {
                    score += 5;
                    reasons.push(`Partial match: ${word}`);
                }
            }

            // Check agent capabilities
            for (const capability of agent.capabilities) {
                if (messageLower.includes(capability.toLowerCase())) {
                    score += 8;
                    reasons.push(`Capability match: ${capability}`);
                }
            }

            // Check contextual patterns
            const context = this.detectContext(messageLower);
            if (context && this.contextPatterns.has(context)) {
                const recommendedAgents = this.contextPatterns.get(context)!;
                if (recommendedAgents.includes(agent.id)) {
                    score += 15;
                    reasons.push(`Context match: ${context}`);
                }
            }

            // Boost score for explicitly mentioned agents
            if (messageLower.includes(`@${agent.id}`)) {
                score += 100; // Strong preference for explicitly mentioned agents
                reasons.push('Explicitly mentioned');
            }

            return { agent, score, reasons };
        });
    }

    /**
     * Detect the context of the message
     */
    private detectContext(message: string): string | null {
        const contexts = [
            { key: 'architecture', patterns: ['design', 'structure', 'pattern'] },
            { key: 'implementation', patterns: ['implement', 'build', 'create', 'write'] },
            { key: 'debugging', patterns: ['debug', 'fix', 'error', 'issue', 'problem'] },
            { key: 'documentation', patterns: ['document', 'explain', 'describe'] },
            { key: 'refactoring', patterns: ['refactor', 'improve', 'optimize', 'clean'] },
            { key: 'testing', patterns: ['test', 'verify', 'validate', 'check'] },
            { key: 'deployment', patterns: ['deploy', 'release', 'publish'] },
            { key: 'optimization', patterns: ['optimize', 'performance', 'speed', 'efficiency'] }
        ];

        for (const context of contexts) {
            if (context.patterns.some(pattern => message.includes(pattern))) {
                return context.key;
            }
        }

        return null;
    }

    /**
     * Check if the message explicitly requests full team collaboration
     */
    private isFullTeamRequest(message: string): boolean {
        const teamIndicators = [
            'all agents',
            'everyone',
            'full team',
            'entire team',
            '@team',
            'collaborate',
            'brainstorm',
            'all perspectives'
        ];

        const messageLower = message.toLowerCase();
        return teamIndicators.some(indicator => messageLower.includes(indicator));
    }

    /**
     * Tokenize message into words
     */
    private tokenize(message: string): string[] {
        return message
            .replace(/[^\w\s]/g, ' ') // Remove punctuation
            .split(/\s+/) // Split on whitespace
            .filter(word => word.length > 2); // Filter short words
    }

    /**
     * Get agent selection report for debugging
     */
    getSelectionReport(
        message: string,
        allAgents: AgentConfig[],
        maxAgents: number = 3
    ): string {
        const scores = this.scoreAgents(message, allAgents);
        const selected = this.selectAgents(message, allAgents, maxAgents);

        let report = `Agent Selection Report\n`;
        report += `Message: "${message}"\n\n`;
        report += `Scores:\n`;

        scores
            .sort((a, b) => b.score - a.score)
            .forEach(({ agent, score, reasons }) => {
                const isSelected = selected.some(a => a.id === agent.id);
                report += `  ${isSelected ? '✓' : '·'} ${agent.name}: ${score} points\n`;
                if (reasons.length > 0) {
                    report += `    - ${reasons.join('\n    - ')}\n`;
                }
            });

        report += `\nSelected: ${selected.map(a => a.name).join(', ')}`;
        return report;
    }
}