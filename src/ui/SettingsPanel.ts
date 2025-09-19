import * as vscode from 'vscode';
import { AgentConfig, defaultAgents } from '../agents';
import { MODEL_CONFIGS, DEFAULT_MODELS } from '../config/models';

export interface AgentSettings {
    model: string;
    provider: 'claude' | 'openai' | 'local' | 'mcp';
    systemPrompt?: string;
    temperature?: number;
    maxTokens?: number;
}

export interface SettingsData {
    apiKeys: {
        claude?: string;
        openai?: string;
    };
    agents: {
        [agentId: string]: AgentSettings;
    };
    projectAgents?: {
        [agentId: string]: AgentSettings;
    };
    useProjectSettings?: boolean;
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
            const hasProjectSettings = this.hasProjectConfig();

            let html = '<div class="settings-container">';

            // Settings Source Indicator
            if (hasProjectSettings) {
                html += `
                    <div class="settings-source-indicator">
                        <span>📁 Project settings active (.machat/config.json)</span>
                        <label style="margin-left: 20px;">
                            <input type="checkbox" id="use-project-settings"
                                ${settings.useProjectSettings !== false ? 'checked' : ''}
                                onchange="toggleProjectSettings(this.checked)" />
                            <span>Use project settings</span>
                        </label>
                    </div>
                `;
            }

            // API Keys Section
            html += this.renderApiKeysSection(settings);

            // Agent Definitions Section
            try {
                html += this.renderAgentDefinitionsSection(settings, hasProjectSettings);
            } catch (error) {
                console.error('Error rendering agent definitions:', error);
                html += '<div class="settings-section"><p>Error loading agent definitions: ' + error + '</p></div>';
            }

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

    private renderAgentDefinitionsSection(settings: SettingsData, hasProjectSettings: boolean): string {
        // Check if defaultAgents is available
        if (!defaultAgents || !Array.isArray(defaultAgents)) {
            console.error('defaultAgents is not available or not an array:', defaultAgents);
            return '<div class="settings-section"><p>Agent definitions not available</p></div>';
        }

        const agents = defaultAgents.filter(a => a.id !== 'team');
        const useProject = settings.useProjectSettings !== false && hasProjectSettings;
        const agentSettings = useProject && settings.projectAgents ? settings.projectAgents : settings.agents || {};

        let html = '<div class="settings-section">';
        html += '<h3>🤖 Agent Definitions</h3>';
        html += '<p style="color: var(--vscode-descriptionForeground); margin: 10px 0;">Configure each agent\'s model, provider, and behavior.';

        if (hasProjectSettings) {
            html += '<br><small>';
            html += useProject ? '📁 Using project-specific definitions' : '🌐 Using global definitions';
            html += '</small>';
        }

        html += '</p><div class="agents-grid">';

        for (const agent of agents) {
            const config = agentSettings[agent.id] || this.getDefaultAgentSettings(agent);
            const isInherited = useProject && settings.projectAgents && !settings.projectAgents[agent.id];

            // Build agent card HTML piece by piece to avoid template literal issues
            html += '<div class="agent-card" data-agent-id="' + agent.id + '">';
            html += '<div class="agent-header">';
            html += '<span class="agent-icon">' + agent.icon + '</span>';
            html += '<span class="agent-name">' + agent.name + '</span>';

            if (isInherited) {
                html += '<span class="inherited-badge">inherited</span>';
            }

            html += '</div>';
            html += '<div class="agent-config">';

            // Provider selection
            html += '<div class="config-row">';
            html += '<label>Provider:</label>';
            html += '<select id="provider-' + agent.id + '" onchange="updateModelOptions(\'' + agent.id + '\')">';
            html += '<option value="claude"' + (config.provider === 'claude' ? ' selected' : '') + '>Claude</option>';
            html += '<option value="mcp"' + (config.provider === 'mcp' ? ' selected' : '') + '>MCP (Claude)</option>';
            html += '<option value="openai"' + (config.provider === 'openai' ? ' selected' : '') + '>OpenAI</option>';
            html += '</select>';
            html += '</div>';

            // Model selection
            html += '<div class="config-row">';
            html += '<label>Model:</label>';
            html += '<select id="model-' + agent.id + '">';
            html += this.getModelOptions(config.provider, config.model);
            html += '</select>';
            html += '</div>';

            // Advanced settings (hidden by default)
            html += '<div class="config-row advanced" style="display: none;">';
            html += '<label>Temperature:</label>';
            html += '<input type="number" id="temp-' + agent.id + '" value="' + (config.temperature || 0.7) + '" min="0" max="2" step="0.1" style="width: 60px;" />';
            html += '</div>';

            html += '<div class="config-row advanced" style="display: none;">';
            html += '<label>Max Tokens:</label>';
            html += '<input type="number" id="tokens-' + agent.id + '" value="' + (config.maxTokens || 4000) + '" min="100" max="100000" step="100" style="width: 80px;" />';
            html += '</div>';

            // Advanced toggle button
            html += '<button class="toggle-advanced" onclick="toggleAdvanced(\'' + agent.id + '\')">⚙️ Advanced</button>';

            html += '</div>'; // Close agent-config
            html += '</div>'; // Close agent-card
        }

        html += '</div>'; // Close agents-grid
        html += '</div>'; // Close settings-section

        return html;
    }


