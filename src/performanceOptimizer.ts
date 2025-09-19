import * as vscode from 'vscode';
import * as cp from 'child_process';
import { AgentConfig } from './agents';

export interface PerformanceMetrics {
	requestStart: number;
	firstTokenTime?: number;
	completionTime?: number;
	totalTokens?: number;
	agentId: string;
	cached?: boolean;
}

export class ResponseCache {
	private cache: Map<string, { response: string; timestamp: number }> = new Map();
	private maxAge: number = 5 * 60 * 1000; // 5 minutes
	private maxSize: number = 100;

	constructor() {
		// Clean up old entries periodically
		setInterval(() => this.cleanup(), 60000);
	}

	getCacheKey(message: string, agentId: string): string {
		// Simple hash for cache key
		const str = `${agentId}:${message.toLowerCase().trim()}`;
		let hash = 0;
		for (let i = 0; i < str.length; i++) {
			const char = str.charCodeAt(i);
			hash = ((hash << 5) - hash) + char;
			hash = hash & hash;
		}
		return `${agentId}_${hash}`;
	}

	get(message: string, agentId: string): string | null {
		const key = this.getCacheKey(message, agentId);
		const cached = this.cache.get(key);

		if (cached && (Date.now() - cached.timestamp) < this.maxAge) {
			return cached.response;
		}

		return null;
	}

	set(message: string, agentId: string, response: string): void {
		const key = this.getCacheKey(message, agentId);
		this.cache.set(key, { response, timestamp: Date.now() });

		// Limit cache size
		if (this.cache.size > this.maxSize) {
			const firstKey = this.cache.keys().next().value;
			if (firstKey !== undefined) {
				this.cache.delete(firstKey);
			}
		}
	}

	cleanup(): void {
		const now = Date.now();
		for (const [key, value] of this.cache.entries()) {
			if (now - value.timestamp > this.maxAge) {
				if (key) {
					this.cache.delete(key);
				}
			}
		}
	}

	clear(): void {
		this.cache.clear();
	}
}

export class StreamingClaudeProvider {
	private cache: ResponseCache = new ResponseCache();
	private metricsChannel?: vscode.OutputChannel;

	constructor(
		private context: vscode.ExtensionContext,
		private onStreamCallback?: (chunk: string, agentId: string) => void
	) {
		this.metricsChannel = vscode.window.createOutputChannel('Multi-Agent Performance');
	}

	async sendMessageStreaming(
		message: string,
		agentConfig: AgentConfig,
		context?: any
	): Promise<string> {
		const metrics: PerformanceMetrics = {
			requestStart: Date.now(),
			agentId: agentConfig.id
		};

		// Check cache first
		const cached = this.cache.get(message, agentConfig.id);
		if (cached) {
			metrics.cached = true;
			metrics.completionTime = Date.now();
			this.logMetrics(metrics);

			// Stream cached response if callback provided
			if (this.onStreamCallback) {
				const words = cached.split(' ');
				for (let i = 0; i < words.length; i += 5) {
					const chunk = words.slice(i, i + 5).join(' ') + ' ';
					this.onStreamCallback(chunk, agentConfig.id);
					await this.delay(10);
				}
			}

			return cached;
		}

		const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
		const cwd = workspaceFolder ? workspaceFolder.uri.fsPath : process.cwd();

		// Get configuration
		const config = vscode.workspace.getConfiguration('multiAgentChat');

		// Build minimal role context to reduce tokens
		const roleContext = this.buildOptimizedRoleContext(message, agentConfig, context);

		const args: string[] = [];
		if (agentConfig.model && agentConfig.model !== 'default') {
			args.push('--model', agentConfig.model);
		}

		return new Promise((resolve, reject) => {
			const wslEnabled = config.get<boolean>('wsl.enabled', false);
			let claudeProcess: cp.ChildProcess;

			if (wslEnabled) {
				const wslDistro = config.get<string>('wsl.distro', 'Ubuntu');
				const nodePath = config.get<string>('wsl.nodePath', '/usr/bin/node');
				const claudePath = config.get<string>('wsl.claudePath', '/usr/local/bin/claude');
				const wslCommand = `"${nodePath}" --no-warnings --enable-source-maps "${claudePath}" ${args.join(' ')}`;
				claudeProcess = cp.spawn('wsl', ['-d', wslDistro, 'bash', '-ic', wslCommand], {
					cwd: cwd,
					stdio: ['pipe', 'pipe', 'pipe'],
					env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' }
				});
			} else {
				claudeProcess = cp.spawn('claude', args, {
					shell: process.platform === 'win32',
					cwd: cwd,
					stdio: ['pipe', 'pipe', 'pipe'],
					env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' }
				});
			}

			// Send message
			if (claudeProcess.stdin) {
				claudeProcess.stdin.write(roleContext + '\n');
				claudeProcess.stdin.end();
			}

			let output = '';
			let errorOutput = '';
			let firstTokenReceived = false;

			if (claudeProcess.stdout) {
				claudeProcess.stdout.on('data', (data) => {
					const chunk = data.toString();
					output += chunk;

					// Record first token time
					if (!firstTokenReceived) {
						firstTokenReceived = true;
						metrics.firstTokenTime = Date.now();
					}

					// Stream to callback if provided
					if (this.onStreamCallback) {
						this.onStreamCallback(chunk, agentConfig.id);
					}
				});
			}

			if (claudeProcess.stderr) {
				claudeProcess.stderr.on('data', (data) => {
					errorOutput += data.toString();
				});
			}

			claudeProcess.on('close', (code) => {
				metrics.completionTime = Date.now();
				this.logMetrics(metrics);

				if (code === 0) {
					const trimmedOutput = output.trim();
					// Cache successful responses
					this.cache.set(message, agentConfig.id, trimmedOutput);
					resolve(trimmedOutput);
				} else {
					reject(new Error(`Claude process failed with code ${code}: ${errorOutput}`));
				}
			});

			claudeProcess.on('error', (error) => {
				reject(error);
			});
		});
	}

