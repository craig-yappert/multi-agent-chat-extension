import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export interface AgentSettings {
    model?: string;
    provider?: string;
    permissions?: {
        fileWrite?: boolean;
        commandExecution?: boolean;
    };
    customPrompt?: string;
    temperature?: number;
}

export interface ProjectSettings {
    projectName?: string;
    agents?: Record<string, AgentSettings>;
    features?: {
        autoLoadContext?: boolean;
        shareConversations?: boolean;
    };
    context?: {
        includeFiles?: string[];
        excludePatterns?: string[];
    };
}

export interface GlobalSettings {
    apiKeys?: {
        claude?: string;
        openai?: string;
    };
    globalOptions?: {
        yoloMode?: boolean;
        defaultPermission?: 'ask' | 'allow' | 'deny';
    };
    defaultModel?: string;
    defaultProvider?: string;
}

export interface Settings extends GlobalSettings, ProjectSettings {
    activeAgents?: string[];
    defaultAgent?: string;
}

export class SettingsManager {
    private static instance: SettingsManager;
    private globalSettings: GlobalSettings = {};
    private projectSettings: ProjectSettings = {};
    private workspaceSettings: Settings = {};
    private cachedSettings: Settings = {};
    private projectRoot: string | undefined;
    private machatPath: string | undefined;

    private constructor(private context: vscode.ExtensionContext) {}

    public static getInstance(context: vscode.ExtensionContext): SettingsManager {
        if (!SettingsManager.instance) {
            SettingsManager.instance = new SettingsManager(context);
        }
        return SettingsManager.instance;
    }

    public async initialize(): Promise<void> {
        // Determine project root
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders && workspaceFolders.length > 0) {
            this.projectRoot = workspaceFolders[0].uri.fsPath;
            this.machatPath = path.join(this.projectRoot, '.machat');
        }

