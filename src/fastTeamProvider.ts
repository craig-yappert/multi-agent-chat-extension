import * as vscode from 'vscode';
import { AgentConfig } from './agents';
import { StreamingClaudeProvider } from './performanceOptimizer';
import { IntelligentProvider } from './providers/intelligentProvider';

export interface FastTeamConfig {
	timeoutMs: number;
	minAgentsRequired: number;
	maxWaitTime: number;
	useFirstResponders: boolean;
	parallelBatchSize: number;
}

export class FastTeamProvider {
	private streamingProvider: StreamingClaudeProvider;
	private intelligentProvider: IntelligentProvider;
	private defaultConfig: FastTeamConfig = {
		timeoutMs: 30000,          // 30 second timeout per agent (for queued Claude requests)
		minAgentsRequired: 2,      // Need at least 2 agents to respond
		maxWaitTime: 35000,        // Max 35 seconds total wait
		useFirstResponders: true,  // Use first N responders
		parallelBatchSize: 3       // Process 3 agents at a time
	};

	constructor(
		private context: vscode.ExtensionContext,
		private onStreamCallback?: (chunk: string, agentId: string) => void
	) {
		this.streamingProvider = new StreamingClaudeProvider(context, onStreamCallback);
		this.intelligentProvider = new IntelligentProvider(context);
	}

	async sendFastTeamMessage(
		message: string,
		agentConfig: AgentConfig,
		context?: any
	): Promise<string> {
		const config = vscode.workspace.getConfiguration('claudeCodeChat');
		const fastConfig: FastTeamConfig = {
			timeoutMs: config.get<number>('performance.agentTimeout', 30000),  // Updated default to 30s for queued requests
			minAgentsRequired: config.get<number>('performance.minAgentsRequired', 2),
			maxWaitTime: config.get<number>('performance.maxTeamWaitTime', 35000),
			useFirstResponders: config.get<boolean>('performance.useFirstResponders', true),
			parallelBatchSize: config.get<number>('performance.parallelBatchSize', 3)
		};

		const startTime = Date.now();
		console.log(`[FastTeam] Starting fast team query`);

		// Define agents with priority order
		const prioritizedAgents = this.getPrioritizedAgents(message);

		// Use different strategies based on config
		if (fastConfig.useFirstResponders) {
			return this.firstRespondersStrategy(message, agentConfig, prioritizedAgents, fastConfig, context);
		} else {
			return this.batchedStrategy(message, agentConfig, prioritizedAgents, fastConfig, context);
		}
	}

	private getPrioritizedAgents(message: string): Array<{id: string, name: string, role: string, priority: number}> {
		const msgLower = message.toLowerCase();
		const agents = [
			{ id: 'architect', name: 'Architect', role: 'System Design', priority: 0 },
			{ id: 'coder', name: 'Coder', role: 'Implementation', priority: 0 },
			{ id: 'executor', name: 'Executor', role: 'Operations', priority: 0 },
			{ id: 'reviewer', name: 'Reviewer', role: 'Quality', priority: 0 },
			{ id: 'documenter', name: 'Documenter', role: 'Documentation', priority: 0 },
			{ id: 'coordinator', name: 'Coordinator', role: 'Orchestration', priority: 0 }
		];

		// Assign priorities based on message content
		if (msgLower.includes('test') || msgLower.includes('evaluate')) {
			agents.find(a => a.id === 'reviewer')!.priority = 10;
			agents.find(a => a.id === 'executor')!.priority = 9;
			agents.find(a => a.id === 'coder')!.priority = 8;
		} else if (msgLower.includes('design') || msgLower.includes('architect')) {
			agents.find(a => a.id === 'architect')!.priority = 10;
			agents.find(a => a.id === 'reviewer')!.priority = 8;
		} else if (msgLower.includes('implement') || msgLower.includes('code')) {
			agents.find(a => a.id === 'coder')!.priority = 10;
			agents.find(a => a.id === 'architect')!.priority = 8;
		} else {
			// Default priority: Coder, Architect, Reviewer as most useful
			agents.find(a => a.id === 'coder')!.priority = 8;
			agents.find(a => a.id === 'architect')!.priority = 7;
			agents.find(a => a.id === 'reviewer')!.priority = 6;
		}

		// Sort by priority (highest first)
		return agents.sort((a, b) => b.priority - a.priority);
	}