	private buildOptimizedRoleContext(message: string, agentConfig: AgentConfig, context?: any): string {
		// Ultra-brief mode for maximum speed
		if (context?.ultraBrief) {
			return message; // Just the message, role is already in the message
		}

		// Shorter, more focused role context to reduce tokens
		if (context?.isTeamQuery || context?.isFastMode) {
			// Brief for team queries
			return `${agentConfig.name}: ${message}`;
		}

		// Standard optimized context
		return `You are ${agentConfig.name}. Role: ${agentConfig.role}.
Key capabilities: ${agentConfig.capabilities.slice(0, 3).join(', ')}.
User message: ${message}`;
	}

	private logMetrics(metrics: PerformanceMetrics): void {
		const duration = (metrics.completionTime || Date.now()) - metrics.requestStart;
		const ttft = metrics.firstTokenTime ? metrics.firstTokenTime - metrics.requestStart : 0;

		const logMessage = `[${metrics.agentId}] Duration: ${duration}ms, TTFT: ${ttft}ms${metrics.cached ? ' (CACHED)' : ''}`;

		if (this.metricsChannel) {
			this.metricsChannel.appendLine(logMessage);
		}
		console.log(`[Performance] ${logMessage}`);
	}

	private delay(ms: number): Promise<void> {
		return new Promise(resolve => setTimeout(resolve, ms));
	}
}

export class OptimizedMultiProvider {
	private streamingProvider: StreamingClaudeProvider;

	constructor(
		private context: vscode.ExtensionContext,
		private agentManager: any,
		private onStreamCallback?: (chunk: string, agentId: string) => void
	) {
		this.streamingProvider = new StreamingClaudeProvider(context, onStreamCallback);
	}

	async sendMessageOptimized(
		message: string,
		agentConfig: AgentConfig,
		context?: any
	): Promise<string> {
		const config = vscode.workspace.getConfiguration('multiAgentChat');
		const quickMode = config.get<boolean>('performance.quickTeamMode', false);

		if (quickMode) {
			// Quick mode: Only query 3 most relevant agents
			return this.sendQuickTeamMessage(message, agentConfig, context);
		} else {
			// Standard mode: Query all agents but optimized
			return this.sendOptimizedTeamMessage(message, agentConfig, context);
		}
	}

	private async sendQuickTeamMessage(
		message: string,
		agentConfig: AgentConfig,
		context?: any
	): Promise<string> {
		// Intelligently select 3 most relevant agents based on message content
		const selectedAgents = this.selectRelevantAgents(message, 3);

		const agentResponses = await Promise.all(
			selectedAgents.map(agent =>
				this.streamingProvider.sendMessageStreaming(
					message,
					{ ...agentConfig, id: agent.id, name: agent.name, role: agent.role },
					{ ...context, isTeamQuery: true }
				).catch(() => `${agent.name}: Unable to respond.`)
			)
		);

		// Quick synthesis without another API call
		const synthesis = this.quickSynthesize(agentResponses, selectedAgents);

		return `${agentConfig.icon} **Team Response (Quick Mode)**\n\n${synthesis}\n\n---\n*Agents: ${selectedAgents.map(a => a.name).join(', ')}*`;
	}

