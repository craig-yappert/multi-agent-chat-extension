import * as vscode from 'vscode';
import * as cp from 'child_process';
import { AgentConfig } from './agents';
import { AgentCommunicationHub } from './agentCommunication';
import { StreamingClaudeProvider, OptimizedMultiProvider, ResponseCache } from './performanceOptimizer';
import { FastTeamProvider } from './fastTeamProvider';
import { FastTeamProviderV2 } from './fastTeamProviderV2';
import { SimpleWebSocketProvider } from './simpleWebSocketProvider';
import { IntelligentProvider } from './providers/intelligentProvider';

export interface AIProvider {
	sendMessage(message: string, agentConfig: AgentConfig, context?: any): Promise<string>;
}

export class ClaudeProvider implements AIProvider {
	private streamingProvider?: StreamingClaudeProvider;
	private cache: ResponseCache = new ResponseCache();

	constructor(private context: vscode.ExtensionContext, onStreamCallback?: (chunk: string, agentId: string) => void) {
		const config = vscode.workspace.getConfiguration('claudeCodeChat');
		if (config.get<boolean>('performance.enableStreaming', true)) {
			this.streamingProvider = new StreamingClaudeProvider(context, onStreamCallback);
		}
	}

	async sendMessage(message: string, agentConfig: AgentConfig, context?: any): Promise<string> {
		const config = vscode.workspace.getConfiguration('claudeCodeChat');

		// Use streaming provider if available and enabled
		if (this.streamingProvider && config.get<boolean>('performance.enableStreaming', true)) {
			return this.streamingProvider.sendMessageStreaming(message, agentConfig, context);
		}

		// Check cache if enabled
		if (config.get<boolean>('performance.enableCache', true)) {
			const cached = this.cache.get(message, agentConfig.id);
			if (cached) {
				console.log(`[Cache HIT] ${agentConfig.id}`);
				return cached;
			}
		}
		const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
		const cwd = workspaceFolder ? workspaceFolder.uri.fsPath : process.cwd();

		// Get configuration (already declared above)
		const thinkingIntensity = config.get<string>('thinking.intensity', 'think');

		// Build context with conversation history
		let roleContext = `You are ${agentConfig.name}, a ${agentConfig.role}. ${agentConfig.description}\n\nYour capabilities: ${agentConfig.capabilities.join(', ')}\nYour specializations: ${agentConfig.specializations.join(', ')}\n\n`;

		// Add conversation history if available
		if (context?.conversationHistory && context.conversationHistory.length > 0) {
			roleContext += 'Previous conversation context:\n';
			for (const msg of context.conversationHistory.slice(-10)) { // Last 5 exchanges
				if (msg.role === 'user') {
					roleContext += `User: ${msg.content}\n`;
				} else {
					roleContext += `You: ${msg.content.substring(0, 200)}...\n`; // Truncate long responses
				}
			}
			roleContext += '\n';
		}

		// Add note about file operations for Executor agent
		if (agentConfig.id === 'executor' && context?.extensionContext) {
			roleContext += `Note: For file operations, provide clear descriptions of what files you would create or modify. The VS Code extension will handle the actual file operations based on your instructions.\n\n`;
		}

		roleContext += `User message: ${message}`;

		// Build Claude command args (based on original working implementation)
		const args: string[] = [];

		// Add model if specified
		if (agentConfig.model && agentConfig.model !== 'default') {
			args.push('--model', agentConfig.model);
		}

		console.log('Claude command args:', args);

		const wslEnabled = config.get<boolean>('wsl.enabled', false);
		const wslDistro = config.get<string>('wsl.distro', 'Ubuntu');
		const nodePath = config.get<string>('wsl.nodePath', '/usr/bin/node');
		const claudePath = config.get<string>('wsl.claudePath', '/usr/local/bin/claude');

		return new Promise((resolve, reject) => {
			let claudeProcess: cp.ChildProcess;

			if (wslEnabled) {
				const wslCommand = `"${nodePath}" --no-warnings --enable-source-maps "${claudePath}" ${args.join(' ')}`;
				claudeProcess = cp.spawn('wsl', ['-d', wslDistro, 'bash', '-ic', wslCommand], {
					cwd: cwd,
					stdio: ['pipe', 'pipe', 'pipe'],
					env: {
						...process.env,
						FORCE_COLOR: '0',
						NO_COLOR: '1'
					}
				});
			} else {
				claudeProcess = cp.spawn('claude', args, {
					shell: process.platform === 'win32',
					cwd: cwd,
					stdio: ['pipe', 'pipe', 'pipe'],
					env: {
						...process.env,
						FORCE_COLOR: '0',
						NO_COLOR: '1'
					}
				});
			}

			// Send message
			if (claudeProcess.stdin) {
				claudeProcess.stdin.write(roleContext + '\n');
				claudeProcess.stdin.end();
			}

			let output = '';
			let errorOutput = '';

			if (claudeProcess.stdout) {
				claudeProcess.stdout.on('data', (data) => {
					output += data.toString();
				});
			}

			if (claudeProcess.stderr) {
				claudeProcess.stderr.on('data', (data) => {
					errorOutput += data.toString();
				});
			}

			claudeProcess.on('close', (code) => {
				if (code === 0) {
					const result = output.trim();
					// Cache the response if caching is enabled
					if (config.get<boolean>('performance.enableCache', true)) {
						this.cache.set(message, agentConfig.id, result);
					}
					resolve(result);
				} else {
					reject(new Error(`Claude process failed with code ${code}: ${errorOutput}`));
				}
			});

			claudeProcess.on('error', (error) => {
				reject(error);
			});
		});
	}
}

