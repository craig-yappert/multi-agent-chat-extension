import * as vscode from 'vscode';
import WebSocket from 'ws';

/**
 * MCP Server Validator - Comprehensive testing and validation tools
 */
export class MCPServerValidator {
	private outputChannel: vscode.OutputChannel;

	constructor() {
		this.outputChannel = vscode.window.createOutputChannel('MCP Server Validator');
	}

	/**
	 * Run full validation suite
	 */
	async runFullValidation(): Promise<void> {
		this.outputChannel.show();
		this.outputChannel.clear();
		this.log('='.repeat(50));
		this.log('MCP Server Validation Suite');
		this.log('='.repeat(50));

		const results = {
			httpHealth: false,
			websocket: false,
			agentResponse: false,
			performance: 0
		};

		// 1. Check HTTP health endpoint
		this.log('\n1. Checking HTTP health endpoint...');
		results.httpHealth = await this.validateHTTPHealth();

		// 2. Check WebSocket connection
		this.log('\n2. Checking WebSocket connection...');
		results.websocket = await this.validateWebSocket();

		// 3. Test agent response
		this.log('\n3. Testing agent response...');
		results.agentResponse = await this.validateAgentResponse();

		// 4. Performance test
		this.log('\n4. Running performance test...');
		results.performance = await this.validatePerformance();

		// Summary
		this.log('\n' + '='.repeat(50));
		this.log('VALIDATION SUMMARY');
		this.log('='.repeat(50));
		this.log(`HTTP Health: ${results.httpHealth ? '✅ PASS' : '❌ FAIL'}`);
		this.log(`WebSocket: ${results.websocket ? '✅ PASS' : '❌ FAIL'}`);
		this.log(`Agent Response: ${results.agentResponse ? '✅ PASS' : '❌ FAIL'}`);
		this.log(`Performance: ${results.performance > 0 ? `✅ ${results.performance}ms avg` : '❌ FAIL'}`);

		const allPassed = results.httpHealth && results.websocket && results.agentResponse && results.performance > 0;

		if (allPassed) {
			this.log('\n🎉 All validation tests PASSED!');
			vscode.window.showInformationMessage('MCP Server validation successful! All tests passed.');
		} else {
			this.log('\n❌ Some validation tests FAILED. Check output for details.');
			vscode.window.showWarningMessage('MCP Server validation failed. Check "MCP Server Validator" output.');
		}
	}

	/**
	 * Validate HTTP health endpoint
	 */
	async validateHTTPHealth(): Promise<boolean> {
		const config = vscode.workspace.getConfiguration('claudeCodeChat');
		const httpPort = config.get<number>('mcp.httpPort', 3001);
		const url = `http://localhost:${httpPort}/api/health`;

		try {
			this.log(`  Fetching: ${url}`);

			const response = await fetch(url, {
				method: 'GET',
				signal: AbortSignal.timeout(3000)
			});

			if (response.ok) {
				const data = await response.json();
				this.log(`  ✅ HTTP health check passed: ${JSON.stringify(data)}`);
				return true;
			} else {
				this.log(`  ❌ HTTP health check failed: Status ${response.status}`);
				return false;
			}
		} catch (error: any) {
			this.log(`  ❌ HTTP health check error: ${error.message}`);
			this.log(`  Is the MCP server running on port ${httpPort}?`);
			return false;
		}
	}

	/**
	 * Validate WebSocket connection
	 */
	async validateWebSocket(): Promise<boolean> {
		const config = vscode.workspace.getConfiguration('claudeCodeChat');
		const wsPort = config.get<number>('mcp.wsPort', 3000);
		const wsUrl = `ws://localhost:${wsPort}`;

		return new Promise((resolve) => {
			try {
				this.log(`  Connecting to: ${wsUrl}`);
				const ws = new WebSocket(wsUrl);

				const timeout = setTimeout(() => {
					this.log('  ❌ WebSocket connection timeout');
					ws.close();
					resolve(false);
				}, 5000);

				ws.on('open', () => {
					this.log('  ✅ WebSocket connected successfully');
					clearTimeout(timeout);

					// Send test heartbeat
					ws.send(JSON.stringify({ type: 'heartbeat' }));
				});

				ws.on('message', (data: WebSocket.Data) => {
					const message = JSON.parse(data.toString());
					this.log(`  ✅ Received message: ${JSON.stringify(message)}`);

					if (message.type === 'connected' || message.type === 'heartbeat') {
						ws.close();
						resolve(true);
					}
				});

				ws.on('error', (error: any) => {
					this.log(`  ❌ WebSocket error: ${error.message}`);
					clearTimeout(timeout);
					resolve(false);
				});

			} catch (error: any) {
				this.log(`  ❌ WebSocket connection failed: ${error.message}`);
				resolve(false);
			}
		});
	}

