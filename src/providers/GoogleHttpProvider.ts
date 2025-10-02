import { HttpProvider } from './HttpProvider';
import { AgentConfig } from '../agents';

/**
 * Google Gemini HTTP provider
 * Uses Google's Gemini API format (different from OpenAI)
 */
export class GoogleHttpProvider extends HttpProvider {
    /**
     * Build Google Gemini request body
     */
    protected buildRequestBody(message: string, agentConfig: AgentConfig, context?: any): any {
        const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];

        // Build system instruction
        const systemPrompt = this.buildSystemPrompt(agentConfig, context);

        // Add conversation history if available
        if (context?.conversationHistory && context.conversationHistory.length > 0) {
            for (const msg of context.conversationHistory.slice(-10)) {
                contents.push({
                    role: msg.role === 'user' ? 'user' : 'model',
                    parts: [{ text: msg.content.substring(0, 1000) }]
                });
            }
        }

        // Add current message
        contents.push({
            role: 'user',
            parts: [{ text: message }]
        });

        return {
            contents,
            systemInstruction: {
                parts: [{ text: systemPrompt }]
            },
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 8192,
                topP: 0.95
            }
        };
    }

    /**
     * Parse Google Gemini response
     */
    protected parseResponse(response: any): string {
        if (!response.candidates || response.candidates.length === 0) {
            throw new Error('No response candidates returned from Gemini API');
        }

        const candidate = response.candidates[0];
        if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
            throw new Error('Invalid response format from Gemini API');
        }

        const text = candidate.content.parts.map((part: any) => part.text || '').join('');
        return text.trim();
    }

    /**
     * Override buildHeaders to use query param authentication for Google
     */
    protected buildHeaders(apiKey: string): Record<string, string> {
        // Google uses query param for auth, not headers
        return {
            'Content-Type': 'application/json'
        };
    }

    /**
     * Override sendMessage to add API key as query parameter (Google-specific)
     */
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

            // Build URL with API key as query parameter (Google-specific)
            const baseUrl = this.buildUrl(agentConfig.model || 'default');
            const url = `${baseUrl}?key=${apiKey}`;

            console.log(`[${this.config.displayName}] Making request to ${url.replace(/key=[^&]+/, 'key=***')}`);

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
}
