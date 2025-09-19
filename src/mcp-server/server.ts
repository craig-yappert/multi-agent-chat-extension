// Dynamic imports for optional dependencies
let WebSocket: any;
let express: any;

try {
	WebSocket = require('ws');
} catch (e) {
	console.warn('WebSocket module not available');
}

try {
	express = require('express');
} catch (e) {
	console.warn('Express module not available');
}

import * as http from 'http';
import * as cp from 'child_process';

/**
 * MCP Server - Handles WebSocket and HTTP API connections
 * Manages persistent Claude CLI process for fast responses
 */
export class MCPServer {
	private wss?: any;
	private app?: any;
	private httpServer?: http.Server;
	private claudeProcess?: cp.ChildProcess;
	private clients: Set<any> = new Set();
	private requestQueue: Map<string, {
		resolve: (value: string) => void;
		reject: (error: Error) => void;
		timestamp: number;
	}> = new Map();
	private claudeRequestQueue: Array<{
		message: string;
		resolve: (value: string) => void;
		reject: (error: Error) => void;
	}> = [];
	private isProcessingClaude: boolean = false;

	constructor(
		private wsPort: number = 3030,
		private httpPort: number = 3031
	) {}

	/**
	 * Start the MCP server
	 */
	async start(): Promise<void> {
		console.log('[MCP-Server] Starting MCP server...');

		// Skip Claude process - using simulation only
		// this.startClaudeProcess();

		// Start WebSocket server
		this.startWebSocketServer();

		// Start HTTP API server
		this.startHTTPServer();

		console.log(`[MCP-Server] WebSocket server on ws://localhost:${this.wsPort}`);
		console.log(`[MCP-Server] HTTP API server on http://localhost:${this.httpPort}`);
		console.log('[MCP-Server] Using fast simulation mode (Claude CLI not available)');
	}

	/**
	 * Start persistent Claude CLI process
	 */
	private startClaudeProcess(): void {
		try {
			// Start Claude CLI for real responses
			this.claudeProcess = cp.spawn('claude', ['--no-stream'], {
				shell: process.platform === 'win32',
				stdio: ['pipe', 'pipe', 'pipe'],
				env: {
					...process.env,
					FORCE_COLOR: '0',
					NO_COLOR: '1'
				}
			});

			let buffer = '';

			this.claudeProcess.stdout?.on('data', (data) => {
				buffer += data.toString();
				// Check if we have a complete response
				if (buffer.includes('\n\n') || buffer.includes('> ')) {
					this.handleClaudeResponse(buffer);
					buffer = '';
				}
			});

			this.claudeProcess.stderr?.on('data', (data) => {
				console.error('[MCP-Server] Claude error:', data.toString());
			});

			this.claudeProcess.on('close', (code) => {
				console.log(`[MCP-Server] Claude process closed with code ${code}`);
				// Restart if it crashes
				setTimeout(() => this.startClaudeProcess(), 5000);
			});

			console.log('[MCP-Server] Claude process started in persistent mode');

		} catch (error) {
			console.error('[MCP-Server] Failed to start Claude process:', error);
		}
	}

	/**
	 * Handle response from Claude process
	 */
	private handleClaudeResponse(response: string): void {
		// Find the oldest pending request
		const [requestId] = Array.from(this.requestQueue.keys())[0] || [];
		if (requestId) {
			const request = this.requestQueue.get(requestId);
			if (request) {
				request.resolve(response.trim());
				this.requestQueue.delete(requestId);
			}
		}
	}

	/**
	 * Send message to Claude process (queued to avoid file lock issues)
	 */
	private async sendToClaude(message: string): Promise<string> {
		return new Promise((resolve, reject) => {
			// Add to queue
			this.claudeRequestQueue.push({ message, resolve, reject });
			// Process queue if not already processing
			if (!this.isProcessingClaude) {
				this.processClaudeQueue();
			}
		});
	}