	private async firstRespondersStrategy(
		message: string,
		agentConfig: AgentConfig,
		agents: Array<{id: string, name: string, role: string, priority: number}>,
		fastConfig: FastTeamConfig,
		context?: any
	): Promise<string> {
		const responses: Map<string, string> = new Map();
		const startTime = Date.now();

		console.log(`[FastTeam] Starting with timeout=${fastConfig.timeoutMs}ms, minRequired=${fastConfig.minAgentsRequired}`);

		// Launch all agents in parallel with individual timeouts
		const agentPromises = agents.map(async (agent) => {
			const agentStartTime = Date.now();

			try {
				// Create a timeout promise
				const timeoutPromise = new Promise<string>((_, reject) => {
					setTimeout(() => {
						reject(new Error(`Timeout after ${fastConfig.timeoutMs}ms`));
					}, fastConfig.timeoutMs);
				});

				// Race between actual call and timeout
				const response = await Promise.race([
					this.intelligentProvider.sendMessage(
						`${agent.name}: ${message} (1 sentence max)`,
						{ ...agentConfig, id: agent.id, name: agent.name, role: agent.role },
						{ ...context, isTeamQuery: true, isFastMode: true, ultraBrief: true }
					),
					timeoutPromise
				]);

				const elapsed = Date.now() - agentStartTime;
				console.log(`[FastTeam] ${agent.name} SUCCESS in ${elapsed}ms`);
				return { agent, response, elapsed };

			} catch (error: any) {
				const elapsed = Date.now() - agentStartTime;
				if (error.message?.includes('Timeout')) {
					console.log(`[FastTeam] ${agent.name} TIMEOUT after ${elapsed}ms`);
				} else {
					console.log(`[FastTeam] ${agent.name} ERROR after ${elapsed}ms: ${error.message}`);
				}
				return null;
			}
		});

		// Wait for all agents to complete or timeout
		const results = await Promise.allSettled(agentPromises);

		// Collect successful responses
		let successCount = 0;
		for (const result of results) {
			if (result.status === 'fulfilled' && result.value) {
				const { agent, response } = result.value;
				responses.set(agent.id, `**${agent.name}:** ${response}`);
				successCount++;
				console.log(`[FastTeam] Added ${agent.name} response (${successCount} total)`);
			}
		}

		const elapsed = Date.now() - startTime;
		console.log(`[FastTeam] Final: Collected ${responses.size} responses in ${elapsed}ms`);

		// Generate response
		if (responses.size === 0) {
			return `${agentConfig.icon} **${agentConfig.name} Response**: Unable to get agent responses in time. Please try again. (Timeout: ${fastConfig.timeoutMs}ms)`;
		}

		const synthesis = this.quickLocalSynthesis(Array.from(responses.values()));
		return `${agentConfig.icon} **${agentConfig.name} Response (Fast Mode)**\n\n${synthesis}\n\n---\n*${responses.size} agents responded in ${(elapsed/1000).toFixed(1)}s*`;
	}

	private async batchedStrategy(
		message: string,
		agentConfig: AgentConfig,
		agents: Array<{id: string, name: string, role: string, priority: number}>,
		fastConfig: FastTeamConfig,
		context?: any
	): Promise<string> {
		// For now, just use the same strategy as firstResponders
		// Can be optimized later for true batching
		return this.firstRespondersStrategy(message, agentConfig, agents, fastConfig, context);
	}


	private quickLocalSynthesis(responses: string[]): string {
		if (responses.length === 0) {
			return "No agent responses available.";
		}

		if (responses.length === 1) {
			return `Based on agent analysis:\n\n${responses[0]}`;
		}

		// Extract key points from each response
		const keyPoints: string[] = [];
		responses.forEach(response => {
			// Extract the agent's main point (first sentence after agent name)
			const match = response.match(/\*\*.*?\*\*:\s*([^.!?]+[.!?])/);
			if (match && match[1]) {
				keyPoints.push(`• ${match[1].trim()}`);
			}
		});

		if (keyPoints.length === 0) {
			return responses.join('\n\n');
		}

		return `Team Analysis:\n\n${keyPoints.join('\n')}\n\n**Consensus:** The team has provided ${responses.length} perspectives on your request. Consider all viewpoints for a comprehensive approach.`;
	}

	private delay(ms: number): Promise<void> {
		return new Promise(resolve => setTimeout(resolve, ms));
	}
}

// Ultra-fast single agent mode for testing
export class SingleAgentFastMode {
	private streamingProvider: StreamingClaudeProvider;
	private intelligentProvider: IntelligentProvider;

	constructor(
		private context: vscode.ExtensionContext,
		private onStreamCallback?: (chunk: string, agentId: string) => void
	) {
		this.streamingProvider = new StreamingClaudeProvider(context, onStreamCallback);
		this.intelligentProvider = new IntelligentProvider(context);
	}

	async sendMessage(
		message: string,
		agentConfig: AgentConfig,
		context?: any
	): Promise<string> {
		const config = vscode.workspace.getConfiguration('claudeCodeChat');

		// Super minimal context for speed
		const minimalContext = config.get<boolean>('performance.ultraMinimalMode', false);

		if (minimalContext) {
			// Override with ultra-minimal context
			const overrideConfig = {
				...agentConfig,
				role: agentConfig.name,
				description: '',
				capabilities: [],
				specializations: []
			};

			return this.intelligentProvider.sendMessage(
				message,
				overrideConfig,
				{ ...context, ultraMinimal: true }
			);
		}

		return this.streamingProvider.sendMessageStreaming(message, agentConfig, context);
	}
}