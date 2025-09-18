import * as vscode from 'vscode';
import { AgentConfig } from '../agents';
import { MCPWebSocketProvider, HTTPAPIProvider, MessageRouter } from './mcpWebSocketProvider';
import { ClaudeProvider } from '../providers';

/**
 * Intelligent Provider - Smart routing between WebSocket, HTTP API, and CLI
 * Automatically selects the fastest available method
 */
export class IntelligentProvider {
	private mcpWsProvider?: MCPWebSocketProvider;
	private httpApiProvider: HTTPAPIProvider;
	private claudeProvider: ClaudeProvider;
	private router: MessageRouter;

	// Performance metrics for intelligent routing
	private performanceMetrics: {
		mcp_ws: { avgTime: number, successRate: number, attempts: number },
		http_api: { avgTime: number, successRate: number, attempts: number },
		cli: { avgTime: number, successRate: number, attempts: number }
	} = {
		mcp_ws: { avgTime: 0, successRate: 1.0, attempts: 0 },
		http_api: { avgTime: 0, successRate: 1.0, attempts: 0 },
		cli: { avgTime: 0, successRate: 0.5, attempts: 0 } // CLI starts with lower success rate due to known issues
	};

	// Configuration
	private config: {
		preferWebSocket: boolean;
		fallbackToHttp: boolean;
		fallbackToCLI: boolean;
		adaptiveRouting: boolean;
		logVerbose: boolean;
	};

	constructor(private context: vscode.ExtensionContext) {
		this.router = new MessageRouter();

		// Load configuration
		const vsConfig = vscode.workspace.getConfiguration('claudeCodeChat');
		this.config = {
			preferWebSocket: vsConfig.get<boolean>('routing.preferWebSocket', true),
			fallbackToHttp: vsConfig.get<boolean>('routing.fallbackToHttp', true),
			fallbackToCLI: vsConfig.get<boolean>('routing.fallbackToCLI', true), // Enable CLI fallback
			adaptiveRouting: vsConfig.get<boolean>('routing.adaptive', true),
			logVerbose: vsConfig.get<boolean>('routing.logVerbose', true)
		};

		// Initialize providers with correct ports
		const wsPort = vsConfig.get<number>('mcp.wsPort', 3030);
		const httpPort = vsConfig.get<number>('mcp.httpPort', 3031);
		const mcpServerUrl = vsConfig.get<string>('mcp.serverUrl', `ws://localhost:${wsPort}`);
		const httpApiUrl = vsConfig.get<string>('api.url', `http://localhost:${httpPort}/api`);

		this.httpApiProvider = new HTTPAPIProvider(httpApiUrl, context);
		this.claudeProvider = new ClaudeProvider(context);

		// Delay WebSocket connection to allow server to start
		setTimeout(() => {
			this.mcpWsProvider = new MCPWebSocketProvider(mcpServerUrl, context);
			// Initialize connection in background
			this.initialize().catch(err => {
				console.log('[IntelligentProvider] Initialization warning:', err.message);
			});
		}, 2000);

		this.logConfig();
	}

	/**
	 * Send message using the most appropriate provider
	 */
	async sendMessage(message: string, agentConfig: AgentConfig, context?: any): Promise<string> {
		const messageId = this.generateMessageId();
		const startTime = Date.now();

		this.log(`[Intelligent] Routing message ${messageId} for agent ${agentConfig.id}`);

		// Determine best route
		const route = this.determineRoute();

		let response: string | null = null;
		let error: Error | null = null;

		// Try primary route
		if (route === 'mcp_ws' && this.mcpWsProvider?.isReady()) {
			try {
				this.log(`[Intelligent] Trying MCP WebSocket`);
				response = await this.mcpWsProvider!.sendMessage(message, agentConfig, context);
				this.updateMetrics('mcp_ws', Date.now() - startTime, true);
			} catch (err: any) {
				error = err;
				this.updateMetrics('mcp_ws', Date.now() - startTime, false);
				this.log(`[Intelligent] MCP WebSocket failed: ${err.message}`);
			}
		}

		// Fallback to HTTP API
		if (!response && this.config.fallbackToHttp) {
			try {
				this.log(`[Intelligent] Trying HTTP API fallback`);
				const httpStart = Date.now();
				response = await this.httpApiProvider.sendMessage(message, agentConfig, context);
				this.updateMetrics('http_api', Date.now() - httpStart, true);
			} catch (err: any) {
				error = err;
				this.updateMetrics('http_api', Date.now() - startTime, false);
				this.log(`[Intelligent] HTTP API failed: ${err.message}`);
			}
		}

		// Last resort: CLI (always available as final fallback)
		if (!response && this.config.fallbackToCLI) {
			try {
				this.log(`[Intelligent] Trying CLI fallback (real Claude, but slower)`);
				const cliStart = Date.now();
				response = await this.claudeProvider.sendMessage(message, agentConfig, context);
				this.updateMetrics('cli', Date.now() - cliStart, true);
				this.log(`[Intelligent] CLI succeeded in ${Date.now() - cliStart}ms`);
			} catch (err: any) {
				error = err;
				this.updateMetrics('cli', Date.now() - startTime, false);
				this.log(`[Intelligent] CLI failed: ${err.message}`);
			}
		}

		const totalTime = Date.now() - startTime;

		if (response) {
			this.log(`[Intelligent] Success! Message ${messageId} completed in ${totalTime}ms`);
			return response;
		} else {
			const errorMsg = `All providers failed for message ${messageId} after ${totalTime}ms: ${error?.message}`;
			this.log(`[Intelligent] ${errorMsg}`);
			throw new Error(errorMsg);
		}
	}