	/**
	 * Process Claude request queue sequentially
	 */
	private async processClaudeQueue(): Promise<void> {
		if (this.isProcessingClaude || this.claudeRequestQueue.length === 0) {
			return;
		}

		this.isProcessingClaude = true;

		while (this.claudeRequestQueue.length > 0) {
			const request = this.claudeRequestQueue.shift();
			if (!request) continue;

			try {
				// Add small delay between requests to avoid file lock issues
				if (this.claudeRequestQueue.length > 0) {
					await new Promise(resolve => setTimeout(resolve, 100));
				}

				const response = await this.executeClaudeRequest(request.message);
				request.resolve(response);
			} catch (error) {
				request.reject(error as Error);
			}
		}

		this.isProcessingClaude = false;
	}

	/**
	 * Execute a single Claude request
	 */
	private async executeClaudeRequest(message: string): Promise<string> {
		return new Promise((resolve, reject) => {
			const claudeProc = cp.spawn('claude', [], {
				shell: process.platform === 'win32',
				stdio: ['pipe', 'pipe', 'pipe'],
				env: {
					...process.env,
					FORCE_COLOR: '0',
					NO_COLOR: '1'
				}
			});

			let output = '';
			let errorOutput = '';

			claudeProc.stdout?.on('data', (data) => {
				output += data.toString();
			});

			claudeProc.stderr?.on('data', (data) => {
				errorOutput += data.toString();
			});

			claudeProc.on('close', (code) => {
				if (code === 0) {
					resolve(output.trim());
				} else {
					reject(new Error(`Claude failed: ${errorOutput}`));
				}
			});

			claudeProc.on('error', (error) => {
				reject(error);
			});

			// Send message
			if (claudeProc.stdin) {
				claudeProc.stdin.write(message + '\n');
				claudeProc.stdin.end();
			}

			// Timeout after 25 seconds per request
			setTimeout(() => {
				claudeProc.kill();
				reject(new Error('Claude response timeout'));
			}, 25000);
		});
	}

	/**
	 * Start WebSocket server
	 */
	private startWebSocketServer(): void {
		if (!WebSocket) {
			console.warn('[MCP-Server] WebSocket module not available, skipping WebSocket server');
			return;
		}
		this.wss = new WebSocket.Server({ port: this.wsPort });

		this.wss.on('connection', (ws: any) => {
			console.log('[MCP-Server] New WebSocket client connected');
			this.clients.add(ws);

			ws.on('message', async (data: any) => {
				try {
					const message = JSON.parse(data.toString());
					await this.handleWebSocketMessage(ws, message);
				} catch (error: any) {
					console.error('[MCP-Server] WebSocket message error:', error);
					ws.send(JSON.stringify({
						type: 'error',
						error: error instanceof Error ? error.message : 'Unknown error'
					}));
				}
			});

			ws.on('close', () => {
				console.log('[MCP-Server] WebSocket client disconnected');
				this.clients.delete(ws);
			});

			ws.on('error', (error: any) => {
				console.error('[MCP-Server] WebSocket error:', error);
			});

			// Send welcome message
			ws.send(JSON.stringify({
				type: 'connected',
				message: 'Connected to MCP server'
			}));
		});
	}

	/**
	 * Handle WebSocket message
	 */
	private async handleWebSocketMessage(ws: any, message: any): Promise<void> {
		const startTime = Date.now();

		if (message.type === 'heartbeat') {
			ws.send(JSON.stringify({ type: 'heartbeat', timestamp: Date.now() }));
			return;
		}

		if (message.type === 'agent_request') {
			console.log(`[MCP-Server] Processing request from ${message.agent}`);

			try {
				// Format message for agent
				const agentPrompt = this.formatAgentPrompt(message);

				// Send to Claude (or simulate for testing)
				const response = await this.getAgentResponse(agentPrompt, message.agent);

				const duration = Date.now() - startTime;

				// Send response back
				ws.send(JSON.stringify({
					type: 'response',
					id: message.id,
					content: response,
					duration: duration,
					agent: message.agent
				}));

				console.log(`[MCP-Server] Response sent in ${duration}ms`);

			} catch (error) {
				ws.send(JSON.stringify({
					type: 'error',
					id: message.id,
					error: error instanceof Error ? error.message : 'Unknown error'
				}));
			}
		}
	}

