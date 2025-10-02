import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Provider configuration loaded from defaults/providers.json
 */
export interface ProviderConfig {
    type: 'cli' | 'vscode-lm' | 'http';
    displayName: string;
    vendor: string;
    description: string;
    documentation?: string;
    supports: string[];
    dynamicDiscovery?: boolean;

    // CLI-specific
    command?: string;

    // HTTP-specific
    baseUrl?: string;
    chatEndpoint?: string;
    authHeader?: string;
    authFormat?: string;
    authMethod?: 'header' | 'query';
    authParam?: string;
    requestFormat?: string;
    responseFormat?: string;
}

export interface ProviderPreference {
    description: string;
    priority: string[];
}

export interface ProvidersManifest {
    version: string;
    lastUpdated: string;
    description: string;
    providerTypes: any;
    providers: Record<string, ProviderConfig>;
    preferences: Record<string, ProviderPreference>;
    defaults: {
        preference: string;
        fallbackBehavior: string;
    };
}

/**
 * Registry for loading and selecting providers based on user preferences
 */
export class ProviderRegistry {
    private static instance: ProviderRegistry;
    private manifest: ProvidersManifest | null = null;
    private extensionPath: string;

    private constructor(extensionPath: string) {
        this.extensionPath = extensionPath;
    }

    public static getInstance(extensionPath: string): ProviderRegistry {
        if (!ProviderRegistry.instance) {
            ProviderRegistry.instance = new ProviderRegistry(extensionPath);
        }
        return ProviderRegistry.instance;
    }

    /**
     * Load providers configuration from defaults/providers.json
     */
    public async loadProviders(): Promise<void> {
        try {
            const defaultProvidersPath = path.join(this.extensionPath, 'defaults', 'providers.json');

            if (!fs.existsSync(defaultProvidersPath)) {
                console.warn('[ProviderRegistry] defaults/providers.json not found, using legacy behavior');
                return;
            }

            const content = fs.readFileSync(defaultProvidersPath, 'utf-8');
            this.manifest = JSON.parse(content);
            console.log('[ProviderRegistry] Loaded provider configurations:', Object.keys(this.manifest!.providers));
        } catch (error) {
            console.error('[ProviderRegistry] Failed to load providers.json:', error);
        }
    }

    /**
     * Get provider configuration by ID
     */
    public getProviderConfig(providerId: string): ProviderConfig | null {
        if (!this.manifest) {
            return null;
        }
        return this.manifest.providers[providerId] || null;
    }

    /**
     * Get all available provider IDs
     */
    public getAvailableProviders(): string[] {
        if (!this.manifest) {
            return [];
        }
        return Object.keys(this.manifest.providers);
    }

    /**
     * Get provider priority based on user preference
     */
    public getProviderPriority(preference?: string): string[] {
        if (!this.manifest) {
            // Fallback to legacy behavior
            return ['claude-cli'];
        }

        const userPreference = preference || this.manifest.defaults.preference;
        const preferenceConfig = this.manifest.preferences[userPreference];

        if (!preferenceConfig) {
            console.warn(`[ProviderRegistry] Unknown preference '${userPreference}', using default`);
            return this.manifest.preferences[this.manifest.defaults.preference]?.priority || ['claude-cli'];
        }

        console.log(`[ProviderRegistry] Using provider preference '${userPreference}':`, preferenceConfig.priority);
        return preferenceConfig.priority;
    }

    /**
     * Select best available provider for a model based on preference
     */
    public async selectProvider(
        modelId: string,
        preference?: string
    ): Promise<{ providerId: string; config: ProviderConfig } | null> {
        if (!this.manifest) {
            // Legacy fallback
            return null;
        }

        const priority = this.getProviderPriority(preference);
        console.log(`[ProviderRegistry] Selecting provider for model '${modelId}' with priority:`, priority);

        for (const providerId of priority) {
            const config = this.getProviderConfig(providerId);

            if (!config) {
                console.warn(`[ProviderRegistry] Provider '${providerId}' not found in config`);
                continue;
            }

            // Check if provider supports this model
            if (config.dynamicDiscovery || config.supports.includes('*') || config.supports.includes(modelId)) {
                // Check if provider is available
                const isAvailable = await this.isProviderAvailable(providerId, config);

                if (isAvailable) {
                    console.log(`[ProviderRegistry] Selected provider '${providerId}' for model '${modelId}'`);
                    return { providerId, config };
                } else {
                    console.log(`[ProviderRegistry] Provider '${providerId}' not available, trying next...`);
                }
            } else {
                console.log(`[ProviderRegistry] Provider '${providerId}' does not support model '${modelId}'`);
            }
        }

        console.warn(`[ProviderRegistry] No available provider found for model '${modelId}'`);
        return null;
    }

    /**
     * Check if a provider is available/configured
     */
    private async isProviderAvailable(providerId: string, config: ProviderConfig): Promise<boolean> {
        switch (config.type) {
            case 'cli':
                // Check if CLI command exists
                return this.checkCliAvailable(config.command!);

            case 'vscode-lm':
                // Check if VS Code LM API has any models
                return this.checkVSCodeLMAvailable();

            case 'http':
                // Check if API key is configured
                return this.checkApiKeyConfigured(providerId);

            default:
                return false;
        }
    }

    /**
     * Check if CLI command is available
     */
    private async checkCliAvailable(command: string): Promise<boolean> {
        try {
            const { execSync } = require('child_process');
            const checkCommand = process.platform === 'win32'
                ? `where ${command}`
                : `which ${command}`;

            execSync(checkCommand, { stdio: 'ignore' });
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Check if VS Code Language Model API has any models available
     */
    private async checkVSCodeLMAvailable(): Promise<boolean> {
        try {
            // Try to get any available models
            const models = await vscode.lm.selectChatModels();
            return models.length > 0;
        } catch (error) {
            console.log('[ProviderRegistry] VS Code LM API not available or user denied consent:', error);
            return false;
        }
    }

    /**
     * Check if API key is configured for a provider
     */
    private async checkApiKeyConfigured(providerId: string): Promise<boolean> {
        // API key checking is done at provider instantiation time
        // The HTTP provider will fail gracefully with a helpful message if no key is configured
        // For CLI providers, we check if the command exists
        return false;
    }

    /**
     * Get human-readable description of provider preference
     */
    public getPreferenceDescription(preference: string): string {
        if (!this.manifest) {
            return 'Legacy behavior';
        }
        return this.manifest.preferences[preference]?.description || 'Unknown preference';
    }

    /**
     * List all available preferences
     */
    public getAvailablePreferences(): string[] {
        if (!this.manifest) {
            return ['claude-cli'];
        }
        return Object.keys(this.manifest.preferences);
    }
}