	/**
	 * Determine best route based on performance metrics
	 */
	private determineRoute(): 'mcp_ws' | 'http_api' | 'cli' {
		if (!this.config.adaptiveRouting) {
			// Simple preference-based routing
			if (this.config.preferWebSocket && this.mcpWsProvider?.isReady()) {
				return 'mcp_ws';
			}
			return 'http_api';
		}

		// Adaptive routing based on performance
		const routes = [
			{ name: 'mcp_ws' as const, score: this.calculateRouteScore('mcp_ws'), available: this.mcpWsProvider?.isReady() || false },
			{ name: 'http_api' as const, score: this.calculateRouteScore('http_api'), available: true },
			{ name: 'cli' as const, score: this.calculateRouteScore('cli'), available: this.config.fallbackToCLI }
		];

		// Sort by score and filter available
		const bestRoute = routes
			.filter(r => r.available)
			.sort((a, b) => b.score - a.score)[0];

		return bestRoute?.name || 'http_api';
	}

	/**
	 * Calculate route score based on performance metrics
	 */
	private calculateRouteScore(route: 'mcp_ws' | 'http_api' | 'cli'): number {
		const metrics = this.performanceMetrics[route];

		// No data yet, use defaults
		if (metrics.attempts === 0) {
			switch (route) {
				case 'mcp_ws': return 100; // Prefer WebSocket
				case 'http_api': return 80; // Second choice
				case 'cli': return 20; // Last resort
			}
		}

		// Calculate score based on success rate and speed
		// Lower avgTime is better, higher successRate is better
		const speedScore = Math.max(0, 100 - (metrics.avgTime / 100)); // 0-100 based on ms
		const successScore = metrics.successRate * 100; // 0-100

		// Weight success more heavily than speed
		return (successScore * 0.7) + (speedScore * 0.3);
	}

	/**
	 * Update performance metrics for a route
	 */
	private updateMetrics(route: 'mcp_ws' | 'http_api' | 'cli', duration: number, success: boolean): void {
		const metrics = this.performanceMetrics[route];

		// Update average time (exponential moving average)
		if (metrics.attempts === 0) {
			metrics.avgTime = duration;
		} else {
			metrics.avgTime = (metrics.avgTime * 0.7) + (duration * 0.3);
		}

		// Update success rate
		const successValue = success ? 1 : 0;
		if (metrics.attempts === 0) {
			metrics.successRate = successValue;
		} else {
			metrics.successRate = (metrics.successRate * metrics.attempts + successValue) / (metrics.attempts + 1);
		}

		metrics.attempts++;

		this.log(`[Metrics] ${route}: avgTime=${Math.round(metrics.avgTime)}ms, successRate=${(metrics.successRate * 100).toFixed(1)}%, attempts=${metrics.attempts}`);
	}

	/**
	 * Initialize MCP server connection
	 */
	async initialize(): Promise<void> {
		this.log('[Intelligent] Initializing providers...');

		// Try to connect to MCP WebSocket if available
		const wsConnected = this.mcpWsProvider ? await this.mcpWsProvider.waitForConnection(3000) : false;
		if (wsConnected) {
			this.log('[Intelligent] MCP WebSocket connected successfully');
		} else {
			this.log('[Intelligent] MCP WebSocket connection failed, will use fallbacks');
		}

		// Test HTTP API
		const apiAvailable = await this.httpApiProvider.testConnection();
		if (apiAvailable) {
			this.log('[Intelligent] HTTP API is available');
		} else {
			this.log('[Intelligent] HTTP API is not available');
		}

		// Log final routing strategy
		this.logRoutingStrategy();
	}

	/**
	 * Log current configuration
	 */
	private logConfig(): void {
		this.log('[Intelligent] Configuration:', this.config);
	}

	/**
	 * Log routing strategy
	 */
	private logRoutingStrategy(): void {
		const strategies: string[] = [];

		if (this.mcpWsProvider?.isReady()) {
			strategies.push('MCP WebSocket (primary)');
		}
		if (this.config.fallbackToHttp) {
			strategies.push('HTTP API (fallback)');
		}
		if (this.config.fallbackToCLI) {
			strategies.push('CLI (last resort)');
		}

		this.log(`[Intelligent] Routing strategy: ${strategies.join(' -> ')}`);
	}

	/**
	 * Logging helper
	 */
	private log(message: string, ...args: any[]): void {
		if (this.config.logVerbose) {
			console.log(message, ...args);
		}
	}

	private generateMessageId(): string {
		return `intel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	}

	/**
	 * Dispose of resources
	 */
	dispose(): void {
		this.mcpWsProvider?.disconnect();
	}
}