export class OpenAIProvider implements AIProvider {
	constructor(private claudeProvider: ClaudeProvider) {}

	async sendMessage(message: string, agentConfig: AgentConfig, context?: any): Promise<string> {
		// OpenAI integration not yet implemented - use Claude as fallback
		// Pass the agent's role and capabilities to Claude for proper response
		return this.claudeProvider.sendMessage(message, agentConfig, context);
	}
}

export class MCPProvider implements AIProvider {
	private intelligentProvider?: IntelligentProvider;

	constructor(
		private claudeProvider: ClaudeProvider,
		private context?: vscode.ExtensionContext
	) {
		// Initialize intelligent provider if context is available
		if (context) {
			this.intelligentProvider = new IntelligentProvider(context);
			// Initialize connection in background
			this.intelligentProvider.initialize().catch(err => {
				console.error('[MCPProvider] Failed to initialize intelligent provider:', err);
			});
		}
	}

	async sendMessage(message: string, agentConfig: AgentConfig, context?: any): Promise<string> {
		// Try intelligent routing first (WebSocket -> HTTP -> CLI)
		if (this.intelligentProvider) {
			try {
				return await this.intelligentProvider.sendMessage(message, agentConfig, context);
			} catch (err) {
				console.error('[MCPProvider] Intelligent provider failed, falling back to Claude:', err);
			}
		}

		// Fallback to direct Claude provider
		return this.claudeProvider.sendMessage(message, agentConfig, context);
	}
}

export class MultiProvider implements AIProvider {
	private optimizedProvider?: OptimizedMultiProvider;
	private fastTeamProvider?: FastTeamProvider;
	private fastTeamProviderV2?: FastTeamProviderV2;
	private simpleWsProvider?: SimpleWebSocketProvider;

	constructor(
		private claudeProvider: ClaudeProvider,
		private openaiProvider: OpenAIProvider,
		private mcpProvider: MCPProvider,
		private agentManager?: any,
		private communicationHub?: AgentCommunicationHub,
		private context?: vscode.ExtensionContext,
		onStreamCallback?: (chunk: string, agentId: string) => void
	) {
		if (context) {
			this.optimizedProvider = new OptimizedMultiProvider(context, agentManager, onStreamCallback);
			this.fastTeamProvider = new FastTeamProvider(context, onStreamCallback);
			this.fastTeamProviderV2 = new FastTeamProviderV2(context, onStreamCallback);
			this.simpleWsProvider = new SimpleWebSocketProvider(context);
		}
	}

