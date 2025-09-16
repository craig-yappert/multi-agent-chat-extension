import * as vscode from 'vscode';
import * as cp from 'child_process';
import { AgentConfig } from './agents';

export interface AIProvider {
	sendMessage(message: string, agentConfig: AgentConfig, context?: any): Promise<string>;
}

export class ClaudeProvider implements AIProvider {
	constructor(private context: vscode.ExtensionContext) {}

	async sendMessage(message: string, agentConfig: AgentConfig, context?: any): Promise<string> {
		const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
		const cwd = workspaceFolder ? workspaceFolder.uri.fsPath : process.cwd();

		// Get configuration
		const config = vscode.workspace.getConfiguration('claudeCodeChat');
		const thinkingIntensity = config.get<string>('thinking.intensity', 'think');

		// Add agent role context to message
		const roleContext = `You are ${agentConfig.name}, a ${agentConfig.role}. ${agentConfig.description}\n\nYour capabilities: ${agentConfig.capabilities.join(', ')}\nYour specializations: ${agentConfig.specializations.join(', ')}\n\nUser message: ${message}`;

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
					resolve(output.trim());
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
	async sendMessage(message: string, agentConfig: AgentConfig, context?: any): Promise<string> {
		// TODO: Implement OpenAI API integration
		// For now, return a placeholder response
		const roleContext = `${agentConfig.icon} **${agentConfig.name} Response:**\n\nAs your ${agentConfig.role}, I'll help with: "${message}"\n\n*Note: OpenAI integration coming soon! For now, this is a mock response.*`;
		return roleContext;
	}
}

export class MCPProvider implements AIProvider {
	async sendMessage(message: string, agentConfig: AgentConfig, context?: any): Promise<string> {
		// TODO: Implement MCP integration for executor agent
		// For now, return a placeholder response
		const roleContext = `${agentConfig.icon} **${agentConfig.name} Response:**\n\nReady to execute: "${message}"\n\n*Note: MCP integration coming soon! For now, this is a mock response.*`;
		return roleContext;
	}
}

export class MultiProvider implements AIProvider {
	constructor(
		private claudeProvider: ClaudeProvider,
		private openaiProvider: OpenAIProvider,
		private mcpProvider: MCPProvider
	) {}

	async sendMessage(message: string, agentConfig: AgentConfig, context?: any): Promise<string> {
		// For team agent, coordinate with multiple providers
		const responses = await Promise.all([
			this.claudeProvider.sendMessage(`Architect perspective: ${message}`, agentConfig, context),
			this.claudeProvider.sendMessage(`Coder perspective: ${message}`, agentConfig, context)
		]);

		return `${agentConfig.icon} **${agentConfig.name} Response:**\n\nCoordinating team response for: "${message}"\n\n${responses.join('\n\n')}\n\n*Note: Full multi-agent orchestration coming soon!*`;
	}
}

export class ProviderManager {
	private claudeProvider: ClaudeProvider;
	private openaiProvider: OpenAIProvider;
	private mcpProvider: MCPProvider;
	private multiProvider: MultiProvider;

	constructor(context: vscode.ExtensionContext) {
		this.claudeProvider = new ClaudeProvider(context);
		this.openaiProvider = new OpenAIProvider();
		this.mcpProvider = new MCPProvider();
		this.multiProvider = new MultiProvider(this.claudeProvider, this.openaiProvider, this.mcpProvider);
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