    private hasProjectConfig(): boolean {
        // Check if .machat/config.json exists
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            return false;
        }

        const fs = require('fs');
        const path = require('path');
        const projectRoot = workspaceFolders[0].uri.fsPath;
        const configPath = path.join(projectRoot, '.machat', 'config.json');

        try {
            return fs.existsSync(configPath);
        } catch {
            return false;
        }
    }

    private getModelOptions(provider: string, selectedModel: string): string {
        const providerModels = MODEL_CONFIGS[provider] || MODEL_CONFIGS.claude;

        return providerModels.map(model =>
            `<option value="${model.value}" ${model.value === selectedModel ? 'selected' : ''}>
                ${model.label}
            </option>`
        ).join('');
    }

    private getDefaultAgentSettings(agent: AgentConfig): AgentSettings {
        const provider = agent.provider as string || 'claude';
        return {
            model: agent.model || DEFAULT_MODELS[provider] || 'claude-3-5-sonnet-latest',
            provider: provider as any,
            temperature: 0.7,
            maxTokens: 4000
        };
    }

    public loadSettings(): SettingsData {
        const config = vscode.workspace.getConfiguration('multiAgentChat');

        // Load global settings
        const globalSettings = this._context.globalState.get<SettingsData>('settings') || {};

        // Load project settings if available
        let projectSettings: any = {};
        if (this.hasProjectConfig()) {
            try {
                const fs = require('fs');
                const path = require('path');
                const workspaceFolders = vscode.workspace.workspaceFolders!;
                const projectRoot = workspaceFolders[0].uri.fsPath;
                const configPath = path.join(projectRoot, '.machat', 'config.json');
                const configContent = fs.readFileSync(configPath, 'utf8');
                const projectConfig = JSON.parse(configContent);
                projectSettings = projectConfig.agents ? { projectAgents: projectConfig.agents } : {};
            } catch (error) {
                console.error('Failed to load project config:', error);
            }
        }

        // Merge settings
        const defaultSettings: SettingsData = {
            apiKeys: {
                claude: config.get<string>('apiKeys.claude') || '',
                openai: config.get<string>('apiKeys.openai') || ''
            },
            agents: {},
            useProjectSettings: true
        };

        // Initialize default agent settings
        for (const agent of defaultAgents) {
            if (agent.id !== 'team') {
                defaultSettings.agents[agent.id] = this.getDefaultAgentSettings(agent);
            }
        }

        // Merge with saved and project settings
        return {
            ...defaultSettings,
            ...globalSettings,
            ...projectSettings
        };
    }

    public async saveSettings(settings: SettingsData): Promise<void> {
        // Save API keys to VS Code settings
        const config = vscode.workspace.getConfiguration('multiAgentChat');
        if (settings.apiKeys.claude) {
            await config.update('apiKeys.claude', settings.apiKeys.claude, vscode.ConfigurationTarget.Global);
        }
        if (settings.apiKeys.openai) {
            await config.update('apiKeys.openai', settings.apiKeys.openai, vscode.ConfigurationTarget.Global);
        }

        // Determine where to save agent settings
        if (settings.useProjectSettings && this.hasProjectConfig()) {
            // Save to project config
            try {
                const fs = require('fs');
                const path = require('path');
                const workspaceFolders = vscode.workspace.workspaceFolders!;
                const projectRoot = workspaceFolders[0].uri.fsPath;
                const configPath = path.join(projectRoot, '.machat', 'config.json');

                let projectConfig: any = {};
                if (fs.existsSync(configPath)) {
                    const content = fs.readFileSync(configPath, 'utf8');
                    projectConfig = JSON.parse(content);
                }

                // Update agent definitions
                projectConfig.agents = settings.agents;
                projectConfig.useProjectSettings = true;

                // Save back to file
                fs.writeFileSync(configPath, JSON.stringify(projectConfig, null, 2));
                vscode.window.showInformationMessage('📁 Project agent settings saved');
            } catch (error) {
                console.error('Failed to save project settings:', error);
                vscode.window.showErrorMessage('Failed to save project settings: ' + error);
            }
        } else {
            // Save to global state
            await this._context.globalState.update('settings', settings);
            vscode.window.showInformationMessage('🌐 Global agent settings saved');
        }

        // Notify about changes
        this._onSettingsChanged(settings);
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

            function toggleProjectSettings(useProject) {
                // Reload settings when toggling between global and project
                vscode.postMessage({
                    type: 'toggleProjectSettings',
                    useProject: useProject
                });
            }

            function toggleAdvanced(agentId) {
                const card = document.querySelector('[data-agent-id="' + agentId + '"]');
                const advancedRows = card.querySelectorAll('.advanced');
                const button = card.querySelector('.toggle-advanced');

                advancedRows.forEach(row => {
                    row.style.display = row.style.display === 'none' ? 'flex' : 'none';
                });

                button.textContent = advancedRows[0].style.display === 'none' ? '⚙️ Advanced' : '⚙️ Hide Advanced';
            }

            function updateModelOptions(agentId) {
                const providerSelect = document.getElementById('provider-' + agentId);
                const modelSelect = document.getElementById('model-' + agentId);
                const provider = providerSelect.value;

                // Update model options based on provider
                // Note: These models are defined in src/config/models.ts
                // Update that file when models change
                const models = {
                    claude: [
                        { value: 'claude-3-5-sonnet-latest', label: 'Claude 3.5 Sonnet (Latest)' },
                        { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet (Oct 2024)' },
                        { value: 'claude-3-opus-latest', label: 'Claude 3 Opus' },
                        { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku' }
                    ],
                    mcp: [
                        { value: 'claude-3-5-sonnet-latest', label: 'Claude 3.5 Sonnet (via MCP)' },
                        { value: 'claude-3-opus-latest', label: 'Claude 3 Opus (via MCP)' }
                    ],
                    openai: [
                        { value: 'gpt-4o', label: 'GPT-4o' },
                        { value: 'gpt-4-turbo-preview', label: 'GPT-4 Turbo' },
                        { value: 'gpt-4', label: 'GPT-4' },
                        { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' }
                    ]
                };

                const providerModels = models[provider] || models.claude;
                modelSelect.innerHTML = providerModels.map(model =>
                    '<option value="' + model.value + '">' + model.label + '</option>'
                ).join('');
            }

            function gatherSettings() {
                const useProjectCheckbox = document.getElementById('use-project-settings');
                const useProject = useProjectCheckbox ? useProjectCheckbox.checked : false;

                const settings = {
                    apiKeys: {
                        claude: document.getElementById('claude-api-key').value,
                        openai: document.getElementById('openai-api-key').value
                    },
                    agents: {},
                    useProjectSettings: useProject
                };

                // Gather agent settings
                const agentCards = document.querySelectorAll('.agent-card');
                agentCards.forEach(card => {
                    const agentId = card.getAttribute('data-agent-id');
                    const tempInput = document.getElementById('temp-' + agentId);
                    const tokensInput = document.getElementById('tokens-' + agentId);

                    settings.agents[agentId] = {
                        model: document.getElementById('model-' + agentId).value,
                        provider: document.getElementById('provider-' + agentId).value,
                        temperature: tempInput ? parseFloat(tempInput.value) : 0.7,
                        maxTokens: tokensInput ? parseInt(tokensInput.value) : 4000
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