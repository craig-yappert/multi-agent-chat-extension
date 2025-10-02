import * as vscode from 'vscode';
import { AIProvider } from '../providers';
import { AgentConfig } from '../agents';
import { ProviderConfig } from './ProviderRegistry';

/**
 * Base class for HTTP-based AI providers (OpenAI, Google, xAI, etc.)
 */
export abstract class HttpProvider implements AIProvider {
    protected config: ProviderConfig;
    protected context: vscode.ExtensionContext;

    constructor(config: ProviderConfig, context: vscode.ExtensionContext) {
        this.config = config;
        this.context = context;
    }

    async sendMessage(message: string, agentConfig: AgentConfig, context?: any): Promise<string> {
        try {
            console.log(`[${this.config.displayName}] Sending message for ${agentConfig.id} using model ${agentConfig.model || 'default'}`);

            // Get API key
            const apiKey = await this.getApiKey();
            if (!apiKey) {
                throw new Error(`No API key configured for ${this.config.displayName}. Use Command Palette > 'Manage API Keys'`);
            }

            // Build request
            const requestBody = this.buildRequestBody(message, agentConfig, context);
            const headers = this.buildHeaders(apiKey);
            const url = this.buildUrl(agentConfig.model || 'default');

            console.log(`[${this.config.displayName}] Making request to ${url}`);

            // Make HTTP request
            const response = await this.makeRequest(url, headers, requestBody);

            // Parse response
            const result = this.parseResponse(response);

            console.log(`[${this.config.displayName}] Received response (${result.length} chars)`);
            return result;

        } catch (error: any) {
            console.error(`[${this.config.displayName}] Error:`, error);
            throw new Error(`${this.config.displayName} error: ${error.message}`);
        }
    }

    /**
     * Get API key for this provider
     */
    protected async getApiKey(): Promise<string | undefined> {
        const { ApiKeyManager } = require('../settings/ApiKeyManager');
        const apiKeyManager = ApiKeyManager.getInstance(this.context);

        // Map provider to API key type
        const keyMap: Record<string, 'claude' | 'openai'> = {
            'openai': 'openai',
            'anthropic': 'claude',
            'xai': 'openai', // For now, xAI would need separate storage
            'google': 'openai' // For now, Google would need separate storage
        };

        const keyType = keyMap[this.config.vendor];
        if (!keyType) {
            throw new Error(`No API key mapping for vendor: ${this.config.vendor}`);
        }

        return await apiKeyManager.getApiKey(keyType);
    }

    /**
     * Build HTTP headers for the request
     */
    protected buildHeaders(apiKey: string): Record<string, string> {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json'
        };

        if (this.config.authHeader && this.config.authFormat) {
            const authValue = this.config.authFormat.replace('{apiKey}', apiKey);
            headers[this.config.authHeader] = authValue;
        }

        return headers;
    }

    /**
     * Build request URL
     */
    protected buildUrl(model: string): string {
        if (!this.config.baseUrl || !this.config.chatEndpoint) {
            throw new Error('Provider config missing baseUrl or chatEndpoint');
        }

        // Replace {model} placeholder if present
        const endpoint = this.config.chatEndpoint.replace('{model}', model);
        return `${this.config.baseUrl}${endpoint}`;
    }

    /**
     * Make HTTP request
     */
    protected async makeRequest(url: string, headers: Record<string, string>, body: any): Promise<any> {
        try {
            // Use https module since node-fetch may not be available
            const https = require('https');
            const urlObj = new URL(url);

            const options = {
                hostname: urlObj.hostname,
                port: urlObj.port || 443,
                path: urlObj.pathname + urlObj.search,
                method: 'POST',
                headers: {
                    ...headers,
                    'Content-Length': Buffer.byteLength(JSON.stringify(body))
                }
            };

            return new Promise((resolve, reject) => {
                const req = https.request(options, (res: any) => {
                    let data = '';

                    res.on('data', (chunk: any) => {
                        data += chunk;
                    });

                    res.on('end', () => {
                        if (res.statusCode >= 200 && res.statusCode < 300) {
                            try {
                                resolve(JSON.parse(data));
                            } catch (error) {
                                reject(new Error(`Invalid JSON response: ${data.substring(0, 100)}`));
                            }
                        } else {
                            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                        }
                    });
                });

                req.on('error', (error: any) => {
                    if (error.code === 'ENOTFOUND') {
                        reject(new Error(`Cannot reach ${this.config.displayName} API. Check your internet connection.`));
                    } else {
                        reject(error);
                    }
                });

                req.write(JSON.stringify(body));
                req.end();
            });
        } catch (error: any) {
            throw error;
        }
    }

    /**
     * Build system prompt with agent role and capabilities
     */
    protected buildSystemPrompt(agentConfig: AgentConfig, context?: any): string {
        let prompt = `You are ${agentConfig.name}, a ${agentConfig.role}. ${agentConfig.description}\n\n`;
        prompt += `Your capabilities: ${agentConfig.capabilities.join(', ')}\n`;
        prompt += `Your specializations: ${agentConfig.specializations.join(', ')}\n`;
        if (agentConfig.model) {
            prompt += `You are currently using the ${agentConfig.model} model.\n`;
        }
        prompt += `\n`;

        // Add inter-agent communication instructions if enabled
        const config = vscode.workspace.getConfiguration('multiAgentChat');
        if (config.get<boolean>('agents.enableInterCommunication', true)) {
            prompt += `INTER-AGENT COMMUNICATION:\n`;
            prompt += `You can mention other agents using @agentname: message format.\n`;
            prompt += `Available agents: architect, coder, executor, reviewer, documenter, coordinator\n\n`;
        }

        return prompt;
    }

    /**
     * Build request body (must be implemented by subclasses)
     */
    protected abstract buildRequestBody(message: string, agentConfig: AgentConfig, context?: any): any;

    /**
     * Parse response (must be implemented by subclasses)
     */
    protected abstract parseResponse(response: any): string;
}
