import * as vscode from 'vscode';
import { AgentConfig, defaultAgents } from '../agents';

export interface SettingsData {
    apiKeys: {
        claude?: string;
        openai?: string;
    };
    agents: {
        [agentId: string]: {
            model: string;
            provider: 'claude' | 'openai' | 'local' | 'mcp';
            permissions: {
                fileWrite: boolean;
                commandExecution: boolean;
            };
            customPrompt?: string;
        };
    };
    global: {
        yoloMode: boolean;
        defaultPermission: 'ask' | 'allow' | 'deny';
    };
}

export class SettingsPanel {
    private _context: vscode.ExtensionContext;
    private _onSettingsChanged: (settings: SettingsData) => void;

    constructor(
        context: vscode.ExtensionContext,
        onSettingsChanged: (settings: SettingsData) => void
    ) {
        this._context = context;
        this._onSettingsChanged = onSettingsChanged;
    }

    public getHtml(): string {
        try {
            const settings = this.loadSettings();

            // Build HTML in parts to avoid truncation
            let html = '<div class="settings-container">';
            html += '<h2>⚙️ Settings</h2>';

            // API Keys Section
            html += this.renderApiKeysSection(settings);

            // Simplified agents section for now
            html += this.renderSimplifiedAgentsSection(settings);

            // Global settings
            html += this.renderGlobalSection(settings);

            // Footer
            html += `
                <div class="settings-footer">
                    <button onclick="saveSettings()" class="save-btn">💾 Save Settings</button>
                    <button onclick="closeSettings()" class="cancel-btn">Cancel</button>
                </div>
            `;

            html += '</div>';

            return html;
        } catch (error) {
            console.error('Error generating settings HTML:', error);
            return `
                <div class="settings-container">
                    <h2>⚙️ Settings</h2>
                    <div class="settings-section">
                        <p style="color: var(--vscode-errorForeground);">Error loading settings: ${error}</p>
                    </div>
                </div>
            `;
        }
    }

    private renderApiKeysSection(settings: SettingsData): string {
        return `
            <div class="settings-section">
                <h3>🔑 API Keys</h3>
                <div class="settings-group">
                    <div class="setting-item">
                        <label for="claude-api-key">Claude API Key:</label>
                        <div class="api-key-input">
                            <input
                                type="password"
                                id="claude-api-key"
                                value="${settings.apiKeys.claude || ''}"
                                placeholder="sk-ant-..."
                                data-visible="false"
                            />
                            <button onclick="toggleKeyVisibility('claude-api-key')" class="toggle-visibility">
                                👁️
                            </button>
                        </div>
                    </div>

                    <div class="setting-item">
                        <label for="openai-api-key">OpenAI API Key (Optional):</label>
                        <div class="api-key-input">
                            <input
                                type="password"
                                id="openai-api-key"
                                value="${settings.apiKeys.openai || ''}"
                                placeholder="sk-..."
                                data-visible="false"
                            />
                            <button onclick="toggleKeyVisibility('openai-api-key')" class="toggle-visibility">
                                👁️
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    private renderSimplifiedAgentsSection(settings: SettingsData): string {
        return `
            <div class="settings-section">
                <h3>🤖 Agent Configuration</h3>
                <div style="padding: 10px;">
                    <p style="color: var(--vscode-descriptionForeground);">
                        Select default models for each agent:
                    </p>
                    <div style="margin-top: 10px;">
                        <label>Executor Agent:</label>
                        <select id="executor-model" style="margin-left: 10px;">
                            <option value="sonnet">Claude 3.5 Sonnet</option>
                            <option value="opus">Claude 3 Opus</option>
                        </select>
                    </div>
                    <div style="margin-top: 10px;">
                        <label>Architect Agent:</label>
                        <select id="architect-model" style="margin-left: 10px;">
                            <option value="sonnet">Claude 3.5 Sonnet</option>
                            <option value="opus">Claude 3 Opus</option>
                        </select>
                    </div>
                </div>
            </div>
        `;
    }

    private renderAgentsSection(settings: SettingsData): string {
        console.log('Rendering agents section, defaultAgents:', defaultAgents);
        const agents = defaultAgents.filter(a => a.id !== 'team'); // Exclude team agent
        console.log('Filtered agents:', agents);

        let html = `
            <div class="settings-section">
                <h3>🤖 Agent Configuration</h3>
                <div class="agents-container">
        `;

        for (const agent of agents) {
            const agentSettings = settings.agents[agent.id] || this.getDefaultAgentSettings(agent);

            html += `
                <div class="agent-config" data-agent-id="${agent.id}">
                    <div class="agent-header">
                        <span class="agent-icon">${agent.icon}</span>
                        <span class="agent-name">${agent.name}</span>
                    </div>

                    <div class="agent-settings">
                        <div class="setting-row">
                            <label>Model:</label>
                            <select id="model-${agent.id}" class="model-select">
                                ${this.getModelOptions(agentSettings.provider, agentSettings.model)}
                            </select>
                        </div>

                        <div class="setting-row">
                            <label>Provider:</label>
                            <select id="provider-${agent.id}" class="provider-select"
                                    onchange="updateModelOptions('${agent.id}')">
                                <option value="claude" ${agentSettings.provider === 'claude' ? 'selected' : ''}>Claude</option>
                                <option value="openai" ${agentSettings.provider === 'openai' ? 'selected' : ''}>OpenAI</option>
                                <option value="local" ${agentSettings.provider === 'local' ? 'selected' : ''}>Local</option>
                            </select>
                        </div>

                        <div class="setting-row">
                            <label>Permissions:</label>
                            <div class="permissions">
                                <label class="checkbox-label">
                                    <input type="checkbox"
                                           id="filewrite-${agent.id}"
                                           ${agentSettings.permissions.fileWrite ? 'checked' : ''} />
                                    File Write
                                </label>
                                <label class="checkbox-label">
                                    <input type="checkbox"
                                           id="commands-${agent.id}"
                                           ${agentSettings.permissions.commandExecution ? 'checked' : ''} />
                                    Commands
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        html += `
                </div>
            </div>
        `;

        return html;
    }

