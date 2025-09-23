import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

/**
 * MCP Server Manager - Manages the lifecycle of the MCP server process
 */
export class MCPServerManager {
	private serverProcess?: cp.ChildProcess;
	private statusBarItem: vscode.StatusBarItem;
	private outputChannel: vscode.OutputChannel;
	private isRunning: boolean = false;
	private autoStart: boolean;
	private serverPath: string;

	constructor(private context: vscode.ExtensionContext) {
		this.outputChannel = vscode.window.createOutputChannel('MCP Server');

		// Create status bar item
		this.statusBarItem = vscode.window.createStatusBarItem(
			vscode.StatusBarAlignment.Right,
			99
		);
		this.statusBarItem.command = 'multiAgentChat.toggleMCPServer';
		this.updateStatusBar();
		this.statusBarItem.show();

		// Get configuration
		const config = vscode.workspace.getConfiguration('multiAgentChat');
		this.autoStart = config.get<boolean>('mcp.autoStart', true);

		// Server path
		this.serverPath = path.join(context.extensionPath, 'out', 'mcp-server', 'server.js');

		// Register commands
		this.registerCommands();

		// Auto-start if configured (but skip if dependencies missing)
		if (this.autoStart) {
			// Check if dependencies are available
			let depsAvailable = false;
			try {
				require('ws');
				require('express');
				depsAvailable = true;
			} catch (e) {
				console.log('[MCPServerManager] Dependencies not available, skipping auto-start');
			}

			if (depsAvailable) {
				// Delay startup slightly to ensure extension is fully loaded
				setTimeout(() => {
					this.startServer().catch(err => {
						console.error('[MCPServerManager] Failed to auto-start server:', err);
					});
				}, 1000);
			}
		}
	}

	/**
	 * Register VS Code commands
	 */
	private registerCommands(): void {
		// Toggle server command
		const toggleCmd = vscode.commands.registerCommand(
			'multiAgentChat.toggleMCPServer',
			() => this.toggleServer()
		);

		// Start server command
		const startCmd = vscode.commands.registerCommand(
			'multiAgentChat.startMCPServer',
			() => this.startServer()
		);

		// Stop server command
		const stopCmd = vscode.commands.registerCommand(
			'multiAgentChat.stopMCPServer',
			() => this.stopServer()
		);

		// Restart server command
		const restartCmd = vscode.commands.registerCommand(
			'multiAgentChat.restartMCPServer',
			() => this.restartServer()
		);

		// Show server logs command
		const logsCmd = vscode.commands.registerCommand(
			'multiAgentChat.showMCPServerLogs',
			() => this.outputChannel.show()
		);

		this.context.subscriptions.push(
			toggleCmd,
			startCmd,
			stopCmd,
			restartCmd,
			logsCmd,
			this.statusBarItem
		);
	}

	/**
	 * Start the MCP server
	 */
	async startServer(): Promise<boolean> {
		if (this.isRunning) {
			this.log('Server is already running');
			return true;
		}

		try {
			this.log('Starting MCP server...');

			// Check if server file exists
			if (!fs.existsSync(this.serverPath)) {
				// Try to compile it first
				this.log('Server not found, attempting to compile...');
				await this.compileServer();
			}

			// Get configuration
			const config = vscode.workspace.getConfiguration('multiAgentChat');
			const wsPort = config.get<number>('mcp.wsPort', 3030);
			const httpPort = config.get<number>('mcp.httpPort', 3031);

			// Get configuration for real Claude mode
			const useRealClaude = config.get<boolean>('mcp.useRealClaude', true);

			// Start server process
			try {
				this.serverProcess = cp.spawn('node', [this.serverPath], {
					cwd: this.context.extensionPath,
					env: {
						...process.env,
						NODE_ENV: 'production',
						WS_PORT: wsPort.toString(),
						HTTP_PORT: httpPort.toString(),
						USE_REAL_CLAUDE: useRealClaude ? 'true' : 'false'
					}
				});
			} catch (spawnError) {
				this.log('[ERROR] Failed to spawn server process: ' + spawnError);
				this.isRunning = false;
				this.updateStatusBar();
				return false;
			}

			// Handle stdout
			this.serverProcess.stdout?.on('data', (data) => {
				this.log(data.toString().trim());
			});

			// Handle stderr
			this.serverProcess.stderr?.on('data', (data) => {
				this.log(`ERROR: ${data.toString().trim()}`, 'error');
			});

			// Handle process exit
			this.serverProcess.on('exit', (code) => {
				this.log(`Server exited with code ${code}`);
				this.isRunning = false;
				this.updateStatusBar();

				// Auto-restart if it crashed
				if (code !== 0 && this.autoStart) {
					this.log('Server crashed, restarting in 5 seconds...');
					setTimeout(() => this.startServer(), 5000);
				}
			});

			// Handle process error
			this.serverProcess.on('error', (error) => {
				this.log(`Failed to start server: ${error.message}`, 'error');
				this.isRunning = false;
				this.updateStatusBar();
			});

			// Wait a bit to ensure it started
			await new Promise(resolve => setTimeout(resolve, 2000));

			// Check if server is responding
			const isHealthy = await this.checkServerHealth();

			if (isHealthy) {
				this.isRunning = true;
				this.updateStatusBar();
				this.log('MCP server started successfully');
				vscode.window.showInformationMessage('MCP server started successfully');
				return true;
			} else {
				this.log('Server started but health check failed', 'warn');
				return false;
			}

		} catch (error: any) {
			this.log(`Failed to start server: ${error.message}`, 'error');
			vscode.window.showErrorMessage(`Failed to start MCP server: ${error.message}`);
			return false;
		}
	}

