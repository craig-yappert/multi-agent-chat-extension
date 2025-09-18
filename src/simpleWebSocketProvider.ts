import * as vscode from 'vscode';
import { AgentConfig } from './agents';
import { AdaptiveTimeoutProvider } from './adaptiveTimeoutProvider';

// Use the existing WebSocket type from Node.js
const WebSocket = require('ws');

/**
 * SimpleWebSocketProvider - Focus on WebSocket only, no complex fallbacks
 */
export class SimpleWebSocketProvider {
    private ws?: any; // WebSocket instance
    private connected: boolean = false;
    private responseHandlers: Map<string, (response: string) => void> = new Map();
    private serverUrl: string;

    constructor(
        private context: vscode.ExtensionContext,
        serverUrl: string = 'ws://localhost:3030'
    ) {
        this.serverUrl = serverUrl;
        this.connect();
    }

    /**
     * Connect to WebSocket server
     */
    private async connect(): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                console.log('[SimpleWS] Connecting to', this.serverUrl);
                this.ws = new WebSocket(this.serverUrl);

                this.ws!.on('open', () => {
                    console.log('[SimpleWS] Connected successfully');
                    this.connected = true;
                    this.setupHeartbeat();
                    resolve();
                });

                this.ws!.on('message', (data: any) => {
                    try {
                        const message = JSON.parse(data.toString());
                        this.handleMessage(message);
                    } catch (error) {
                        console.error('[SimpleWS] Failed to parse message:', error);
                    }
                });

                this.ws!.on('error', (error: any) => {
                    console.error('[SimpleWS] WebSocket error:', error);
                    this.connected = false;
                });

                this.ws!.on('close', () => {
                    console.log('[SimpleWS] Connection closed');
                    this.connected = false;
                    // Attempt reconnect after 2 seconds
                    setTimeout(() => this.connect(), 2000);
                });

                // Timeout connection attempt
                setTimeout(() => {
                    if (!this.connected) {
                        reject(new Error('Connection timeout'));
                    }
                }, 5000);
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Setup heartbeat to keep connection alive
     */
    private setupHeartbeat(): void {
        const interval = setInterval(() => {
            if (this.connected && this.ws?.readyState === 1) { // WebSocket.OPEN = 1
                this.ws.send(JSON.stringify({ type: 'heartbeat' })); // MCP server expects 'heartbeat' not 'ping'
            } else {
                clearInterval(interval);
            }
        }, 30000);
    }

    /**
     * Handle incoming WebSocket messages
     */
    private handleMessage(message: any): void {
        console.log('[SimpleWS] Received message:', message.type, message.id);

        if (message.type === 'response' && message.id) {
            const handler = this.responseHandlers.get(message.id);
            if (handler) {
                handler(message.content || message.response); // MCP server sends 'content'
                this.responseHandlers.delete(message.id);
            }
        } else if (message.type === 'pong') {
            // Heartbeat response
        } else if (message.type === 'connected') {
            console.log('[SimpleWS] Server acknowledged connection');
        }
    }

    /**
     * Send message to a single agent via WebSocket
     */
    async sendMessage(
        message: string,
        agentConfig: AgentConfig,
        timeout?: number // Optional, will use adaptive timeout if not provided
    ): Promise<string> {
        if (!this.connected || !this.ws) {
            throw new Error('WebSocket not connected');
        }

        const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        return new Promise((resolve, reject) => {
            // Use adaptive timeout based on message complexity
            const actualTimeout = timeout || AdaptiveTimeoutProvider.getTimeoutWithBuffer(message);
            console.log(`[SimpleWS] Using ${actualTimeout}ms timeout for ${agentConfig.name}`);

            // Set up timeout
            const timer = setTimeout(() => {
                this.responseHandlers.delete(requestId);
                reject(new Error(`WebSocket timeout after ${actualTimeout}ms`));
            }, actualTimeout);

            // Set up response handler
            this.responseHandlers.set(requestId, (response: string) => {
                clearTimeout(timer);
                resolve(response);
            });

            // Send message in MCP server expected format
            const wsMessage = {
                id: requestId,
                type: 'agent_request', // MCP server expects this type
                agent: agentConfig.id,
                role: agentConfig.role,
                message: message
            };

            this.ws!.send(JSON.stringify(wsMessage));
            console.log(`[SimpleWS] Sent message to ${agentConfig.name}`);
        });
    }

