/**
 * Configuration Registry
 * Manages loading of external model and agent configurations
 * with project-specific overrides
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

// ===========================
// Model Configuration Types
// ===========================

export interface ModelDefinition {
	id: string;
	displayName: string;
	description?: string;
	contextWindow?: number;
	maxOutput?: number;
	capabilities?: string[];
	tags?: string[];
	pricing?: {
		input: number;
		output: number;
	};
}

export interface ProviderModels {
	displayName: string;
	models: ModelDefinition[];
}

export interface ModelRegistry {
	version: string;
	lastUpdated?: string;
	description?: string;
	projectType?: string;
	providers: Record<string, ProviderModels>;
	defaults: {
		provider: string;
		model: string;
	};
	notes?: string;
}

// ===========================
// Agent Configuration Types
// ===========================

export interface AgentDefinition {
	id: string;
	name: string;
	role: string;
	description: string;
	icon: string;
	color: string;
	enabled: boolean;
	capabilities: string[];
	specializations: string[];
	provider: string;
	model: string;
	systemPrompt: string;
	notes?: string;
}

export interface AgentRegistry {
	version: string;
	lastUpdated?: string;
	description?: string;
	projectType?: string;
	agents: AgentDefinition[];
	notes?: string;
}

// ===========================
// Configuration Registry
// ===========================

export class ConfigurationRegistry {
	private static instance: ConfigurationRegistry;
	private modelRegistry: ModelRegistry | null = null;
	private agentRegistry: AgentRegistry | null = null;

	private constructor(
		private context: vscode.ExtensionContext
	) {}

	static getInstance(context: vscode.ExtensionContext): ConfigurationRegistry {
		if (!ConfigurationRegistry.instance) {
			ConfigurationRegistry.instance = new ConfigurationRegistry(context);
		}
		return ConfigurationRegistry.instance;
	}

	/**
	 * Load model registry with fallback hierarchy:
	 * 1. .machat/models.json (project-specific)
	 * 2. defaults/models.json (bundled)
	 */
	async loadModels(): Promise<ModelRegistry> {
		// Try project-specific first
		const projectPath = this.getProjectConfigPath('models.json');
		if (projectPath && fs.existsSync(projectPath)) {
			console.log('[ConfigRegistry] Loading project models from:', projectPath);
			try {
				this.modelRegistry = this.loadJsonFile<ModelRegistry>(projectPath);
				return this.modelRegistry!;
			} catch (error) {
				console.error('[ConfigRegistry] Error loading project models:', error);
				console.log('[ConfigRegistry] Falling back to defaults');
			}
		}

		// Fallback to bundled defaults
		console.log('[ConfigRegistry] Loading default models from extension bundle');
		const defaultPath = path.join(this.context.extensionPath, 'defaults', 'models.json');
		this.modelRegistry = this.loadJsonFile<ModelRegistry>(defaultPath);
		return this.modelRegistry!;
	}

	/**
	 * Get models for specific provider
	 */
	getModelsForProvider(providerId: string): ModelDefinition[] {
		if (!this.modelRegistry) {
			throw new Error('Model registry not loaded. Call loadModels() first.');
		}
		return this.modelRegistry.providers[providerId]?.models || [];
	}

	/**
	 * Get all providers
	 */
	getProviders(): Record<string, ProviderModels> {
		if (!this.modelRegistry) {
			throw new Error('Model registry not loaded. Call loadModels() first.');
		}
		return this.modelRegistry.providers;
	}

	/**
	 * Get default model
	 */
	getDefaultModel(): { provider: string; model: string } {
		if (!this.modelRegistry) {
			throw new Error('Model registry not loaded. Call loadModels() first.');
		}
		return this.modelRegistry.defaults;
	}

	/**
	 * Get specific model by ID across all providers
	 */
	getModelById(modelId: string): ModelDefinition | undefined {
		if (!this.modelRegistry) {
			throw new Error('Model registry not loaded. Call loadModels() first.');
		}

		for (const provider of Object.values(this.modelRegistry.providers)) {
			const model = provider.models.find(m => m.id === modelId);
			if (model) {
				return model;
			}
		}
		return undefined;
	}

	/**
	 * Check if project has custom model configuration
	 */
	hasProjectModels(): boolean {
		const projectPath = this.getProjectConfigPath('models.json');
		return projectPath !== null && fs.existsSync(projectPath);
	}

	/**
	 * Initialize project with default models
	 * Called when user runs "Initialize Multi Agent Chat Project"
	 */
	async initializeProjectModels(): Promise<void> {
		const projectFolder = this.getProjectFolder();
		if (!projectFolder) {
			throw new Error('No workspace folder open');
		}

		const machatPath = path.join(projectFolder, '.machat');
		if (!fs.existsSync(machatPath)) {
			fs.mkdirSync(machatPath, { recursive: true });
		}

		// Copy default models to project
		const defaultModelsPath = path.join(this.context.extensionPath, 'defaults', 'models.json');
		const projectModelsPath = path.join(machatPath, 'models.json');

		if (fs.existsSync(projectModelsPath)) {
			console.log('[ConfigRegistry] Project models.json already exists, skipping initialization');
			return;
		}

		fs.copyFileSync(defaultModelsPath, projectModelsPath);
		console.log('[ConfigRegistry] Initialized project models.json');
	}

	/**
	 * Reset project models to defaults (overwrite)
	 */
	async resetProjectModels(): Promise<void> {
		const projectFolder = this.getProjectFolder();
		if (!projectFolder) {
			throw new Error('No workspace folder open');
		}

		const machatPath = path.join(projectFolder, '.machat');
		if (!fs.existsSync(machatPath)) {
			fs.mkdirSync(machatPath, { recursive: true });
		}

		// Overwrite with defaults
		const defaultModelsPath = path.join(this.context.extensionPath, 'defaults', 'models.json');
		const projectModelsPath = path.join(machatPath, 'models.json');

		fs.copyFileSync(defaultModelsPath, projectModelsPath);
		console.log('[ConfigRegistry] Reset project models.json to defaults');

		// Reload
		await this.loadModels();
	}

	/**
	 * Open project models.json in editor
	 */
	async openModelsConfig(): Promise<void> {
		const projectFolder = this.getProjectFolder();
		if (!projectFolder) {
			vscode.window.showErrorMessage('No workspace folder open');
			return;
		}

		const modelsPath = path.join(projectFolder, '.machat', 'models.json');

		// Create if doesn't exist
		if (!fs.existsSync(modelsPath)) {
			await this.initializeProjectModels();
		}

		// Open in editor
		const document = await vscode.workspace.openTextDocument(modelsPath);
		await vscode.window.showTextDocument(document);
	}

	/**
	 * Reload models from disk
	 */
	async reloadModels(): Promise<void> {
		await this.loadModels();
		console.log('[ConfigRegistry] Reloaded model configuration');
	}

	// ===========================
	// Agent Configuration Methods
	// ===========================

	/**
	 * Load agent registry with smart merging:
	 * 1. Start with defaults/agents.json (bundled)
	 * 2. Apply overrides from .machat/agents.json (if exists)
	 */
	async loadAgents(): Promise<AgentRegistry> {
		// Always start with defaults
		const defaultPath = path.join(this.context.extensionPath, 'defaults', 'agents.json');
		const defaultAgents = this.loadJsonFile<AgentRegistry>(defaultPath);

		// Check for project overrides
		const projectPath = this.getProjectConfigPath('agents.json');
		if (!projectPath || !fs.existsSync(projectPath)) {
			console.log('[ConfigRegistry] Using default agents (no project overrides)');
			this.agentRegistry = defaultAgents;
			return this.agentRegistry!;
		}

		// Merge project overrides with defaults
		console.log('[ConfigRegistry] Merging project agent overrides from:', projectPath);
		try {
			const projectOverrides = this.loadJsonFile<AgentRegistry>(projectPath);
			this.agentRegistry = this.mergeAgentConfigs(defaultAgents, projectOverrides);
			return this.agentRegistry!;
		} catch (error) {
			console.error('[ConfigRegistry] Error loading project agents:', error);
			console.log('[ConfigRegistry] Falling back to defaults');
			this.agentRegistry = defaultAgents;
			return this.agentRegistry!;
		}
	}

	/**
	 * Get all active agents (enabled: true)
	 */
	getActiveAgents(): AgentDefinition[] {
		if (!this.agentRegistry) {
			throw new Error('Agent registry not loaded. Call loadAgents() first.');
		}
		return this.agentRegistry.agents.filter(a => a.enabled !== false);
	}

	/**
	 * Get specific agent by ID
	 */
	getAgent(agentId: string): AgentDefinition | undefined {
		if (!this.agentRegistry) {
			throw new Error('Agent registry not loaded. Call loadAgents() first.');
		}
		return this.agentRegistry.agents.find(a => a.id === agentId);
	}

	/**
	 * Check if project has custom agent configuration
	 */
	hasProjectAgents(): boolean {
		const projectPath = this.getProjectConfigPath('agents.json');
		return projectPath !== null && fs.existsSync(projectPath);
	}

	/**
	 * Initialize project with default agents
	 */
	async initializeProjectAgents(): Promise<void> {
		const projectFolder = this.getProjectFolder();
		if (!projectFolder) {
			throw new Error('No workspace folder open');
		}

		const machatPath = path.join(projectFolder, '.machat');
		if (!fs.existsSync(machatPath)) {
			fs.mkdirSync(machatPath, { recursive: true });
		}

		// Copy default agents to project
		const defaultAgentsPath = path.join(this.context.extensionPath, 'defaults', 'agents.json');
		const projectAgentsPath = path.join(machatPath, 'agents.json');

		if (fs.existsSync(projectAgentsPath)) {
			console.log('[ConfigRegistry] Project agents.json already exists, skipping initialization');
			return;
		}

		fs.copyFileSync(defaultAgentsPath, projectAgentsPath);
		console.log('[ConfigRegistry] Initialized project agents.json');
	}

	/**
	 * Reset project agents to defaults (overwrite)
	 */
	async resetProjectAgents(): Promise<void> {
		const projectFolder = this.getProjectFolder();
		if (!projectFolder) {
			throw new Error('No workspace folder open');
		}

		const machatPath = path.join(projectFolder, '.machat');
		if (!fs.existsSync(machatPath)) {
			fs.mkdirSync(machatPath, { recursive: true });
		}

		// Overwrite with defaults
		const defaultAgentsPath = path.join(this.context.extensionPath, 'defaults', 'agents.json');
		const projectAgentsPath = path.join(machatPath, 'agents.json');

		fs.copyFileSync(defaultAgentsPath, projectAgentsPath);
		console.log('[ConfigRegistry] Reset project agents.json to defaults');

		// Reload
		await this.loadAgents();
	}

	/**
	 * Open project agents.json in editor
	 */
	async openAgentsConfig(): Promise<void> {
		const projectFolder = this.getProjectFolder();
		if (!projectFolder) {
			vscode.window.showErrorMessage('No workspace folder open');
			return;
		}

		const agentsPath = path.join(projectFolder, '.machat', 'agents.json');

		// Create if doesn't exist
		if (!fs.existsSync(agentsPath)) {
			await this.initializeProjectAgents();
		}

		// Open in editor
		const document = await vscode.workspace.openTextDocument(agentsPath);
		await vscode.window.showTextDocument(document);
	}

	/**
	 * Reload agents from disk
	 */
	async reloadAgents(): Promise<void> {
		await this.loadAgents();
		console.log('[ConfigRegistry] Reloaded agent configuration');
	}

	/**
	 * Smart merge: Project config can override, extend, or disable default agents
	 */
	private mergeAgentConfigs(defaults: AgentRegistry, overrides: AgentRegistry): AgentRegistry {
		const mergedAgents = [...defaults.agents];
		const agentMap = new Map(mergedAgents.map(a => [a.id, a]));

		for (const override of overrides.agents) {
			const existing = agentMap.get(override.id);

			if (existing) {
				// Override existing agent (partial merge)
				Object.assign(existing, override);
			} else {
				// New custom agent
				mergedAgents.push(override);
			}
		}

		return {
			version: overrides.version || defaults.version,
			description: overrides.description || defaults.description,
			projectType: overrides.projectType,
			agents: mergedAgents.filter(a => a.enabled !== false),
			notes: overrides.notes
		};
	}

	// ===========================
	// Private Helper Methods
	// ===========================

	private getProjectConfigPath(filename: string): string | null {
		const folder = this.getProjectFolder();
		if (!folder) {
			return null;
		}
		return path.join(folder, '.machat', filename);
	}

	private getProjectFolder(): string | null {
		const folders = vscode.workspace.workspaceFolders;
		return folders && folders.length > 0 ? folders[0].uri.fsPath : null;
	}

	private loadJsonFile<T>(filePath: string): T {
		const content = fs.readFileSync(filePath, 'utf-8');
		return JSON.parse(content) as T;
	}
}
