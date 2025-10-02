import * as vscode from 'vscode';
import * as cp from 'child_process';
import { AgentConfig } from './agents';
import { AgentCommunicationHub } from './agentCommunication';
import { StreamingClaudeProvider, OptimizedMultiProvider, ResponseCache } from './performanceOptimizer';
import { AgentMessageParser } from './agentMessageParser';
import { ProviderRegistry } from './providers/ProviderRegistry';
import { VSCodeLMProvider } from './providers/VSCodeLMProvider';
import { OpenAIHttpProvider } from './providers/OpenAIHttpProvider';
import { GoogleHttpProvider } from './providers/GoogleHttpProvider';

export interface AIProvider {
	sendMessage(message: string, agentConfig: AgentConfig, context?: any): Promise<string>;
}

export class ClaudeProvider implements AIProvider {
	private streamingProvider?: StreamingClaudeProvider;
	private cache: ResponseCache = new ResponseCache();
	private messageParser?: AgentMessageParser;
	private communicationHub?: AgentCommunicationHub;
	private agentManager?: any;
	private activeProcesses: Set<cp.ChildProcess> = new Set();
	private configRegistry?: any; // ConfigurationRegistry for model awareness

	constructor(
		private context: vscode.ExtensionContext,
		onStreamCallback?: (chunk: string, agentId: string) => void,
		agentManager?: any,
		communicationHub?: AgentCommunicationHub,
		configRegistry?: any
	) {
		this.agentManager = agentManager;
		this.communicationHub = communicationHub;
		this.configRegistry = configRegistry;
		if (agentManager && communicationHub) {
			this.messageParser = new AgentMessageParser(agentManager, communicationHub);
			console.log('[ClaudeProvider] AgentMessageParser created successfully');
			console.log('[ClaudeProvider] Available agents:', agentManager.getAllAgents().map((a: any) => a.id));
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
	}

	async sendMessage(message: string, agentConfig: AgentConfig, context?: any): Promise<string> {
		const config = vscode.workspace.getConfiguration('multiAgentChat');

		// Check if we need inter-agent communication features
		const needsInterAgent = config.get<boolean>('agents.enableInterCommunication', true) && this.messageParser;

		// Log if we're using inter-agent communication
		if (needsInterAgent) {
			console.log(`[ClaudeProvider] Using direct Claude CLI for ${agentConfig.id} (inter-agent communication enabled)`);
		}

		// Use streaming provider if available and enabled (but not when we need inter-agent parsing)
		// Inter-agent communication requires the full response before parsing
		const interCommEnabled = config.get<boolean>('agents.enableInterCommunication', true);
		const canUseStreaming = !interCommEnabled || !this.messageParser;

		if (this.streamingProvider && config.get<boolean>('performance.enableStreaming', true) && canUseStreaming) {
			console.log(`[ClaudeProvider] Using streaming for ${agentConfig.id} (inter-agent disabled or no parser)`);
			return this.streamingProvider.sendMessageStreaming(message, agentConfig, context);
		} else if (!canUseStreaming) {
			console.log(`[ClaudeProvider] Skipping streaming for ${agentConfig.id} to enable inter-agent parsing`);
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
		let roleContext = `CRITICAL INSTRUCTIONS:
1. ALWAYS follow the user's direct request, even if it seems outside your specialty
2. If asked to do something unusual (like tell a joke), DO IT first, then you can add your perspective
3. Stay focused on what the user asked - don't redirect to your specialty unless relevant
4. 🛑 EMERGENCY STOP: If you see "🛑 EMERGENCY STOP" in the conversation, IMMEDIATELY respond with ONLY "Acknowledged. Stopping all operations." and DO NOT perform any actions, code execution, or @mentions.

You are ${agentConfig.name}, a ${agentConfig.role}. ${agentConfig.description}\n\nYour capabilities: ${agentConfig.capabilities.join(', ')}\nYour specializations: ${agentConfig.specializations.join(', ')}\n`;

		// Enhanced model awareness with display name
		if (agentConfig.model && this.configRegistry) {
			try {
				const modelDef = this.configRegistry.getModelById(agentConfig.model);
				if (modelDef) {
					roleContext += `You are currently using ${modelDef.displayName} (model: ${modelDef.id}).\n`;
					if (modelDef.description) {
						roleContext += `Model description: ${modelDef.description}\n`;
					}
				} else {
					// Fallback if model not found in registry
					roleContext += `You are currently using the ${agentConfig.model} model.\n`;
				}
			} catch (error) {
				// Fallback to simple model name if registry lookup fails
				roleContext += `You are currently using the ${agentConfig.model} model.\n`;
			}
		} else if (agentConfig.model) {
			// Fallback when no registry available
			roleContext += `You are currently using the ${agentConfig.model} model.\n`;
		}
		roleContext += `\n`;

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
			roleContext += `CONTEXT TIP: When relaying a user request to another agent, mention it's from the user, e.g., "@architect: The user asked me to ask you to tell a joke"\n`;
			roleContext += `\n⚠️ CONVERSATION LIMITS (to prevent token consumption during testing):\n`;
			roleContext += `- Max ${config.get<number>('interAgentComm.maxMessagesPerConversation', 5)} messages per conversation\n`;
			roleContext += `- Max ${config.get<number>('interAgentComm.maxConversationDepth', 3)} conversation depth\n`;
			roleContext += `- Only originally contacted agents can participate (no sprawl allowed)\n`;
			roleContext += `- BE CONCISE to stay within limits\n`;
			roleContext += `- DO NOT respond back to acknowledgments (e.g., if an agent says "confirmed", "acknowledged", "received" - DON'T reply)\n`;
			roleContext += `- For comms checks: Just acknowledge ONCE, don't create response chains\n\n`;
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

			// Track the process
			this.activeProcesses.add(claudeProcess);

			claudeProcess.on('close', async (code) => {
				// Remove from active processes
				this.activeProcesses.delete(claudeProcess);
				if (code === 0) {
					let result = output.trim();

					// Process inter-agent commands if message parser is available
					// Parse all responses for @mentions (loop prevention handled by AgentCommunicationHub)
					const interCommEnabled = config.get<boolean>('agents.enableInterCommunication', true);
					console.log(`[ClaudeProvider] Inter-agent communication enabled: ${interCommEnabled}, Parser available: ${!!this.messageParser}`);

					if (this.messageParser && interCommEnabled) {
						console.log(`\n[Inter-Agent Parse] Processing ${agentConfig.id}'s response for @ mentions`);
						console.log(`[Inter-Agent Parse] Response length: ${result.length} chars`);
						// Parse for inter-agent commands
						const commands = this.messageParser.parseMessage(agentConfig.id, result);

						if (commands.length > 0) {
							console.log(`\n[Inter-Agent Execute] Found ${commands.length} inter-agent commands to execute`);
							commands.forEach((cmd, i) => {
								console.log(`[Inter-Agent Execute] Command ${i+1}: ${cmd.type} to ${cmd.targetAgent || 'all'}: "${cmd.message.substring(0, 50)}..."`);
							});

							// Clean the original message first to show initial text
							const originalLength = result.length;
							result = this.messageParser.cleanMessage(result);
							console.log(`[Inter-Agent Clean] Cleaned message: ${originalLength} -> ${result.length} chars`);

							// Show the cleaned message immediately via callback BEFORE executing commands
							if (context?.onPartialResponse) {
								if (result.trim()) {
									console.log('[Inter-Agent Display] Showing initial agent text before executing commands');
									context.onPartialResponse(result.trim());
									result = ''; // Clear so we don't send it again at the end
								} else {
									// If cleaned message is empty, the agent only sent inter-agent commands
									// Show a system message so user knows what's happening
									console.log('[Inter-Agent Display] Agent response was only commands, showing system message');
									const targetAgents = commands.map(cmd => cmd.targetAgent || 'all').join(', ');
									context.onPartialResponse(`*Broadcasting to agents: ${targetAgents}...*`);
									result = ''; // Clear so we don't send it again at the end
								}
							}

							// Now execute the commands (inter-agent messages will appear after initial text)
							const enrichedContext = {
								...context,
								userRequest: context?.userRequest || message  // Ensure user request is in context
							};
							const responses = await this.messageParser.executeCommands(
								agentConfig.id,
								commands,
								enrichedContext
							);
							console.log(`[Inter-Agent Execute] Execution completed, ${responses.size} responses received`);

							// Add inter-agent responses if configured to show them
							if (config.get<boolean>('agents.showInterCommunication', false)) {
								console.log('[ClaudeProvider] Showing inter-agent communication in UI');
								const formatted = this.messageParser.formatResponses(responses);
								if (formatted) {
									result = formatted; // This will be the summary
								}
							}
						} else {
							console.log('[Inter-Agent Parse] No @ mentions or inter-agent commands found');
						}
					} else {
						if (!this.messageParser) {
							console.log('[Inter-Agent Skip] No message parser available');
						}
						if (!interCommEnabled) {
							console.log('[Inter-Agent Skip] Inter-agent communication disabled in settings');
						}
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

	killAllProcesses(): void {
		console.log(`[ClaudeProvider] Killing ${this.activeProcesses.size} active processes...`);
		this.activeProcesses.forEach(process => {
			try {
				process.kill('SIGKILL');
			} catch (error) {
				console.error('[ClaudeProvider] Error killing process:', error);
			}
		});
		this.activeProcesses.clear();
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

export class MultiProvider implements AIProvider {
	private optimizedProvider?: OptimizedMultiProvider;

	constructor(
		private claudeProvider: ClaudeProvider,
		private openaiProvider: OpenAIProvider,
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

					// Display individual agent response if communication hub available
					if (this.communicationHub) {
						this.communicationHub.displayTeamResponse(
							agent.id,
							`**${agent.name}:** ${response}`
						);
					}

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
	private multiProvider: MultiProvider;
	private communicationHub?: AgentCommunicationHub;

	// New provider system
	private registry?: ProviderRegistry;
	private vscodeLMProvider?: VSCodeLMProvider;
	private httpProviders: Map<string, AIProvider> = new Map();
	private context: vscode.ExtensionContext;
	private configRegistry?: any; // ConfigurationRegistry for model awareness

	constructor(
		context: vscode.ExtensionContext,
		agentManager?: any,
		communicationHub?: AgentCommunicationHub,
		onStreamCallback?: (chunk: string, agentId: string) => void,
		configRegistry?: any
	) {
		this.context = context;
		this.configRegistry = configRegistry;

		// Keep legacy providers for backward compatibility
		this.claudeProvider = new ClaudeProvider(context, onStreamCallback, agentManager, communicationHub, configRegistry);
		this.openaiProvider = new OpenAIProvider(this.claudeProvider);
		this.communicationHub = communicationHub;
		this.multiProvider = new MultiProvider(
			this.claudeProvider,
			this.openaiProvider,
			agentManager,
			communicationHub,
			context,
			onStreamCallback
		);

		// Initialize new provider system
		this.initializeProviderRegistry(context);
	}

	/**
	 * Initialize the new provider registry system
	 */
	private async initializeProviderRegistry(context: vscode.ExtensionContext): Promise<void> {
		try {
			this.registry = ProviderRegistry.getInstance(context.extensionPath);
			await this.registry.loadProviders();

			// Initialize VS Code LM provider
			this.vscodeLMProvider = new VSCodeLMProvider(context);

			console.log('[ProviderManager] New provider system initialized');
		} catch (error) {
			console.error('[ProviderManager] Failed to initialize provider registry:', error);
		}
	}

	/**
	 * Get appropriate provider based on providerPreference setting
	 */
	async getProvider(agentConfig: AgentConfig): Promise<AIProvider> {
		const config = vscode.workspace.getConfiguration('multiAgentChat');
		const preference = config.get<string>('providerPreference', 'claude-cli');

		console.log(`[ProviderManager] Provider preference: ${preference}, Agent: ${agentConfig.id}, Model: ${agentConfig.model}`);

		// If registry not available, use legacy behavior
		if (!this.registry) {
			console.log('[ProviderManager] Registry not available, using legacy provider selection');
			return this.getLegacyProvider(agentConfig);
		}

		// Try to select provider based on preference and model
		const modelId = agentConfig.model || 'default';
		const selection = await this.registry.selectProvider(modelId, preference);

		if (!selection) {
			console.log('[ProviderManager] No provider selected by registry, falling back to legacy');
			return this.getLegacyProvider(agentConfig);
		}

		console.log(`[ProviderManager] Selected provider: ${selection.providerId}`);

		// Return appropriate provider based on selection
		switch (selection.providerId) {
			case 'claude-cli':
				return this.claudeProvider;

			case 'vscode-lm':
				if (!this.vscodeLMProvider) {
					this.vscodeLMProvider = new VSCodeLMProvider(this.context);
				}
				return this.vscodeLMProvider;

			case 'openai':
			case 'xai':
				return this.getHttpProvider(selection.providerId, selection.config);

			case 'google':
				return this.getHttpProvider(selection.providerId, selection.config);

			case 'multi':
				return this.multiProvider;

			default:
				console.log(`[ProviderManager] Unknown provider ${selection.providerId}, using legacy`);
				return this.getLegacyProvider(agentConfig);
		}
	}

	/**
	 * Get or create HTTP provider instance
	 */
	private getHttpProvider(providerId: string, config: any): AIProvider {
		if (!this.httpProviders.has(providerId)) {
			// Create appropriate HTTP provider based on vendor
			let provider: AIProvider;

			if (config.vendor === 'google') {
				provider = new GoogleHttpProvider(config, this.context);
			} else {
				// OpenAI, xAI, and other OpenAI-compatible providers
				provider = new OpenAIHttpProvider(config, this.context);
			}

			this.httpProviders.set(providerId, provider);
		}

		return this.httpProviders.get(providerId)!;
	}

	/**
	 * Legacy provider selection for backward compatibility
	 */
	private getLegacyProvider(agentConfig: AgentConfig): AIProvider {
		switch (agentConfig.provider) {
			case 'claude':
				return this.claudeProvider;
			case 'openai':
				return this.openaiProvider;
			case 'multi':
				return this.multiProvider;
			default:
				return this.claudeProvider; // fallback
		}
	}

	killAllActiveProcesses(): void {
		console.log('[ProviderManager] Killing all active processes...');
		this.claudeProvider.killAllProcesses();
		// Add other providers if they have similar methods
	}
}