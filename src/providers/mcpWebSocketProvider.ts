import * as vscode from 'vscode';
import WebSocket from 'ws';
import { AgentConfig } from '../agents';
import { EventEmitter } from 'events';

/**
 * Message routing logger for tracking which path each message takes
 */
export class MessageRouter {
	private routeLog: vscode.OutputChannel;

	constructor() {
		this.routeLog = vscode.window.createOutputChannel('Multi-Agent Message Routing');
	}

	logRoute(messageId: string, route: 'MCP_WS' | 'HTTP_API' | 'CLI_FALLBACK', details: any) {
		const timestamp = new Date().toISOString();
		const logEntry = `[${timestamp}] Message ${messageId} -> ${route}: ${JSON.stringify(details)}`;
		this.routeLog.appendLine(logEntry);
		console.log(`[MessageRouter] ${logEntry}`);
	}

	logPerformance(messageId: string, duration: number, success: boolean) {
		const logEntry = `Message ${messageId} completed in ${duration}ms - ${success ? 'SUCCESS' : 'FAILED'}`;
		this.routeLog.appendLine(logEntry);
	}
}

/**
 * MCP WebSocket Provider - Maintains persistent connection to MCP server
 */
export class MCPWebSocketProvider {
	private ws?: WebSocket;
	private isConnected: boolean = false;
	private reconnectAttempts: number = 0;
	private maxReconnectAttempts: number = 5;
	private reconnectDelay: number = 1000;
	private messageQueue: Map<string, (response: string) => void> = new Map();
	private eventEmitter: EventEmitter = new EventEmitter();
	private heartbeatInterval?: NodeJS.Timeout;
	private serverUrl: string;
	private router: MessageRouter;

	constructor(
		serverUrl: string = 'ws://localhost:3030',
		private context: vscode.ExtensionContext
	) {
		this.serverUrl = serverUrl;
		this.router = new MessageRouter();
		this.connect();
		this.setupHeartbeat();
	}

	/**
	 * Connect to MCP WebSocket server
	 */
	private connect(): void {
		try {
			console.log(`[MCP-WS] Connecting to ${this.serverUrl}`);
			this.ws = new WebSocket(this.serverUrl, {
				handshakeTimeout: 3000,
				perMessageDeflate: false
			});

			this.ws?.on('open', () => {
				console.log('[MCP-WS] Connected successfully');
				this.isConnected = true;
				this.reconnectAttempts = 0;
				this.eventEmitter.emit('connected');
			});

			this.ws?.on('message', (data: WebSocket.Data) => {
				this.handleMessage(data.toString());
			});

			this.ws?.on('error', (error: any) => {
				// Only log detailed errors if not a connection error
				if (error.code !== 'ECONNREFUSED') {
					console.error('[MCP-WS] Error:', error.message || error);
				}
				this.eventEmitter.emit('error', error);
			});

			this.ws?.on('close', () => {
				console.log('[MCP-WS] Connection closed');
				this.isConnected = false;
				this.eventEmitter.emit('disconnected');
				this.attemptReconnect();
			});

		} catch (error: any) {
			if (error.code !== 'ECONNREFUSED') {
				console.log('[MCP-WS] Connection attempt failed, will retry...');
			}
			this.attemptReconnect();
		}
	}

	/**
	 * Handle incoming messages from MCP server
	 */
	private handleMessage(data: string): void {
		try {
			const message = JSON.parse(data);

			if (message.type === 'response' && message.id) {
				const resolver = this.messageQueue.get(message.id);
				if (resolver) {
					resolver(message.content);
					this.messageQueue.delete(message.id);
					this.router.logPerformance(message.id, message.duration || 0, true);
				}
			} else if (message.type === 'heartbeat') {
				// Server heartbeat response
				console.log('[MCP-WS] Heartbeat received');
			}
		} catch (error) {
			console.error('[MCP-WS] Error handling message:', error);
		}
	}

	/**
	 * Send message to MCP server via WebSocket
	 */
	async sendMessage(message: string, agentConfig: AgentConfig, context?: any): Promise<string> {
		const messageId = this.generateMessageId();
		const startTime = Date.now();

		this.router.logRoute(messageId, 'MCP_WS', {
			agent: agentConfig.id,
			connected: this.isConnected,
			serverUrl: this.serverUrl
		});

		if (!this.isConnected) {
			throw new Error('MCP WebSocket not connected');
		}

		return new Promise((resolve, reject) => {
			// Use longer timeout for real Claude responses
			const timeoutMs = 30000; // 30 seconds for queued Claude
			const timeout = setTimeout(() => {
				this.messageQueue.delete(messageId);
				const duration = Date.now() - startTime;
				this.router.logPerformance(messageId, duration, false);
				reject(new Error(`MCP WebSocket timeout after ${duration}ms`));
			}, timeoutMs);

			this.messageQueue.set(messageId, (response: string) => {
				clearTimeout(timeout);
				const duration = Date.now() - startTime;
				console.log(`[MCP-WS] Response received in ${duration}ms`);
				resolve(response);
			});

			const payload = {
				id: messageId,
				type: 'agent_request',
				agent: agentConfig.id,
				role: agentConfig.role,
				message: message,
				context: context,
				timestamp: Date.now()
			};

			this.ws?.send(JSON.stringify(payload));
		});
	}

