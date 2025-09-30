/**
 * Centralized model configuration
 * Update this file when new models are released or deprecated
 */

export interface ModelOption {
    value: string;
    label: string;
}

export const MODEL_CONFIGS: Record<string, ModelOption[]> = {
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

// Default model per provider
export const DEFAULT_MODELS: Record<string, string> = {
    claude: 'claude-3-5-sonnet-latest',
    openai: 'gpt-4o',
    local: 'llama-2'
};