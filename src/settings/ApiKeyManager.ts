import * as vscode from 'vscode';

/**
 * Manages API keys using VS Code's SecretStorage API for secure, encrypted storage.
 * Keys are stored per-user and never written to project files or git.
 */
export class ApiKeyManager {
    private static instance: ApiKeyManager;
    private readonly SECRET_KEYS = {
        claude: 'multiAgentChat.apiKeys.claude',
        openai: 'multiAgentChat.apiKeys.openai'
    };

    private constructor(private context: vscode.ExtensionContext) {}

    public static getInstance(context: vscode.ExtensionContext): ApiKeyManager {
        if (!ApiKeyManager.instance) {
            ApiKeyManager.instance = new ApiKeyManager(context);
        }
        return ApiKeyManager.instance;
    }

    /**
     * Get API key for a provider from secure storage
     */
    public async getApiKey(provider: 'claude' | 'openai'): Promise<string | undefined> {
        try {
            const key = await this.context.secrets.get(this.SECRET_KEYS[provider]);
            return key;
        } catch (error) {
            console.error(`Failed to retrieve ${provider} API key:`, error);
            return undefined;
        }
    }

    /**
     * Store API key in secure storage
     */
    public async setApiKey(provider: 'claude' | 'openai', apiKey: string): Promise<void> {
        try {
            await this.context.secrets.store(this.SECRET_KEYS[provider], apiKey);
            console.log(`[ApiKeyManager] Stored ${provider} API key securely`);
        } catch (error) {
            console.error(`Failed to store ${provider} API key:`, error);
            throw error;
        }
    }

    /**
     * Delete API key from secure storage
     */
    public async deleteApiKey(provider: 'claude' | 'openai'): Promise<void> {
        try {
            await this.context.secrets.delete(this.SECRET_KEYS[provider]);
            console.log(`[ApiKeyManager] Deleted ${provider} API key`);
        } catch (error) {
            console.error(`Failed to delete ${provider} API key:`, error);
            throw error;
        }
    }

    /**
     * Check if an API key exists (without retrieving it)
     */
    public async hasApiKey(provider: 'claude' | 'openai'): Promise<boolean> {
        const key = await this.getApiKey(provider);
        return key !== undefined && key.length > 0;
    }

    /**
     * Migrate API keys from old VS Code settings to SecretStorage
     * Returns true if migration was performed
     */
    public async migrateFromSettings(): Promise<boolean> {
        let migrated = false;
        const config = vscode.workspace.getConfiguration('multiAgentChat');

        // Migrate Claude key
        const claudeKey = config.get<string>('apiKeys.claude');
        if (claudeKey && claudeKey.length > 0) {
            const hasExisting = await this.hasApiKey('claude');
            if (!hasExisting) {
                await this.setApiKey('claude', claudeKey);
                migrated = true;
                console.log('[ApiKeyManager] Migrated Claude API key from settings');
            }
        }

        // Migrate OpenAI key
        const openaiKey = config.get<string>('apiKeys.openai');
        if (openaiKey && openaiKey.length > 0) {
            const hasExisting = await this.hasApiKey('openai');
            if (!hasExisting) {
                await this.setApiKey('openai', openaiKey);
                migrated = true;
                console.log('[ApiKeyManager] Migrated OpenAI API key from settings');
            }
        }

        return migrated;
    }

    /**
     * Prompt user to clear old API keys from VS Code settings after migration
     */
    public async promptToClearOldSettings(): Promise<void> {
        const config = vscode.workspace.getConfiguration('multiAgentChat');
        const hasOldClaudeKey = config.get<string>('apiKeys.claude');
        const hasOldOpenaiKey = config.get<string>('apiKeys.openai');

        if (!hasOldClaudeKey && !hasOldOpenaiKey) {
            return; // Nothing to clear
        }

        const answer = await vscode.window.showWarningMessage(
            'API keys found in old settings. They have been migrated to secure storage. ' +
            'Would you like to clear them from settings.json?',
            'Yes, Clear Them',
            'No, Keep for Now',
            'Never Ask Again'
        );

        if (answer === 'Yes, Clear Them') {
            await this.clearOldSettings();
            vscode.window.showInformationMessage('Old API key settings cleared. Keys remain secure in SecretStorage.');
        } else if (answer === 'Never Ask Again') {
            await this.context.globalState.update('multiAgentChat.skipMigrationPrompt', true);
        }
    }

    /**
     * Clear API keys from old VS Code settings
     */
    private async clearOldSettings(): Promise<void> {
        const config = vscode.workspace.getConfiguration('multiAgentChat');
        await config.update('apiKeys.claude', undefined, vscode.ConfigurationTarget.Global);
        await config.update('apiKeys.openai', undefined, vscode.ConfigurationTarget.Global);
        console.log('[ApiKeyManager] Cleared old API key settings');
    }

    /**
     * Interactive setup for API keys
     */
    public async setupApiKeys(): Promise<void> {
        const providers: Array<'claude' | 'openai'> = ['claude', 'openai'];

        for (const provider of providers) {
            const hasKey = await this.hasApiKey(provider);
            const providerName = provider === 'claude' ? 'Claude (Anthropic)' : 'OpenAI';

            const action = hasKey
                ? await vscode.window.showQuickPick(
                    ['Keep Existing', 'Update', 'Delete', 'Skip'],
                    { placeHolder: `${providerName} API key is configured` }
                )
                : await vscode.window.showQuickPick(
                    ['Enter Key', 'Skip'],
                    { placeHolder: `${providerName} API key not found` }
                );

            if (action === 'Enter Key' || action === 'Update') {
                const key = await vscode.window.showInputBox({
                    prompt: `Enter ${providerName} API key`,
                    password: true,
                    placeHolder: provider === 'claude' ? 'sk-ant-...' : 'sk-...',
                    ignoreFocusOut: true
                });

                if (key && key.length > 0) {
                    await this.setApiKey(provider, key);
                    vscode.window.showInformationMessage(`${providerName} API key stored securely`);
                }
            } else if (action === 'Delete') {
                await this.deleteApiKey(provider);
                vscode.window.showInformationMessage(`${providerName} API key deleted`);
            }
        }
    }
}