	/**
	 * Validate agent response
	 */
	async validateAgentResponse(): Promise<boolean> {
		const config = vscode.workspace.getConfiguration('claudeCodeChat');
		const wsPort = config.get<number>('mcp.wsPort', 3000);
		const wsUrl = `ws://localhost:${wsPort}`;

		return new Promise((resolve) => {
			try {
				this.log(`  Testing agent response via WebSocket...`);
				const ws = new WebSocket(wsUrl);
				const messageId = `test_${Date.now()}`;
				let responseReceived = false;

				const timeout = setTimeout(() => {
					if (!responseReceived) {
						this.log('  ❌ Agent response timeout');
						ws.close();
						resolve(false);
					}
				}, 10000);

				ws.on('open', () => {
					const testMessage = {
						id: messageId,
						type: 'agent_request',
						agent: 'coder',
						role: 'Implementation',
						message: 'Test message - please respond',
						timestamp: Date.now()
					};

					this.log(`  Sending test message: ${JSON.stringify(testMessage)}`);
					ws.send(JSON.stringify(testMessage));
				});

				ws.on('message', (data: WebSocket.Data) => {
					const message = JSON.parse(data.toString());

					if (message.type === 'response' && message.id === messageId) {
						responseReceived = true;
						clearTimeout(timeout);
						this.log(`  ✅ Agent response received in ${message.duration}ms`);
						this.log(`  Response: ${message.content?.substring(0, 100)}...`);
						ws.close();
						resolve(true);
					}
				});

				ws.on('error', (error: any) => {
					this.log(`  ❌ WebSocket error: ${error.message}`);
					clearTimeout(timeout);
					resolve(false);
				});

			} catch (error: any) {
				this.log(`  ❌ Agent test failed: ${error.message}`);
				resolve(false);
			}
		});
	}

	/**
	 * Validate performance
	 */
	async validatePerformance(): Promise<number> {
		const config = vscode.workspace.getConfiguration('claudeCodeChat');
		const httpPort = config.get<number>('mcp.httpPort', 3001);
		const url = `http://localhost:${httpPort}/api/chat`;

		const times: number[] = [];
		const testCount = 3;

		this.log(`  Running ${testCount} performance tests...`);

		for (let i = 0; i < testCount; i++) {
			const startTime = Date.now();

			try {
				const response = await fetch(url, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						agent: 'coder',
						message: `Performance test ${i + 1}`,
						role: 'Test'
					}),
					signal: AbortSignal.timeout(5000)
				});

				if (response.ok) {
					const data = await response.json();
					const duration = Date.now() - startTime;
					times.push(duration);
					this.log(`  Test ${i + 1}: ${duration}ms`);
				} else {
					this.log(`  Test ${i + 1}: Failed with status ${response.status}`);
				}
			} catch (error: any) {
				this.log(`  Test ${i + 1}: Error - ${error.message}`);
			}
		}

		if (times.length > 0) {
			const avgTime = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
			this.log(`  ✅ Average response time: ${avgTime}ms`);

			if (avgTime < 1000) {
				this.log(`  🚀 Excellent performance! (< 1 second)`);
			} else if (avgTime < 3000) {
				this.log(`  ✅ Good performance (1-3 seconds)`);
			} else {
				this.log(`  ⚠️ Slow performance (> 3 seconds)`);
			}

			return avgTime;
		} else {
			this.log(`  ❌ All performance tests failed`);
			return 0;
		}
	}

	/**
	 * Quick status check
	 */
	async quickCheck(): Promise<{
		httpAlive: boolean;
		wsAlive: boolean;
		responseTime?: number;
	}> {
		const config = vscode.workspace.getConfiguration('claudeCodeChat');
		const httpPort = config.get<number>('mcp.httpPort', 3001);
		const wsPort = config.get<number>('mcp.wsPort', 3000);

		// HTTP check
		let httpAlive = false;
		try {
			const response = await fetch(`http://localhost:${httpPort}/api/health`, {
				signal: AbortSignal.timeout(1000)
			});
			httpAlive = response.ok;
		} catch {}

		// WebSocket check
		let wsAlive = false;
		let responseTime: number | undefined;

		await new Promise<void>((resolve) => {
			try {
				const ws = new WebSocket(`ws://localhost:${wsPort}`);
				const startTime = Date.now();

				const timeout = setTimeout(() => {
					ws.close();
					resolve();
				}, 1000);

				ws.on('open', () => {
					wsAlive = true;
					responseTime = Date.now() - startTime;
					clearTimeout(timeout);
					ws.close();
					resolve();
				});

				ws.on('error', () => {
					clearTimeout(timeout);
					resolve();
				});
			} catch {
				resolve();
			}
		});

		return { httpAlive, wsAlive, responseTime };
	}

	private log(message: string): void {
		this.outputChannel.appendLine(message);
		console.log(`[MCP Validator] ${message}`);
	}
}

/**
 * VS Code Commands for validation
 */
export function registerValidationCommands(context: vscode.ExtensionContext): void {
	const validator = new MCPServerValidator();

	// Full validation command
	const validateCmd = vscode.commands.registerCommand(
		'multi-agent-chat.validateMCPServer',
		async () => {
			await validator.runFullValidation();
		}
	);

	// Quick status command
	const statusCmd = vscode.commands.registerCommand(
		'multi-agent-chat.mcpServerStatus',
		async () => {
			const status = await validator.quickCheck();

			let message = 'MCP Server Status:\n';
			message += `• HTTP API: ${status.httpAlive ? '✅ Online' : '❌ Offline'}\n`;
			message += `• WebSocket: ${status.wsAlive ? '✅ Online' : '❌ Offline'}`;

			if (status.responseTime) {
				message += ` (${status.responseTime}ms)`;
			}

			vscode.window.showInformationMessage(message);
		}
	);

	context.subscriptions.push(validateCmd, statusCmd);
}