    private renderGlobalSection(settings: SettingsData): string {
        const yoloChecked = settings.global?.yoloMode ? 'checked' : '';
        const defaultPerm = settings.global?.defaultPermission || 'ask';

        return `
            <div class="settings-section">
                <h3>⚙️ Global Options</h3>
                <div style="padding: 10px;">
                    <div style="margin-bottom: 10px;">
                        <label>
                            <input type="checkbox" id="yolo-mode" ${yoloChecked} />
                            <span style="margin-left: 8px;">⚡ YOLO Mode</span>
                            <span style="font-size: 12px; color: var(--vscode-descriptionForeground); margin-left: 8px;">
                                (Auto-approve all permissions)
                            </span>
                        </label>
                    </div>

                    <div>
                        <label for="default-permission">Default Permission:</label>
                        <select id="default-permission" style="margin-left: 10px;">
                            <option value="ask" ${defaultPerm === 'ask' ? 'selected' : ''}>Always Ask</option>
                            <option value="allow" ${defaultPerm === 'allow' ? 'selected' : ''}>Allow by Default</option>
                            <option value="deny" ${defaultPerm === 'deny' ? 'selected' : ''}>Deny by Default</option>
                        </select>
                    </div>
                </div>
            </div>
        `;
    }

    private getModelOptions(provider: string, selectedModel: string): string {
        const models = {
            claude: [
                { value: 'sonnet', label: 'Claude 3.5 Sonnet' },
                { value: 'opus', label: 'Claude 3 Opus' },
                { value: 'haiku', label: 'Claude 3 Haiku' }
            ],
            openai: [
                { value: 'gpt-4', label: 'GPT-4' },
                { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
                { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' }
            ],
            local: [
                { value: 'llama', label: 'Llama 2' },
                { value: 'mistral', label: 'Mistral' },
                { value: 'custom', label: 'Custom Model' }
            ]
        };

        const providerModels = models[provider as keyof typeof models] || models.claude;

        return providerModels.map(model =>
            `<option value="${model.value}" ${model.value === selectedModel ? 'selected' : ''}>
                ${model.label}
            </option>`
        ).join('');
    }

    private getDefaultAgentSettings(agent: AgentConfig): any {
        return {
            model: agent.model || 'sonnet',
            provider: agent.provider as string || 'claude',
            permissions: {
                fileWrite: agent.id === 'executor',
                commandExecution: agent.id === 'executor'
            }
        };
    }

    public loadSettings(): SettingsData {
        const config = vscode.workspace.getConfiguration('multiAgentChat');

        // Load saved settings or return defaults
        const savedSettings = this._context.globalState.get<SettingsData>('settings');

        if (savedSettings) {
            return savedSettings;
        }

        // Return default settings
        const defaultSettings: SettingsData = {
            apiKeys: {
                claude: config.get<string>('apiKey') || '',
                openai: ''
            },
            agents: {},
            global: {
                yoloMode: false,
                defaultPermission: 'ask'
            }
        };

        // Initialize agent defaults
        for (const agent of defaultAgents) {
            if (agent.id !== 'team') {
                defaultSettings.agents[agent.id] = this.getDefaultAgentSettings(agent);
            }
        }

        return defaultSettings;
    }

    public async saveSettings(settings: SettingsData): Promise<void> {
        // Save to global state
        await this._context.globalState.update('settings', settings);

        // Update VS Code configuration for API key
        const config = vscode.workspace.getConfiguration('multiAgentChat');
        if (settings.apiKeys.claude) {
            await config.update('apiKey', settings.apiKeys.claude, vscode.ConfigurationTarget.Global);
        }

        // Notify about changes
        this._onSettingsChanged(settings);

        vscode.window.showInformationMessage('Settings saved successfully');
    }

    public getScript(): string {
        return `
            function toggleKeyVisibility(inputId) {
                const input = document.getElementById(inputId);
                const isVisible = input.getAttribute('data-visible') === 'true';

                if (isVisible) {
                    input.type = 'password';
                    input.setAttribute('data-visible', 'false');
                } else {
                    input.type = 'text';
                    input.setAttribute('data-visible', 'true');
                }
            }

            function updateModelOptions(agentId) {
                const providerSelect = document.getElementById('provider-' + agentId);
                const modelSelect = document.getElementById('model-' + agentId);
                const provider = providerSelect.value;

                // Update model options based on provider
                const models = {
                    claude: [
                        { value: 'sonnet', label: 'Claude 3.5 Sonnet' },
                        { value: 'opus', label: 'Claude 3 Opus' },
                        { value: 'haiku', label: 'Claude 3 Haiku' }
                    ],
                    openai: [
                        { value: 'gpt-4', label: 'GPT-4' },
                        { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
                        { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' }
                    ],
                    local: [
                        { value: 'llama', label: 'Llama 2' },
                        { value: 'mistral', label: 'Mistral' },
                        { value: 'custom', label: 'Custom Model' }
                    ]
                };

                const providerModels = models[provider] || models.claude;
                modelSelect.innerHTML = providerModels.map(model =>
                    '<option value="' + model.value + '">' + model.label + '</option>'
                ).join('');
            }

            function gatherSettings() {
                const settings = {
                    apiKeys: {
                        claude: document.getElementById('claude-api-key').value,
                        openai: document.getElementById('openai-api-key').value
                    },
                    agents: {},
                    global: {
                        yoloMode: document.getElementById('yolo-mode').checked,
                        defaultPermission: document.getElementById('default-permission').value
                    }
                };

                // Gather agent settings
                const agentConfigs = document.querySelectorAll('.agent-config');
                agentConfigs.forEach(config => {
                    const agentId = config.getAttribute('data-agent-id');
                    settings.agents[agentId] = {
                        model: document.getElementById('model-' + agentId).value,
                        provider: document.getElementById('provider-' + agentId).value,
                        permissions: {
                            fileWrite: document.getElementById('filewrite-' + agentId).checked,
                            commandExecution: document.getElementById('commands-' + agentId).checked
                        }
                    };
                });

                return settings;
            }

            function saveSettings() {
                const settings = gatherSettings();
                vscode.postMessage({
                    type: 'saveSettings',
                    settings: settings
                });
            }

            function closeSettings() {
                vscode.postMessage({
                    type: 'closeSettings'
                });
            }
        `;
    }
}