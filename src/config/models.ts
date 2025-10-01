/**
 * Centralized model configuration
 *
 * This file now provides utilities to access external model configurations
 * from defaults/models.json and .machat/models.json
 *
 * For adding new models, edit:
 * - Extension defaults: defaults/models.json
 * - Project-specific: .machat/models.json
 */

import { ConfigurationRegistry, ModelDefinition } from './ConfigurationRegistry';
import * as vscode from 'vscode';

export interface ModelOption {
    value: string;
    label: string;
}

/**
 * Get model options for a specific provider from the registry
 * @param providerId Provider ID (e.g., 'claude', 'openai', 'local')
 * @param context VS Code extension context
 * @returns Array of model options for dropdown/selection
 */
export async function getModelOptions(providerId: string, context: vscode.ExtensionContext): Promise<ModelOption[]> {
    const registry = ConfigurationRegistry.getInstance(context);

    // Load models if not already loaded
    try {
        await registry.loadModels();
    } catch (error) {
        console.error('[Models] Error loading model registry:', error);
        return getLegacyModelOptions(providerId);
    }

    const models = registry.getModelsForProvider(providerId);
    return models.map(m => ({
        value: m.id,
        label: m.displayName
    }));
}

/**
 * Get all model configurations from registry
 * @param context VS Code extension context
 * @returns Record of provider → model options
 */
export async function getAllModelConfigs(context: vscode.ExtensionContext): Promise<Record<string, ModelOption[]>> {
    const registry = ConfigurationRegistry.getInstance(context);

    try {
        await registry.loadModels();
    } catch (error) {
        console.error('[Models] Error loading model registry:', error);
        return MODEL_CONFIGS_LEGACY;
    }

    const providers = registry.getProviders();
    const configs: Record<string, ModelOption[]> = {};

    for (const [providerId, provider] of Object.entries(providers)) {
        configs[providerId] = provider.models.map(m => ({
            value: m.id,
            label: m.displayName
        }));
    }

    return configs;
}

/**
 * Get default model for a provider from registry
 * @param providerId Provider ID
 * @param context VS Code extension context
 * @returns Default model ID or fallback
 */
export async function getDefaultModel(providerId: string, context: vscode.ExtensionContext): Promise<string> {
    const registry = ConfigurationRegistry.getInstance(context);

    try {
        await registry.loadModels();
        const defaults = registry.getDefaultModel();

        if (defaults.provider === providerId) {
            return defaults.model;
        }

        // Get first model for this provider
        const models = registry.getModelsForProvider(providerId);
        return models.length > 0 ? models[0].id : DEFAULT_MODELS_LEGACY[providerId];
    } catch (error) {
        console.error('[Models] Error getting default model:', error);
        return DEFAULT_MODELS_LEGACY[providerId];
    }
}

// ===========================
// Legacy Fallbacks
// ===========================

/**
 * Legacy model configurations (fallback only)
 * Used if registry fails to load
 */
const MODEL_CONFIGS_LEGACY: Record<string, ModelOption[]> = {
    claude: [
        { value: 'claude-3-5-sonnet-latest', label: 'Claude 3.5 Sonnet (Latest)' },
        { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet (Oct 2024)' },
        { value: 'claude-3-opus-latest', label: 'Claude 3 Opus' },
        { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku' }
    ],
    openai: [
        { value: 'gpt-4o', label: 'GPT-4o' },
        { value: 'gpt-4-turbo-preview', label: 'GPT-4 Turbo' },
        { value: 'gpt-4', label: 'GPT-4' },
        { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' }
    ],
    local: [
        { value: 'llama-2', label: 'Llama 2' },
        { value: 'mistral', label: 'Mistral' },
        { value: 'custom', label: 'Custom Model' }
    ]
};

const DEFAULT_MODELS_LEGACY: Record<string, string> = {
    claude: 'claude-3-5-sonnet-latest',
    openai: 'gpt-4o',
    local: 'llama-2'
};

function getLegacyModelOptions(providerId: string): ModelOption[] {
    return MODEL_CONFIGS_LEGACY[providerId] || [];
}

// Export legacy configs for backward compatibility
export const MODEL_CONFIGS = MODEL_CONFIGS_LEGACY;
export const DEFAULT_MODELS = DEFAULT_MODELS_LEGACY;