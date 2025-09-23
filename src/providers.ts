import * as vscode from 'vscode';
import * as cp from 'child_process';
import { AgentConfig } from './agents';
import { AgentCommunicationHub } from './agentCommunication';
import { StreamingClaudeProvider, OptimizedMultiProvider, ResponseCache } from './performanceOptimizer';
import { MCPWebSocketProvider } from './providers/mcpWebSocketProvider';
import { AgentMessageParser } from './agentMessageParser';

export interface AIProvider {
	sendMessage(message: string, agentConfig: AgentConfig, context?: any): Promise<string>;
}

export class ClaudeProvider implements AIProvider {
	private streamingProvider?: StreamingClaudeProvider;
	private mcpWebSocketProvider?: MCPWebSocketProvider;
	private cache: ResponseCache = new ResponseCache();
	private messageParser?: AgentMessageParser;
	private communicationHub?: AgentCommunicationHub;
	private agentManager?: any;

	constructor(
		private context: vscode.ExtensionContext,
		onStreamCallback?: (chunk: string, agentId: string) => void,
		mcpServerManager?: any,
		agentManager?: any,
		communicationHub?: AgentCommunicationHub
	) {
		this.agentManager = agentManager;
		this.communicationHub = communicationHub;
		if (agentManager && communicationHub) {
			this.messageParser = new AgentMessageParser(agentManager, communicationHub);
			console.log('[ClaudeProvider] AgentMessageParser created successfully');
		} else {
			console.log('[ClaudeProvider] AgentMessageParser NOT created - missing dependencies:', {
				agentManager: !!agentManager,
				communicationHub: !!communicationHub
			});
		}
		const config = vscode.workspace.getConfiguration('multiAgentChat');
		if (config.get<boolean>('performance.enableStreaming', true)) {
			this.streamingProvider = new StreamingClaudeProvider(context, onStreamCallback);
		}

		// Initialize MCP WebSocket provider if MCP is enabled
		if (config.get<boolean>('mcp.enabled', true)) {
			const wsPort = config.get<number>('mcp.wsPort', 3030);
			const httpPort = config.get<number>('mcp.httpPort', 3031);
			this.mcpWebSocketProvider = new MCPWebSocketProvider(
				`ws://localhost:${wsPort}`,
				`http://localhost:${httpPort}/api`,
				context
			);
		}
	}

	async sendMessage(message: string, agentConfig: AgentConfig, context?: any): Promise<string> {
		const config = vscode.workspace.getConfiguration('multiAgentChat');

		// Check if we need inter-agent communication features
		const needsInterAgent = config.get<boolean>('agents.enableInterCommunication', true) && this.messageParser;

		// Try MCP WebSocket provider first if available and connected (but not for inter-agent communication)
		if (!needsInterAgent && this.mcpWebSocketProvider && config.get<boolean>('mcp.preferWebSocket', false)) {
			try {
				if (this.mcpWebSocketProvider.isConnected) {
					console.log(`[ClaudeProvider] Using MCP WebSocket for ${agentConfig.id}`);
					return await this.mcpWebSocketProvider.sendMessage(message, agentConfig, context);
				}
			} catch (error) {
				console.warn('[ClaudeProvider] MCP WebSocket failed, falling back:', error);
			}
		}

		// Log if we're skipping MCP for inter-agent communication
		if (needsInterAgent) {
			console.log(`[ClaudeProvider] Using direct Claude CLI for ${agentConfig.id} (inter-agent communication enabled)`);
		}

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

		// Add inter-agent communication instructions if enabled
		if (config.get<boolean>('agents.enableInterCommunication', true)) {
			roleContext += `INTER-AGENT COMMUNICATION:\n`;
			roleContext += `You can communicate with other specialist agents. USE EXACTLY THESE FORMATS:\n\n`;
			roleContext += `FORMAT 1 (Preferred): @agentname: your message\n`;
			roleContext += `Example: @coder: Can you implement this function?\n`;
			roleContext += `Example: @architect: What's the best design for this?\n\n`;
			roleContext += `FORMAT 2: [[agentname: your message]]\n`;
			roleContext += `Example: [[reviewer: Please review this code]]\n\n`;
			roleContext += `BROADCAST: @all: your message\n`;
			roleContext += `Example: @all: Team meeting needed on this issue\n\n`;
			roleContext += `IMPORTANT: The agent name MUST be lowercase and MUST be one of: architect, coder, executor, reviewer, documenter, coordinator\n`;
			roleContext += `DO NOT use titles or emojis, just the exact agent name followed by a colon.\n`;
			roleContext += `Messages are limited to ${config.get<number>('interAgentComm.maxMessagesPerConversation', 10)} per conversation.\n\n`;
		}

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

			claudeProcess.on('close', async (code) => {
				if (code === 0) {
					let result = output.trim();

					// Process inter-agent commands if message parser is available
					const interCommEnabled = config.get<boolean>('agents.enableInterCommunication', true);
					console.log(`[ClaudeProvider] Inter-agent communication enabled: ${interCommEnabled}, Parser available: ${!!this.messageParser}`);

					if (this.messageParser && interCommEnabled) {
						console.log(`[ClaudeProvider] Processing message for inter-agent commands from ${agentConfig.id}`);
						// Parse for inter-agent commands
						const commands = this.messageParser.parseMessage(agentConfig.id, result);

						if (commands.length > 0) {
							console.log(`[ClaudeProvider] Executing ${commands.length} inter-agent commands`);
							// Execute the commands
							const responses = await this.messageParser.executeCommands(
								agentConfig.id,
								commands,
								context
							);

							// Clean the original message of commands
							result = this.messageParser.cleanMessage(result);

							// Add inter-agent responses if configured to show them
							if (config.get<boolean>('agents.showInterCommunication', false)) {
								console.log('[ClaudeProvider] Showing inter-agent communication in UI');
								const formatted = this.messageParser.formatResponses(responses);
								if (formatted) {
									result += formatted;
								}
							}
						} else {
							console.log('[ClaudeProvider] No inter-agent commands found in message');
						}
					} else {
						console.log('[ClaudeProvider] Skipping inter-agent processing');
					}

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

	constructor(
		private claudeProvider: ClaudeProvider,
		private context?: vscode.ExtensionContext
	) {
		// MCP functionality removed - using direct Claude CLI
	}

	async sendMessage(message: string, agentConfig: AgentConfig, context?: any): Promise<string> {
		// Direct pass-through to Claude provider
		return this.claudeProvider.sendMessage(message, agentConfig, context);
	}
}

export class MultiProvider implements AIProvider {
	private optimizedProvider?: OptimizedMultiProvider;

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
		}
	}

	async sendMessage(message: string, agentConfig: AgentConfig, context?: any): Promise<string> {
		const config = vscode.workspace.getConfiguration('multiAgentChat');

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
		onStreamCallback?: (chunk: string, agentId: string) => void,
		mcpServerManager?: any
	) {
		// Pass agentManager and communicationHub to ClaudeProvider for inter-agent messaging
		this.claudeProvider = new ClaudeProvider(context, onStreamCallback, mcpServerManager, agentManager, communicationHub);
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