        await this.loadSettings();
    }

    public async loadSettings(): Promise<Settings> {
        // 1. Load VS Code settings
        const vscodeSettings = this.loadVSCodeSettings();

        // 2. Load global extension settings
        this.globalSettings = await this.loadGlobalSettings();

        // 3. Load project settings if available
        if (this.machatPath) {
            const configPath = path.join(this.machatPath, 'config.json');
            if (await this.fileExists(configPath)) {
                this.projectSettings = await this.loadProjectSettings(configPath);
            }
        }

        // 4. Load workspace settings
        this.workspaceSettings = this.loadWorkspaceSettings();

        // 5. Merge settings with proper hierarchy
        this.cachedSettings = this.mergeSettings(
            vscodeSettings,
            this.globalSettings,
            this.projectSettings,
            this.workspaceSettings
        );

        return this.cachedSettings;
    }

    private loadVSCodeSettings(): Settings {
        const config = vscode.workspace.getConfiguration('multiAgentChat');
        return {
            apiKeys: {
                claude: config.get('apiKeys.claude'),
                openai: config.get('apiKeys.openai')
            },
            defaultModel: config.get('defaultModel'),
            defaultProvider: config.get('defaultProvider'),
            globalOptions: {
                yoloMode: config.get('permissions.yoloMode'),
                defaultPermission: config.get('permissions.defaultPolicy')
            },
            defaultAgent: config.get('agents.defaultAgent'),
            activeAgents: config.get('agents.activeAgents'),
            features: {
                autoLoadContext: config.get('project.autoInitialize'),
                shareConversations: config.get('project.useLocalStorage')
            }
        };
    }

    private async loadGlobalSettings(): Promise<GlobalSettings> {
        try {
            const globalSettings = this.context.globalState.get<GlobalSettings>('multiagent.globalSettings');
            return globalSettings || {};
        } catch (error) {
            console.error('Failed to load global settings:', error);
            return {};
        }
    }

    private async loadProjectSettings(configPath: string): Promise<ProjectSettings> {
        try {
            const content = await fs.promises.readFile(configPath, 'utf-8');
            return JSON.parse(content) as ProjectSettings;
        } catch (error) {
            console.error('Failed to load project settings:', error);
            return {};
        }
    }

    private loadWorkspaceSettings(): Settings {
        try {
            const workspaceConfig = vscode.workspace.getConfiguration('machat');
            return {
                activeAgents: workspaceConfig.get('activeAgents'),
                defaultAgent: workspaceConfig.get('defaultAgent')
            };
        } catch (error) {
            console.error('Failed to load workspace settings:', error);
            return {};
        }
    }

    private mergeSettings(...settingsArray: Settings[]): Settings {
        const merged: Settings = {};

        // Merge in order of precedence (later overwrites earlier)
        for (const settings of settingsArray) {
            if (!settings) continue;

            // Deep merge for nested objects
            if (settings.apiKeys) {
                merged.apiKeys = { ...merged.apiKeys, ...settings.apiKeys };
            }
            if (settings.globalOptions) {
                merged.globalOptions = { ...merged.globalOptions, ...settings.globalOptions };
            }
            if (settings.agents) {
                merged.agents = { ...merged.agents, ...settings.agents };
            }
            if (settings.features) {
                merged.features = { ...merged.features, ...settings.features };
            }
            if (settings.context) {
                merged.context = { ...merged.context, ...settings.context };
            }

            // Simple properties
            if (settings.defaultModel !== undefined) merged.defaultModel = settings.defaultModel;
            if (settings.defaultProvider !== undefined) merged.defaultProvider = settings.defaultProvider;
            if (settings.projectName !== undefined) merged.projectName = settings.projectName;
            if (settings.activeAgents !== undefined) merged.activeAgents = settings.activeAgents;
            if (settings.defaultAgent !== undefined) merged.defaultAgent = settings.defaultAgent;
        }

        return merged;
    }

    public async saveGlobalSettings(settings: GlobalSettings): Promise<void> {
        await this.context.globalState.update('multiagent.globalSettings', settings);
        this.globalSettings = settings;
        await this.loadSettings(); // Refresh cached settings
    }

    public async saveProjectSettings(settings: ProjectSettings): Promise<void> {
        if (!this.machatPath) {
            throw new Error('No project root available');
        }

        await this.ensureDirectoryExists(this.machatPath);
        const configPath = path.join(this.machatPath, 'config.json');

        await fs.promises.writeFile(
            configPath,
            JSON.stringify(settings, null, 2),
            'utf-8'
        );

        this.projectSettings = settings;
        await this.loadSettings(); // Refresh cached settings
    }

    public getSettings(): Settings {
        return this.cachedSettings;
    }

    public getProjectRoot(): string | undefined {
        return this.projectRoot;
    }

    public getMachatPath(): string | undefined {
        return this.machatPath;
    }

    public async ensureMachatStructure(): Promise<void> {
        if (!this.machatPath) {
            throw new Error('No project root available');
        }

        // Create main .machat directory
        await this.ensureDirectoryExists(this.machatPath);

        // Create subdirectories
        const subdirs = [
            'conversations',
            'agents',
            'agents/agent-prompts',
            'context',
            'context/knowledge-base'
        ];

        for (const subdir of subdirs) {
            await this.ensureDirectoryExists(path.join(this.machatPath, subdir));
        }

        // Create .gitignore if it doesn't exist
        const gitignorePath = path.join(this.machatPath, '.gitignore');
        if (!await this.fileExists(gitignorePath)) {
            const gitignoreContent = `# API Keys (never commit)
config.json

# Conversations (may contain sensitive data)
conversations/

# Agent memory (may contain project secrets)
context/agent-memory.json

# Allow these to be shared
!agents/
!context/project-context.md
!context/knowledge-base/
`;
            await fs.promises.writeFile(gitignorePath, gitignoreContent, 'utf-8');
        }

        // Create default config.json if it doesn't exist
        const configPath = path.join(this.machatPath, 'config.json');
        if (!await this.fileExists(configPath)) {
            const defaultConfig: ProjectSettings = {
                projectName: path.basename(this.projectRoot || ''),
                agents: {},
                features: {
                    autoLoadContext: true,
                    shareConversations: false
                },
                context: {
                    includeFiles: [],
                    excludePatterns: ['**/node_modules/**', '**/.git/**']
                }
            };
            await this.saveProjectSettings(defaultConfig);
        }

        console.log(`Ensured .machat structure at: ${this.machatPath}`);
    }

    private async ensureDirectoryExists(dirPath: string): Promise<void> {
        try {
            await fs.promises.access(dirPath);
        } catch {
            await fs.promises.mkdir(dirPath, { recursive: true });
        }
    }

    private async fileExists(filePath: string): Promise<boolean> {
        try {
            await fs.promises.access(filePath);
            return true;
        } catch {
            return false;
        }
    }

    public async getApiKey(provider: 'claude' | 'openai' = 'claude'): Promise<string | undefined> {
        const settings = this.getSettings();
        return settings.apiKeys?.[provider];
    }

    public async getAgentSettings(agentName: string): Promise<AgentSettings | undefined> {
        const settings = this.getSettings();
        return settings.agents?.[agentName];
    }

    public isYoloMode(): boolean {
        const settings = this.getSettings();
        return settings.globalOptions?.yoloMode || false;
    }

    public getDefaultPermission(): 'ask' | 'allow' | 'deny' {
        const settings = this.getSettings();
        return settings.globalOptions?.defaultPermission || 'ask';
    }
}