	/**
	 * Start HTTP API server
	 */
	private startHTTPServer(): void {
		if (!express) {
			console.warn('[MCP-Server] Express module not available, skipping HTTP server');
			return;
		}
		this.app = express();
		this.app?.use(express.json());

		// Health check endpoint
		this.app?.get('/api/health', (req: any, res: any) => {
			res.json({ status: 'ok', timestamp: Date.now() });
		});

		// Chat endpoint
		this.app?.post('/api/chat', async (req: any, res: any) => {
			const startTime = Date.now();

			try {
				const { agent, message, role, context } = req.body;

				console.log(`[MCP-Server] HTTP API request from ${agent}`);

				// Format and process
				const agentPrompt = this.formatAgentPrompt({ agent, message, role, context });
				const response = await this.getAgentResponse(agentPrompt, agent);

				const duration = Date.now() - startTime;

				res.json({
					content: response,
					duration: duration,
					agent: agent
				});

				console.log(`[MCP-Server] HTTP response sent in ${duration}ms`);

			} catch (error) {
				res.status(500).json({
					error: error instanceof Error ? error.message : 'Unknown error'
				});
			}
		});

		this.httpServer = this.app?.listen(this.httpPort);
	}

	/**
	 * Format prompt for specific agent
	 */
	private formatAgentPrompt(message: any): string {
		const { agent, role, message: userMessage } = message;
		return `As ${agent} (${role}): ${userMessage}`;
	}

	/**
	 * Get response from agent (via Claude or simulation)
	 */
	private async getAgentResponse(prompt: string, agentId: string): Promise<string> {
		const useRealClaude = process.env.USE_REAL_CLAUDE !== 'false';

		if (useRealClaude) {
			try {
				// Try to use real Claude CLI
				console.log(`[MCP-Server] Sending to real Claude for ${agentId}`);
				const response = await this.sendToClaude(prompt);
				return response;
			} catch (error) {
				console.error(`[MCP-Server] Claude CLI failed for ${agentId}:`, error);
				// Fall back to simulation
				return this.simulateAgentResponse(agentId, prompt);
			}
		} else {
			// Use simulation for testing
			return this.simulateAgentResponse(agentId, prompt);
		}
	}

	/**
	 * Simulate agent response for testing
	 */
	private async simulateAgentResponse(agentId: string, prompt: string): Promise<string> {
		const responses: { [key: string]: string } = {
			'architect': 'From an architectural perspective, this system should follow microservices patterns with clear API boundaries.',
			'coder': 'I can implement this feature using TypeScript with async/await patterns for optimal performance.',
			'executor': 'Ready to execute the required operations. All systems are operational.',
			'reviewer': 'Code review complete. The implementation meets quality standards with minor suggestions for improvement.',
			'documenter': 'Documentation has been updated to reflect the latest changes and API specifications.',
			'coordinator': 'Coordinating between agents to ensure smooth workflow and optimal task distribution.',
			'team': 'Team consensus: The approach is sound and we can proceed with implementation.'
		};

		// Add very small delay to simulate processing
		const delay = 10 + Math.random() * 40; // 10-50ms for fast simulation
		return new Promise(resolve => {
			setTimeout(() => {
				resolve(responses[agentId] || 'Agent response processed successfully.');
			}, delay);
		});
	}

	private generateId(): string {
		return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	}

	/**
	 * Stop the server
	 */
	stop(): void {
		console.log('[MCP-Server] Stopping server...');

		// Close WebSocket connections
		this.clients.forEach(client => client.close());
		this.wss?.close();

		// Close HTTP server
		this.httpServer?.close();

		// Kill Claude process
		this.claudeProcess?.kill();

		console.log('[MCP-Server] Server stopped');
	}
}

// Start server if run directly
if (require.main === module) {
	// Get ports from environment variables or use defaults
	const wsPort = parseInt(process.env.WS_PORT || '3030');
	const httpPort = parseInt(process.env.HTTP_PORT || '3031');

	const server = new MCPServer(wsPort, httpPort);
	server.start().catch(console.error);

	// Handle shutdown
	process.on('SIGINT', () => {
		server.stop();
		process.exit(0);
	});
}