	async sendMessage(message: string, agentConfig: AgentConfig, context?: any): Promise<string> {
		const config = vscode.workspace.getConfiguration('claudeCodeChat');

		// Use simple WebSocket provider first (fastest, most reliable)
		if (this.simpleWsProvider && this.simpleWsProvider.isConnected()) {
			try {
				console.log('[MultiProvider] Using Simple WebSocket provider');
				const allAgents = this.agentManager?.getAllAgents() || [];
				const teamAgents = allAgents.filter((a: AgentConfig) => a.id !== 'team');
				return await this.simpleWsProvider.sendTeamMessage(message, teamAgents, agentConfig);
			} catch (error) {
				console.error('[MultiProvider] Simple WebSocket failed:', error);
				// Fall through to other providers
			}
		}

		// Use V2 provider for better performance
		if (this.fastTeamProviderV2 && config.get<boolean>('performance.smartAgentSelection', true)) {
			console.log('[MultiProvider] Using FastTeamV2 with smart agent selection');
			return this.fastTeamProviderV2.sendFastTeamMessage(message, agentConfig, context);
		}

		// Check for ultra-fast mode first
		if (config.get<boolean>('performance.ultraFastMode', false) && this.fastTeamProvider) {
			console.log('[MultiProvider] Using FastTeam provider');
			return this.fastTeamProvider.sendFastTeamMessage(message, agentConfig, context);
		}

		// Check if any timeout/first responder settings are configured
		if (this.fastTeamProvider &&
			(config.get<boolean>('performance.useFirstResponders', true) ||
			 config.get<number>('performance.agentTimeout', 8000) < 30000)) {
			console.log('[MultiProvider] Using FastTeam provider with timeout controls');
			return this.fastTeamProvider.sendFastTeamMessage(message, agentConfig, context);
		}

		// Use optimized provider if available and performance settings are enabled
		if (this.optimizedProvider &&
			(config.get<boolean>('performance.quickTeamMode', false) ||
			 config.get<boolean>('performance.localSynthesis', true))) {
			return this.optimizedProvider.sendMessageOptimized(message, agentConfig, context);
		}

		// Use communication hub if available for better coordination
		if (this.communicationHub && context?.useInterAgentComm) {
			return this.sendMessageWithCommunication(message, agentConfig, context);
		}

		// Fallback to original implementation
		return this.sendMessageDirect(message, agentConfig, context);
	}

	private async sendMessageWithCommunication(message: string, agentConfig: AgentConfig, context?: any): Promise<string> {
		// Create a conversation for this team collaboration
		const conversationId = this.communicationHub!.createConversation(
			message,
			['architect', 'coder', 'executor', 'reviewer', 'documenter', 'coordinator']
		);

		// Broadcast the message to all agents and collect responses
		const responses = await this.communicationHub!.broadcastToAgents(
			'team',
			`Please provide your perspective on: ${message}`,
			['architect', 'coder', 'executor', 'reviewer', 'documenter', 'coordinator'],
			{ conversationId, ...context }
		);

		// Format responses
		const formattedResponses: string[] = [];
		for (const [agentId, response] of responses.entries()) {
			const agent = this.agentManager?.getAgent(agentId);
			if (agent) {
				formattedResponses.push(`**${agent.name}:** ${response}`);
			}
		}

		// Synthesize responses
		const synthesisPrompt = `You are the Team coordinator. You've gathered input from multiple specialized agents.
Please synthesize their responses into a unified team response that:
1. Identifies key consensus points
2. Highlights any important differences in perspective
3. Provides a clear, actionable team recommendation

Original user request: "${message}"

Team member responses:
${formattedResponses.join('\n\n')}

Provide a concise synthesis (3-5 sentences) that represents the team's collective wisdom.`;

		const synthesis = await this.claudeProvider.sendMessage(synthesisPrompt, agentConfig, context);

		// Return formatted response with conversation tracking
		return `${agentConfig.icon} **${agentConfig.name} Response:**\n\n${synthesis}\n\n---\n*Team Members Consulted via Inter-Agent Communication*\n*Conversation ID: ${conversationId}*`;
	}