	/**
	 * Attempt to reconnect to MCP server
	 */
	private attemptReconnect(): void {
		if (this.reconnectAttempts >= this.maxReconnectAttempts) {
			console.error('[MCP-WS] Max reconnection attempts reached');
			this.eventEmitter.emit('max_reconnect_failed');
			return;
		}

		this.reconnectAttempts++;
		const delay = this.reconnectDelay * this.reconnectAttempts;

		console.log(`[MCP-WS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

		setTimeout(() => {
			this.connect();
		}, delay);
	}

	/**
	 * Setup heartbeat to keep connection alive
	 */
	private setupHeartbeat(): void {
		this.heartbeatInterval = setInterval(() => {
			if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
				this.ws.send(JSON.stringify({ type: 'heartbeat' }));
			}
		}, 30000); // Every 30 seconds
	}

	/**
	 * Check if connected to MCP server
	 */
	isReady(): boolean {
		return this.isConnected && this.ws?.readyState === WebSocket.OPEN;
	}

	/**
	 * Disconnect from MCP server
	 */
	disconnect(): void {
		if (this.heartbeatInterval) {
			clearInterval(this.heartbeatInterval);
		}
		if (this.ws) {
			this.ws.close();
		}
		this.isConnected = false;
	}

	private generateMessageId(): string {
		return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	}

	/**
	 * Wait for connection to be ready
	 */
	async waitForConnection(timeout: number = 5000): Promise<boolean> {
		if (this.isReady()) {
			return true;
		}

		return new Promise((resolve) => {
			const timer = setTimeout(() => {
				this.eventEmitter.removeAllListeners('connected');
				resolve(false);
			}, timeout);

			this.eventEmitter.once('connected', () => {
				clearTimeout(timer);
				resolve(true);
			});
		});
	}
}

/**
 * HTTP API Provider - Fallback when WebSocket is unavailable
 */
export class HTTPAPIProvider {
	private apiUrl: string;
	private router: MessageRouter;
	private apiKey?: string;

	constructor(
		apiUrl: string = 'http://localhost:3031/api',
		private context: vscode.ExtensionContext
	) {
		this.apiUrl = apiUrl;
		this.router = new MessageRouter();
		// Load API key from settings if needed
		const config = vscode.workspace.getConfiguration('claudeCodeChat');
		this.apiKey = config.get<string>('api.key');
	}

	/**
	 * Send message via HTTP API
	 */
	async sendMessage(message: string, agentConfig: AgentConfig, context?: any): Promise<string> {
		const messageId = this.generateMessageId();
		const startTime = Date.now();

		this.router.logRoute(messageId, 'HTTP_API', {
			agent: agentConfig.id,
			apiUrl: this.apiUrl
		});

		try {
			const response = await this.makeAPICall(message, agentConfig, context);

			const duration = Date.now() - startTime;
			this.router.logPerformance(messageId, duration, true);
			console.log(`[HTTP-API] Response received in ${duration}ms`);

			return response;
		} catch (error) {
			const duration = Date.now() - startTime;
			this.router.logPerformance(messageId, duration, false);
			throw new Error(`HTTP API failed after ${duration}ms: ${error}`);
		}
	}

	/**
	 * Make HTTP API call
	 */
	private async makeAPICall(message: string, agentConfig: AgentConfig, context?: any): Promise<string> {
		const payload = {
			agent: agentConfig.id,
			role: agentConfig.role,
			message: message,
			context: context,
			timestamp: Date.now()
		};

		const headers: any = {
			'Content-Type': 'application/json'
		};

		if (this.apiKey) {
			headers['Authorization'] = `Bearer ${this.apiKey}`;
		}

		// Using fetch API (available in newer Node.js versions)
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), 30000); // 30 second timeout for queued Claude

		try {
			const response = await fetch(`${this.apiUrl}/chat`, {
				method: 'POST',
				headers: headers,
				body: JSON.stringify(payload),
				signal: controller.signal
			});

			clearTimeout(timeout);

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}

			const data: any = await response.json();
			return data.content || data.response || '';

		} catch (error: any) {
			clearTimeout(timeout);
			if (error.name === 'AbortError') {
				throw new Error('HTTP API request timeout');
			}
			throw error;
		}
	}

	private generateMessageId(): string {
		return `http_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	}

	/**
	 * Test if API is reachable
	 */
	async testConnection(): Promise<boolean> {
		try {
			const response = await fetch(`${this.apiUrl}/health`, {
				method: 'GET',
				signal: AbortSignal.timeout(3000)
			});
			return response.ok;
		} catch {
			return false;
		}
	}
}