	/**
	 * Stop the MCP server
	 */
	stopServer(): void {
		if (!this.isRunning || !this.serverProcess) {
			this.log('Server is not running');
			return;
		}

		this.log('Stopping MCP server...');

		// Kill the process
		this.serverProcess.kill('SIGTERM');

		// Force kill after 5 seconds if still running
		setTimeout(() => {
			if (this.serverProcess && !this.serverProcess.killed) {
				this.serverProcess.kill('SIGKILL');
			}
		}, 5000);

		this.isRunning = false;
		this.updateStatusBar();

		vscode.window.showInformationMessage('MCP server stopped');
	}

	/**
	 * Restart the MCP server
	 */
	async restartServer(): Promise<void> {
		this.log('Restarting MCP server...');
		this.stopServer();
		await new Promise(resolve => setTimeout(resolve, 1000));
		await this.startServer();
	}

	/**
	 * Toggle server on/off
	 */
	toggleServer(): void {
		if (this.isRunning) {
			this.stopServer();
		} else {
			this.startServer();
		}
	}

	/**
	 * Check if server is healthy
	 */
	private async checkServerHealth(): Promise<boolean> {
		try {
			const config = vscode.workspace.getConfiguration('multiAgentChat');
			const httpPort = config.get<number>('mcp.httpPort', 3031);

			const response = await fetch(`http://localhost:${httpPort}/api/health`, {
				method: 'GET',
				signal: AbortSignal.timeout(3000)
			});

			return response.ok;
		} catch {
			return false;
		}
	}

	/**
	 * Compile TypeScript server to JavaScript
	 */
	private async compileServer(): Promise<void> {
		this.log('Compiling MCP server TypeScript...');

		return new Promise((resolve, reject) => {
			const tscProcess = cp.exec(
				'npx tsc src/mcp-server/server.ts --outDir out --module commonjs --target es2020',
				{ cwd: this.context.extensionPath },
				(error, stdout, stderr) => {
					if (error) {
						this.log(`Compilation failed: ${error.message}`, 'error');
						reject(error);
					} else {
						this.log('Server compiled successfully');
						resolve();
					}
				}
			);

			tscProcess.stdout?.on('data', (data) => this.log(data.toString()));
			tscProcess.stderr?.on('data', (data) => this.log(data.toString(), 'error'));
		});
	}

	/**
	 * Update status bar item
	 */
	private updateStatusBar(): void {
		if (this.isRunning) {
			this.statusBarItem.text = '$(vm-active) MCP Server';
			this.statusBarItem.tooltip = 'MCP Server is running (click to stop)';
			this.statusBarItem.backgroundColor = undefined;
		} else {
			this.statusBarItem.text = '$(vm-outline) MCP Server';
			this.statusBarItem.tooltip = 'MCP Server is stopped (click to start)';
			this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
		}
	}

	/**
	 * Log message to output channel
	 */
	private log(message: string, level: 'info' | 'warn' | 'error' = 'info'): void {
		const timestamp = new Date().toISOString();
		const prefix = level === 'error' ? '[ERROR]' : level === 'warn' ? '[WARN]' : '[INFO]';
		const logMessage = `${timestamp} ${prefix} ${message}`;

		this.outputChannel.appendLine(logMessage);

		// Also log to console for debugging
		if (level === 'error') {
			console.error(logMessage);
		} else {
			console.log(logMessage);
		}
	}

	/**
	 * Get server status
	 */
	getStatus(): { running: boolean; healthy?: boolean } {
		return {
			running: this.isRunning,
			healthy: this.isRunning ? undefined : false
		};
	}

	/**
	 * Dispose of resources
	 */
	dispose(): void {
		this.stopServer();
		this.statusBarItem.dispose();
		this.outputChannel.dispose();
	}
}