	private async sendOptimizedTeamMessage(
		message: string,
		agentConfig: AgentConfig,
		context?: any
	): Promise<string> {
		const allAgents = [
			{ id: 'architect', name: 'Architect', role: 'System Design' },
			{ id: 'coder', name: 'Coder', role: 'Implementation' },
			{ id: 'executor', name: 'Executor', role: 'Operations' },
			{ id: 'reviewer', name: 'Reviewer', role: 'Quality' },
			{ id: 'documenter', name: 'Documenter', role: 'Documentation' },
			{ id: 'coordinator', name: 'Coordinator', role: 'Orchestration' }
		];

		// Start all requests in parallel with streaming
		const responses = await Promise.allSettled(
			allAgents.map(agent =>
				this.streamingProvider.sendMessageStreaming(
					message,
					{ ...agentConfig, id: agent.id, name: agent.name, role: agent.role },
					{ ...context, isTeamQuery: true }
				)
			)
		);

		// Collect successful responses
		const agentResponses: string[] = [];
		responses.forEach((result, index) => {
			if (result.status === 'fulfilled') {
				agentResponses.push(`**${allAgents[index].name}:** ${result.value}`);
			}
		});

		// If we have enough responses, synthesize locally
		if (agentResponses.length >= 3) {
			const synthesis = this.localSynthesize(agentResponses);
			return `${agentConfig.icon} **Team Response**\n\n${synthesis}\n\n---\n*${agentResponses.length}/6 agents responded*`;
		}

		// Fallback to API synthesis if needed
		const synthesisPrompt = `Synthesize these agent responses concisely:\n\n${agentResponses.join('\n\n')}`;
		const synthesis = await this.streamingProvider.sendMessageStreaming(
			synthesisPrompt,
			agentConfig,
			context
		);

		return `${agentConfig.icon} **Team Response**\n\n${synthesis}\n\n---\n*Team Members: ${agentResponses.length}/6*`;
	}

	private selectRelevantAgents(message: string, count: number): any[] {
		const msgLower = message.toLowerCase();
		const agents = [];

		// Priority selection based on keywords
		if (msgLower.includes('design') || msgLower.includes('architect') || msgLower.includes('plan')) {
			agents.push({ id: 'architect', name: 'Architect', role: 'System Design' });
		}
		if (msgLower.includes('code') || msgLower.includes('implement') || msgLower.includes('function')) {
			agents.push({ id: 'coder', name: 'Coder', role: 'Implementation' });
		}
		if (msgLower.includes('review') || msgLower.includes('check') || msgLower.includes('quality')) {
			agents.push({ id: 'reviewer', name: 'Reviewer', role: 'Quality' });
		}
		if (msgLower.includes('run') || msgLower.includes('execute') || msgLower.includes('file')) {
			agents.push({ id: 'executor', name: 'Executor', role: 'Operations' });
		}
		if (msgLower.includes('document') || msgLower.includes('explain') || msgLower.includes('describe')) {
			agents.push({ id: 'documenter', name: 'Documenter', role: 'Documentation' });
		}

		// Fill remaining slots with default agents
		const defaults = [
			{ id: 'coder', name: 'Coder', role: 'Implementation' },
			{ id: 'architect', name: 'Architect', role: 'System Design' },
			{ id: 'reviewer', name: 'Reviewer', role: 'Quality' }
		];

		for (const agent of defaults) {
			if (agents.length >= count) break;
			if (!agents.find(a => a.id === agent.id)) {
				agents.push(agent);
			}
		}

		return agents.slice(0, count);
	}

	private quickSynthesize(responses: string[], agents: any[]): string {
		// Local synthesis without API call
		const points: string[] = [];

		responses.forEach((response, index) => {
			if (!response.includes('Unable to respond')) {
				// Extract key point (first sentence)
				const firstSentence = response.split('.')[0];
				if (firstSentence && firstSentence.length > 10) {
					points.push(`• ${agents[index].name}: ${firstSentence}`);
				}
			}
		});

		if (points.length === 0) {
			return "Team members were unable to provide input at this time.";
		}

		return `Team Analysis:\n${points.join('\n')}\n\nConsensus: Based on the perspectives above, the team recommends proceeding with careful consideration of each agent's input.`;
	}

	private localSynthesize(responses: string[]): string {
		// More sophisticated local synthesis
		const validResponses = responses.filter(r => !r.includes('Unable to'));

		if (validResponses.length < 3) {
			return "Insufficient agent responses for synthesis.";
		}

		// Extract common themes (simple keyword frequency)
		const keywords: Map<string, number> = new Map();
		const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for']);

		validResponses.forEach(response => {
			const words = response.toLowerCase().split(/\s+/);
			words.forEach(word => {
				const cleaned = word.replace(/[^a-z0-9]/g, '');
				if (cleaned.length > 3 && !stopWords.has(cleaned)) {
					keywords.set(cleaned, (keywords.get(cleaned) || 0) + 1);
				}
			});
		});

		// Get top themes
		const topThemes = Array.from(keywords.entries())
			.sort((a, b) => b[1] - a[1])
			.slice(0, 3)
			.map(([word]) => word);

		return `Team Consensus: The agents have analyzed your request with focus on ${topThemes.join(', ')}. ${validResponses.length} agents provided input, offering diverse perspectives on the task. The team recommends a comprehensive approach considering all viewpoints presented above.`;
	}
}