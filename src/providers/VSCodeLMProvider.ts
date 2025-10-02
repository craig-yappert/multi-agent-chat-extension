import * as vscode from 'vscode';
import { AIProvider } from '../providers';
import { AgentConfig } from '../agents';

/**
 * Provider that uses VS Code's Language Model API (vscode.lm)
 * Works with GitHub Copilot, Continue.dev, and other extensions that provide models
 */
export class VSCodeLMProvider implements AIProvider {
    private context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    async sendMessage(message: string, agentConfig: AgentConfig, context?: any): Promise<string> {
        try {
            console.log(`[VSCodeLMProvider] Sending message for ${agentConfig.id} using model ${agentConfig.model}`);

            // Build the prompt with agent role and context
            const systemPrompt = this.buildSystemPrompt(agentConfig, context);

            // Select appropriate model
            const model = await this.selectModel(agentConfig.model);

            if (!model) {
                throw new Error(`No VS Code language model available for '${agentConfig.model}'`);
            }

            console.log(`[VSCodeLMProvider] Using VS Code model: ${model.id} (vendor: ${model.vendor}, family: ${model.family})`);

            // Build messages array
            const messages: vscode.LanguageModelChatMessage[] = [];

            // Add system prompt as user message (some models don't support system role)
            if (systemPrompt) {
                messages.push(vscode.LanguageModelChatMessage.User(systemPrompt));
            }

            // Add conversation history if available
            if (context?.conversationHistory && context.conversationHistory.length > 0) {
                for (const msg of context.conversationHistory.slice(-10)) {
                    if (msg.role === 'user') {
                        messages.push(vscode.LanguageModelChatMessage.User(msg.content));
                    } else {
                        messages.push(vscode.LanguageModelChatMessage.Assistant(msg.content.substring(0, 200)));
                    }
                }
            }

            // Add current message
            messages.push(vscode.LanguageModelChatMessage.User(message));

            // Send request
            const response = await model.sendRequest(messages, {}, new vscode.CancellationTokenSource().token);

            // Collect streaming response
            let result = '';
            for await (const chunk of response.text) {
                result += chunk;

                // Stream to UI if callback available
                if (context?.onPartialResponse) {
                    context.onPartialResponse(chunk);
                }
            }

            console.log(`[VSCodeLMProvider] Received response (${result.length} chars)`);
            return result.trim();

        } catch (error: any) {
            if (error?.message?.includes('consent')) {
                throw new Error('VS Code Language Model requires user consent. Please accept the permission dialog.');
            }
            console.error('[VSCodeLMProvider] Error:', error);
            throw error;
        }
    }

    /**
     * Select the best available VS Code language model
     */
    private async selectModel(requestedModel?: string): Promise<vscode.LanguageModelChat | null> {
        try {
            // If a specific model is requested, try to find it
            if (requestedModel && requestedModel !== 'default') {
                // Try exact ID match
                const exactMatch = await vscode.lm.selectChatModels({ id: requestedModel });
                if (exactMatch.length > 0) {
                    return exactMatch[0];
                }

                // Try family match (e.g., "gpt-4" family)
                const familyMatch = await vscode.lm.selectChatModels({ family: requestedModel });
                if (familyMatch.length > 0) {
                    return familyMatch[0];
                }

                console.warn(`[VSCodeLMProvider] Requested model '${requestedModel}' not found, falling back to any available model`);
            }

            // Get any available models
            const allModels = await vscode.lm.selectChatModels();

            if (allModels.length === 0) {
                console.error('[VSCodeLMProvider] No language models available');
                return null;
            }

            // Prefer models in this order: claude > gpt-4 > gpt-3.5 > other
            const preferredOrder = ['claude', 'gpt-4', 'gpt-3'];

            for (const preferred of preferredOrder) {
                const match = allModels.find(m =>
                    m.id.toLowerCase().includes(preferred) ||
                    m.family?.toLowerCase().includes(preferred)
                );
                if (match) {
                    return match;
                }
            }

            // Return first available model
            return allModels[0];

        } catch (error) {
            console.error('[VSCodeLMProvider] Error selecting model:', error);
            return null;
        }
    }

    /**
     * Build system prompt with agent role and capabilities
     */
    private buildSystemPrompt(agentConfig: AgentConfig, context?: any): string {
        let prompt = `You are ${agentConfig.name}, a ${agentConfig.role}. ${agentConfig.description}\n\n`;
        prompt += `Your capabilities: ${agentConfig.capabilities.join(', ')}\n`;
        prompt += `Your specializations: ${agentConfig.specializations.join(', ')}\n\n`;

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
     * List all available VS Code language models
     */
    public static async listAvailableModels(): Promise<Array<{ id: string; vendor: string; family?: string; name: string }>> {
        try {
            const models = await vscode.lm.selectChatModels();
            return models.map(m => ({
                id: m.id,
                vendor: m.vendor,
                family: m.family,
                name: m.name
            }));
        } catch (error) {
            console.error('[VSCodeLMProvider] Error listing models:', error);
            return [];
        }
    }
}