	private async sendMessageDirect(message: string, agentConfig: AgentConfig, context?: any): Promise<string> {
		// Original implementation
		const specializedAgents = [
			{ id: 'architect', name: 'Architect', role: 'System Design & Architecture' },
			{ id: 'coder', name: 'Coder', role: 'Implementation & Development' },
			{ id: 'executor', name: 'Executor', role: 'File Operations & Command Execution' },
			{ id: 'reviewer', name: 'Reviewer', role: 'Code Review & Quality Assurance' },
			{ id: 'documenter', name: 'Documenter', role: 'Documentation & Communication' },
			{ id: 'coordinator', name: 'Coordinator', role: 'Multi-Agent Orchestration' }
		];

		const agentResponses = await Promise.all(
			specializedAgents.map(async (agent) => {
				try {
					const specializedConfig = {
						...agentConfig,
						id: agent.id,
						name: agent.name,
						role: agent.role
					};

					const response = await this.claudeProvider.sendMessage(
						`As the ${agent.name} (${agent.role}), provide a brief (2-3 sentence) perspective on: ${message}`,
						specializedConfig,
						context
					);

					return `**${agent.name}:** ${response}`;
				} catch (error) {
					return `**${agent.name}:** Unable to provide input at this time.`;
				}
			})
		);

		const synthesisPrompt = `You are the Team coordinator. You've gathered input from multiple specialized agents.
Please synthesize their responses into a unified team response that:
1. Identifies key consensus points
2. Highlights any important differences in perspective
3. Provides a clear, actionable team recommendation

Original user request: "${message}"

Team member responses:
${agentResponses.join('\n\n')}

Provide a concise synthesis (3-5 sentences) that represents the team's collective wisdom.`;

		const synthesis = await this.claudeProvider.sendMessage(synthesisPrompt, agentConfig, context);

		return `${agentConfig.icon} **${agentConfig.name} Response:**\n\n${synthesis}\n\n---\n*Team Members Consulted: ${specializedAgents.map(a => a.name).join(', ')}*`;
	}
}

export class ProviderManager {
	private claudeProvider: ClaudeProvider;
	private openaiProvider: OpenAIProvider;
	private mcpProvider: MCPProvider;
	private multiProvider: MultiProvider;
	private communicationHub?: AgentCommunicationHub;

	constructor(
		context: vscode.ExtensionContext,
		agentManager?: any,
		communicationHub?: AgentCommunicationHub,
		onStreamCallback?: (chunk: string, agentId: string) => void
	) {
		this.claudeProvider = new ClaudeProvider(context, onStreamCallback);
		this.openaiProvider = new OpenAIProvider(this.claudeProvider);
		this.mcpProvider = new MCPProvider(this.claudeProvider, context);
		this.communicationHub = communicationHub;
		this.multiProvider = new MultiProvider(
			this.claudeProvider,
			this.openaiProvider,
			this.mcpProvider,
			agentManager,
			communicationHub,
			context,
			onStreamCallback
		);
	}

	getProvider(agentConfig: AgentConfig): AIProvider {
		switch (agentConfig.provider) {
			case 'claude':
				return this.claudeProvider;
			case 'openai':
				return this.openaiProvider;
			case 'mcp':
				return this.mcpProvider;
			case 'multi':
				return this.multiProvider;
			default:
				return this.claudeProvider; // fallback
		}
	}
}