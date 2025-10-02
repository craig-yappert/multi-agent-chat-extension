import { HttpProvider } from './HttpProvider';
import { AgentConfig } from '../agents';

/**
 * OpenAI HTTP provider
 * Also works with xAI Grok and other OpenAI-compatible APIs
 */
export class OpenAIHttpProvider extends HttpProvider {
    /**
     * Build OpenAI chat completions request body
     */
    protected buildRequestBody(message: string, agentConfig: AgentConfig, context?: any): any {
        const messages: Array<{ role: string; content: string }> = [];

        // Add system prompt
        const systemPrompt = this.buildSystemPrompt(agentConfig, context);
        messages.push({
            role: 'system',
            content: systemPrompt
        });

        // Add conversation history if available
        if (context?.conversationHistory && context.conversationHistory.length > 0) {
            for (const msg of context.conversationHistory.slice(-10)) {
                messages.push({
                    role: msg.role === 'user' ? 'user' : 'assistant',
                    content: msg.content.substring(0, 1000) // Truncate long messages
                });
            }
        }

        // Add current message
        messages.push({
            role: 'user',
            content: message
        });

        return {
            model: agentConfig.model || 'gpt-4o',
            messages,
            temperature: 0.7,
            max_tokens: 4096
        };
    }

    /**
     * Parse OpenAI chat completions response
     */
    protected parseResponse(response: any): string {
        if (!response.choices || response.choices.length === 0) {
            throw new Error('No response choices returned from API');
        }

        const message = response.choices[0].message;
        if (!message || !message.content) {
            throw new Error('Invalid response format from API');
        }

        return message.content.trim();
    }
}