    /**
     * Send team message - query only 2-3 agents in parallel
     */
    async sendTeamMessage(
        message: string,
        agents: AgentConfig[],
        teamConfig: AgentConfig
    ): Promise<string> {
        const startTime = Date.now();

        // Select 2-3 most relevant agents
        const selectedAgents = this.selectRelevantAgents(message, agents);
        console.log(`[SimpleWS] Team query with ${selectedAgents.length} agents:`,
            selectedAgents.map(a => a.name).join(', '));

        // Send to all selected agents in parallel
        const promises = selectedAgents.map(agent =>
            this.sendMessage(
                message, // Send original message, MCP server will format it
                agent
                // Adaptive timeout will be calculated automatically
            ).catch(err => {
                console.log(`[SimpleWS] ${agent.name} failed:`, err.message);
                return null;
            })
        );

        // Wait for responses with overall timeout
        const responseTimeout = new Promise<(string | null)[]>((resolve) => {
            setTimeout(() => {
                console.log('[SimpleWS] Overall team timeout reached');
                resolve([]);
            }, 40000); // 40 second overall timeout
        });

        const responses = await Promise.race([
            Promise.all(promises),
            responseTimeout
        ]) as (string | null)[];
        const validResponses = responses.filter(r => r !== null) as string[];

        if (validResponses.length === 0) {
            return `${teamConfig.icon} **${teamConfig.name}**: No agents responded. Please try again.`;
        }

        // Simple synthesis
        const synthesis = this.synthesizeResponses(validResponses, selectedAgents);
        const elapsed = Date.now() - startTime;

        return `${teamConfig.icon} **${teamConfig.name} Response**\n\n${synthesis}\n\n---\n*${validResponses.length}/${selectedAgents.length} agents responded in ${(elapsed/1000).toFixed(1)}s*`;
    }

    /**
     * Select 2-3 most relevant agents based on message
     */
    private selectRelevantAgents(message: string, agents: AgentConfig[]): AgentConfig[] {
        const msgLower = message.toLowerCase();
        const selected: AgentConfig[] = [];

        // FOR NOW: Only select ONE agent to avoid sequential bottleneck
        // TODO: Fix MCP server to handle parallel requests

        // Select the most relevant single agent based on keywords
        if (msgLower.includes('test') || msgLower.includes('validate') || msgLower.includes('verify')) {
            const reviewer = agents.find(a => a.id === 'reviewer');
            if (reviewer) return [reviewer];
        } else if (msgLower.includes('design') || msgLower.includes('architect') || msgLower.includes('plan')) {
            const architect = agents.find(a => a.id === 'architect');
            if (architect) return [architect];
        } else if (msgLower.includes('document') || msgLower.includes('explain')) {
            const documenter = agents.find(a => a.id === 'documenter');
            if (documenter) return [documenter];
        } else if (msgLower.includes('execute') || msgLower.includes('run') || msgLower.includes('command')) {
            const executor = agents.find(a => a.id === 'executor');
            if (executor) return [executor];
        } else if (msgLower.includes('coordinate') || msgLower.includes('team')) {
            const coordinator = agents.find(a => a.id === 'coordinator');
            if (coordinator) return [coordinator];
        }

        // Default: use coder
        const coder = agents.find(a => a.id === 'coder');
        if (coder) return [coder];

        // Fallback: first available agent
        return agents.slice(0, 1);
    }

    /**
     * Simple response synthesis
     */
    private synthesizeResponses(responses: string[], agents: AgentConfig[]): string {
        if (responses.length === 1) {
            return responses[0];
        }

        let synthesis = '';
        responses.forEach((response, i) => {
            if (response && agents[i]) {
                const firstLine = response.split('\n')[0];
                synthesis += `**${agents[i].name}**: ${firstLine}\n\n`;
            }
        });

        return synthesis.trim();
    }

    /**
     * Check if connected
     */
    isConnected(): boolean {
        return this.connected && this.ws?.readyState === 1; // WebSocket.OPEN = 1
    }

    /**
     * Dispose and cleanup
     */
    dispose(): void {
        if (this.ws) {
            this.ws.close();
        }
        this.responseHandlers.clear();
    }
}