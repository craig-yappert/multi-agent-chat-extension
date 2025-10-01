# Project-Specific Configuration Architecture

**Created:** 2025-10-01
**Status:** ✅ IMPLEMENTED (v1.15.0 - 2025-10-01)
**Focus:** External Models + Agents with Project-Level Customization
**Priority:** HIGH - Foundation for flexible multi-project workflows

---

## Implementation Summary

**COMPLETED** in v1.15.0 (2025-10-01)

### What Was Built:
- ✅ **Phase 1: External Models** - Completed (4-5 hours)
  - `defaults/models.json` with 11+ models
  - `.machat/models.json` project overrides
  - ConfigurationRegistry model loading
  - VS Code commands (Open/Reset/Reload Models)

- ✅ **Phase 2: External Agents** - Completed (5-6 hours)
  - `defaults/agents.json` with 7 agents
  - `.machat/agents.json` with smart merging
  - AgentManager.loadFromRegistry()
  - VS Code commands (Open/Reset Agents)

### Total Implementation Time: ~10 hours (as estimated)

---

## Vision

**Enable each project to have optimized AI configurations based on project type:**

- **Web App Project**: Fast models, UI-focused agents
- **API/Data Project**: Claude Opus for complex analysis, data-focused agents
- **Creative Project**: Multimodal models (images/video), creative agents
- **Documentation Project**: Fast Haiku models, Documenter-heavy agent team

**Key Insight:** One size doesn't fit all. Projects have different needs, and model/agent configs should reflect that.

---

## Architecture: Two-Tier Configuration System

### Tier 1: Extension Defaults (Bundled, Read-Only)
**Location:** `extension/defaults/`

```
defaults/
├── models.json          # All available models (Claude, OpenAI, etc.)
└── agents.json          # Standard 7 agents (Architect, Coder, etc.)
```

**Purpose:**
- Provide sensible starting point
- Updated with extension releases
- Users never edit these directly

---

### Tier 2: Project Overrides (User-Editable)
**Location:** `.machat/` in each project

```
.machat/
├── models.json          # Project-specific model selection
├── agents.json          # Project-customized agents
├── config.json          # Existing settings
├── conversations/       # Chat history
└── context/            # Agent memory
```

**Purpose:**
- Override defaults for this project
- Customize models and agents per project type
- Commit to git for team consistency

---

## Configuration Hierarchy & Merging

### Loading Priority (Highest to Lowest):
1. **Project Config** (`.machat/models.json`, `.machat/agents.json`)
2. **Extension Defaults** (`defaults/models.json`, `defaults/agents.json`)

### Merging Strategy:

**Models:** Project config **replaces** defaults (no merging)
- If `.machat/models.json` exists → use it
- Otherwise → use `defaults/models.json`
- Rationale: Model lists are complete, not additive

**Agents:** Project config **extends/overrides** defaults (smart merge)
- Start with default 7 agents
- If `.machat/agents.json` exists:
  - Override matching agent IDs (e.g., customize "coder")
  - Add new custom agents (e.g., "video-editor")
  - Remove agents by setting `enabled: false`
- Rationale: Projects might want to tweak existing agents or add new ones

---

## File Format Specifications

### 1. `defaults/models.json` (Extension Bundled)

```json
{
  "version": "1.0.0",
  "lastUpdated": "2025-10-01",
  "description": "Default model definitions for all projects",
  "providers": {
    "claude": {
      "displayName": "Claude (Anthropic)",
      "models": [
        {
          "id": "claude-sonnet-4-5-20250929",
          "displayName": "Claude Sonnet 4.5",
          "description": "Most intelligent, best for complex tasks",
          "contextWindow": 200000,
          "maxOutput": 8096,
          "capabilities": ["text", "vision", "code"],
          "tags": ["latest", "recommended"],
          "pricing": {
            "input": 0.003,
            "output": 0.015
          }
        },
        {
          "id": "claude-3-5-sonnet-20241022",
          "displayName": "Claude 3.5 Sonnet",
          "description": "Previous generation, still very capable",
          "contextWindow": 200000,
          "maxOutput": 8096,
          "capabilities": ["text", "vision", "code"],
          "pricing": {
            "input": 0.003,
            "output": 0.015
          }
        },
        {
          "id": "claude-3-5-haiku-20241022",
          "displayName": "Claude 3.5 Haiku",
          "description": "Fast and efficient for simpler tasks",
          "contextWindow": 200000,
          "maxOutput": 8096,
          "capabilities": ["text", "vision"],
          "tags": ["fast"],
          "pricing": {
            "input": 0.0008,
            "output": 0.004
          }
        },
        {
          "id": "claude-3-opus-20240229",
          "displayName": "Claude 3 Opus",
          "description": "Highest intelligence for complex analysis",
          "contextWindow": 200000,
          "maxOutput": 4096,
          "capabilities": ["text", "vision", "code"],
          "tags": ["powerful"],
          "pricing": {
            "input": 0.015,
            "output": 0.075
          }
        }
      ]
    },
    "openai": {
      "displayName": "OpenAI",
      "models": [
        {
          "id": "gpt-4o",
          "displayName": "GPT-4o",
          "description": "Multimodal, vision + text",
          "contextWindow": 128000,
          "maxOutput": 4096,
          "capabilities": ["text", "vision", "code"],
          "tags": ["multimodal"]
        },
        {
          "id": "gpt-4o-mini",
          "displayName": "GPT-4o Mini",
          "description": "Faster, more affordable",
          "contextWindow": 128000,
          "maxOutput": 16384,
          "capabilities": ["text", "vision"],
          "tags": ["fast", "affordable"]
        }
      ]
    }
  },
  "defaults": {
    "provider": "claude",
    "model": "claude-sonnet-4-5-20250929"
  }
}
```

---

### 2. `.machat/models.json` (Project-Specific Example: Data Analysis Project)

```json
{
  "version": "1.0.0",
  "projectType": "data-analysis",
  "description": "Models optimized for data ingestion and API work",
  "providers": {
    "claude": {
      "models": [
        {
          "id": "claude-3-opus-20240229",
          "displayName": "Claude 3 Opus",
          "description": "Best for complex data analysis",
          "default": true
        },
        {
          "id": "claude-3-5-haiku-20241022",
          "displayName": "Claude 3.5 Haiku",
          "description": "Fast model for simple queries"
        }
      ]
    }
  },
  "defaults": {
    "provider": "claude",
    "model": "claude-3-opus-20240229"
  },
  "notes": "Using Opus for complex analysis, Haiku for quick tasks. No multimodal needed."
}
```

---

### 3. `.machat/models.json` (Project-Specific Example: Creative/Media Project)

```json
{
  "version": "1.0.0",
  "projectType": "creative-media",
  "description": "Models with vision capabilities for image/video work",
  "providers": {
    "claude": {
      "models": [
        {
          "id": "claude-sonnet-4-5-20250929",
          "displayName": "Claude Sonnet 4.5",
          "description": "Vision + code capabilities",
          "default": true
        }
      ]
    },
    "openai": {
      "models": [
        {
          "id": "gpt-4o",
          "displayName": "GPT-4o",
          "description": "Strong multimodal capabilities"
        }
      ]
    }
  },
  "defaults": {
    "provider": "claude",
    "model": "claude-sonnet-4-5-20250929"
  },
  "notes": "Need vision models for image analysis and video storyboarding"
}
```

---

### 4. `defaults/agents.json` (Extension Bundled)

```json
{
  "version": "1.0.0",
  "lastUpdated": "2025-10-01",
  "description": "Default agent configurations",
  "agents": [
    {
      "id": "architect",
      "name": "Architect",
      "role": "System Design & Architecture",
      "description": "Plans system architecture, designs APIs, and makes high-level technical decisions",
      "icon": "🏗️",
      "color": "#4A90E2",
      "enabled": true,
      "capabilities": [
        "system-design",
        "api-design",
        "architecture-review",
        "tech-strategy"
      ],
      "specializations": [
        "microservices",
        "distributed-systems",
        "database-design",
        "scalability"
      ],
      "provider": "claude",
      "model": "claude-sonnet-4-5-20250929",
      "systemPrompt": "You are an expert software architect specializing in system design and technical decision-making."
    },
    {
      "id": "coder",
      "name": "Coder",
      "role": "Implementation & Development",
      "description": "Writes code, implements features, and handles complex programming tasks",
      "icon": "💻",
      "color": "#50C878",
      "enabled": true,
      "capabilities": [
        "code-generation",
        "refactoring",
        "debugging",
        "optimization"
      ],
      "specializations": [
        "algorithms",
        "data-structures",
        "performance",
        "clean-code"
      ],
      "provider": "claude",
      "model": "claude-sonnet-4-5-20250929",
      "systemPrompt": "You are an expert software developer focused on writing clean, efficient code."
    },
    {
      "id": "executor",
      "name": "Executor",
      "role": "File Operations & Command Execution",
      "description": "Executes commands, manages files, runs tests, and handles system operations",
      "icon": "⚡",
      "color": "#FF6B35",
      "enabled": true,
      "capabilities": [
        "file-operations",
        "command-execution",
        "testing",
        "deployment"
      ],
      "specializations": [
        "bash",
        "git",
        "npm",
        "docker",
        "ci-cd"
      ],
      "provider": "claude",
      "model": "claude-3-5-haiku-20241022",
      "systemPrompt": "You are an expert at executing commands and managing files efficiently."
    },
    {
      "id": "reviewer",
      "name": "Reviewer",
      "role": "Code Review & Quality Assurance",
      "description": "Reviews code quality, suggests improvements, and ensures best practices",
      "icon": "🔍",
      "color": "#9B59B6",
      "enabled": true,
      "capabilities": [
        "code-review",
        "quality-assurance",
        "best-practices",
        "security-audit"
      ],
      "specializations": [
        "security",
        "performance",
        "maintainability",
        "testing-strategy"
      ],
      "provider": "claude",
      "model": "claude-sonnet-4-5-20250929",
      "systemPrompt": "You are a meticulous code reviewer focused on quality and best practices."
    },
    {
      "id": "documenter",
      "name": "Documenter",
      "role": "Documentation & Communication",
      "description": "Creates documentation files (README, guides, docs) - NOT code. For code, use @coder",
      "icon": "📝",
      "color": "#F39C12",
      "enabled": true,
      "capabilities": [
        "documentation",
        "markdown-files",
        "explanations",
        "user-guides"
      ],
      "specializations": [
        "technical-writing",
        "api-docs",
        "user-guides",
        "readme",
        "markdown"
      ],
      "provider": "claude",
      "model": "claude-3-5-haiku-20241022",
      "systemPrompt": "You are a technical writer focused on clear, helpful documentation."
    },
    {
      "id": "coordinator",
      "name": "Coordinator",
      "role": "Multi-Agent Orchestration",
      "description": "Coordinates between agents, manages workflows, and delegates tasks",
      "icon": "🤝",
      "color": "#E67E22",
      "enabled": true,
      "capabilities": [
        "task-delegation",
        "workflow-management",
        "agent-coordination",
        "conflict-resolution"
      ],
      "specializations": [
        "project-management",
        "task-planning",
        "team-coordination",
        "decision-making"
      ],
      "provider": "claude",
      "model": "claude-sonnet-4-5-20250929",
      "systemPrompt": "You are a project coordinator who delegates tasks to the right agents."
    },
    {
      "id": "team",
      "name": "Team",
      "role": "Full Team Collaboration",
      "description": "Broadcasts message to all agents and coordinates collaborative responses",
      "icon": "👥",
      "color": "#8E44AD",
      "enabled": true,
      "capabilities": [
        "team-broadcast",
        "collaborative-response",
        "consensus-building",
        "multi-perspective"
      ],
      "specializations": [
        "team-collaboration",
        "brainstorming",
        "decision-consensus",
        "knowledge-synthesis"
      ],
      "provider": "multi",
      "systemPrompt": "You coordinate multiple agents to provide comprehensive responses."
    }
  ]
}
```

---

### 5. `.machat/agents.json` (Project-Specific Example: Data Project)

```json
{
  "version": "1.0.0",
  "projectType": "data-analysis",
  "description": "Agent configuration optimized for data ingestion and API work",
  "agents": [
    {
      "id": "architect",
      "enabled": true,
      "model": "claude-3-opus-20240229",
      "systemPrompt": "You are an expert in API design and data pipeline architecture."
    },
    {
      "id": "coder",
      "enabled": true,
      "model": "claude-3-opus-20240229",
      "specializations": [
        "python",
        "data-processing",
        "pandas",
        "sql",
        "api-integration"
      ],
      "systemPrompt": "You are an expert Python developer focused on data ingestion and analysis."
    },
    {
      "id": "reviewer",
      "enabled": false,
      "notes": "Disabled for this project - code reviews done manually"
    },
    {
      "id": "data-analyst",
      "name": "Data Analyst",
      "role": "Data Analysis & Insights",
      "description": "Analyzes data, creates visualizations, and provides insights",
      "icon": "📊",
      "color": "#3498DB",
      "enabled": true,
      "capabilities": [
        "data-analysis",
        "visualization",
        "statistical-analysis",
        "insights"
      ],
      "specializations": [
        "pandas",
        "numpy",
        "matplotlib",
        "seaborn",
        "jupyter"
      ],
      "provider": "claude",
      "model": "claude-3-opus-20240229",
      "systemPrompt": "You are a data analyst expert at extracting insights from data."
    }
  ],
  "notes": "Using Opus for complex analysis. Added custom Data Analyst agent. Disabled Reviewer."
}
```

---

### 6. `.machat/agents.json` (Project-Specific Example: Creative Project)

```json
{
  "version": "1.0.0",
  "projectType": "creative-media",
  "description": "Agent configuration for image/video creative projects",
  "agents": [
    {
      "id": "coder",
      "enabled": true,
      "specializations": [
        "javascript",
        "react",
        "animations",
        "canvas",
        "webgl"
      ],
      "systemPrompt": "You are an expert in creative coding and visual effects."
    },
    {
      "id": "documenter",
      "enabled": false,
      "notes": "Light documentation needs for creative project"
    },
    {
      "id": "creative-director",
      "name": "Creative Director",
      "role": "Visual Design & Storyboarding",
      "description": "Designs visual concepts, storyboards, and creative direction",
      "icon": "🎨",
      "color": "#E91E63",
      "enabled": true,
      "capabilities": [
        "visual-design",
        "storyboarding",
        "creative-concepts",
        "image-analysis"
      ],
      "specializations": [
        "ui-design",
        "color-theory",
        "typography",
        "composition",
        "brand-identity"
      ],
      "provider": "claude",
      "model": "claude-sonnet-4-5-20250929",
      "systemPrompt": "You are a creative director with expertise in visual design and storytelling."
    },
    {
      "id": "video-editor",
      "name": "Video Editor",
      "role": "Video Production & Editing",
      "description": "Plans video editing, shot composition, and production workflows",
      "icon": "🎬",
      "color": "#9C27B0",
      "enabled": true,
      "capabilities": [
        "video-editing",
        "shot-composition",
        "timeline-planning",
        "effects"
      ],
      "specializations": [
        "premiere-pro",
        "after-effects",
        "ffmpeg",
        "video-codecs",
        "color-grading"
      ],
      "provider": "claude",
      "model": "claude-sonnet-4-5-20250929",
      "systemPrompt": "You are a professional video editor with expertise in post-production."
    }
  ],
  "notes": "Added Creative Director and Video Editor agents. Using vision-capable models."
}
```

---

## Implementation Architecture

### New Component: `ConfigurationRegistry`

```typescript
// src/config/ConfigurationRegistry.ts

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

export class ConfigurationRegistry {
  private static instance: ConfigurationRegistry;
  private modelRegistry: ModelRegistry | null = null;
  private agentRegistry: AgentRegistry | null = null;

  private constructor(
    private context: vscode.ExtensionContext,
    private workspaceFolder?: vscode.WorkspaceFolder
  ) {}

  static getInstance(
    context: vscode.ExtensionContext,
    workspaceFolder?: vscode.WorkspaceFolder
  ): ConfigurationRegistry {
    if (!ConfigurationRegistry.instance) {
      ConfigurationRegistry.instance = new ConfigurationRegistry(context, workspaceFolder);
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
      this.modelRegistry = this.loadJsonFile(projectPath);
      return this.modelRegistry;
    }

    // Fallback to bundled defaults
    console.log('[ConfigRegistry] Loading default models from extension bundle');
    const defaultPath = path.join(this.context.extensionPath, 'defaults', 'models.json');
    this.modelRegistry = this.loadJsonFile(defaultPath);
    return this.modelRegistry;
  }

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
      return this.agentRegistry;
    }

    // Merge project overrides with defaults
    console.log('[ConfigRegistry] Merging project agent overrides from:', projectPath);
    const projectOverrides = this.loadJsonFile<AgentRegistry>(projectPath);
    this.agentRegistry = this.mergeAgentConfigs(defaultAgents, projectOverrides);
    return this.agentRegistry;
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
   * Get default model
   */
  getDefaultModel(): { provider: string; model: string } {
    if (!this.modelRegistry) {
      throw new Error('Model registry not loaded. Call loadModels() first.');
    }
    return this.modelRegistry.defaults;
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
   * Initialize project with default configs
   */
  async initializeProjectConfigs(): Promise<void> {
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
    if (!fs.existsSync(projectModelsPath)) {
      fs.copyFileSync(defaultModelsPath, projectModelsPath);
      console.log('[ConfigRegistry] Initialized project models.json');
    }

    // Copy default agents to project
    const defaultAgentsPath = path.join(this.context.extensionPath, 'defaults', 'agents.json');
    const projectAgentsPath = path.join(machatPath, 'agents.json');
    if (!fs.existsSync(projectAgentsPath)) {
      fs.copyFileSync(defaultAgentsPath, projectAgentsPath);
      console.log('[ConfigRegistry] Initialized project agents.json');
    }
  }

  private getProjectConfigPath(filename: string): string | null {
    const folder = this.getProjectFolder();
    if (!folder) return null;
    return path.join(folder, '.machat', filename);
  }

  private getProjectFolder(): string | null {
    if (this.workspaceFolder) {
      return this.workspaceFolder.uri.fsPath;
    }
    const folders = vscode.workspace.workspaceFolders;
    return folders && folders.length > 0 ? folders[0].uri.fsPath : null;
  }

  private loadJsonFile<T>(filePath: string): T {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as T;
  }
}
```

---

## Commands

### New VS Code Commands:

1. **`multiAgentChat.openModelsConfig`**
   - Opens `.machat/models.json` in editor
   - Creates from defaults if doesn't exist

2. **`multiAgentChat.openAgentsConfig`**
   - Opens `.machat/agents.json` in editor
   - Creates from defaults if doesn't exist

3. **`multiAgentChat.resetModelsToDefaults`**
   - Overwrites `.machat/models.json` with bundled defaults

4. **`multiAgentChat.resetAgentsToDefaults`**
   - Overwrites `.machat/agents.json` with bundled defaults

5. **`multiAgentChat.reloadConfigs`**
   - Reloads models and agents from disk
   - Updates UI without restart

---

## Implementation Phases

### Phase 1: External Models (4-5 hours)

**Tasks:**
1. Create `defaults/models.json` with all current models + Claude Sonnet 4.5
2. Build `ConfigurationRegistry` class (model loading only)
3. Update `src/config/models.ts` to use registry
4. Update Settings UI to load models from registry
5. Add commands: "Open Models Config", "Reset Models"
6. Test: Add custom model, reload, verify it appears in UI

**Deliverables:**
- ✅ Users can edit `.machat/models.json`
- ✅ No rebuild needed for model changes
- ✅ Project-specific model lists

---

### Phase 2: External Agents (5-6 hours)

**Tasks:**
1. Create `defaults/agents.json` with current 7 agents
2. Extend `ConfigurationRegistry` with agent loading + merging
3. Update `src/agents.ts` to use registry
4. Update UI to show agents from registry
5. Add commands: "Open Agents Config", "Reset Agents"
6. Test: Override agent, add custom agent, disable agent

**Deliverables:**
- ✅ Users can customize agents per project
- ✅ Add new custom agents (e.g., "Data Analyst")
- ✅ Override model per agent
- ✅ Disable agents not needed for project

---

### Phase 3: Documentation & Polish (1-2 hours)

**Tasks:**
1. Document JSON schemas
2. Create example project configs
3. Add validation and error handling
4. Create migration guide

---

## Timeline

**Total Estimate:** 10-13 hours

- **Phase 1 (Models):** 4-5 hours
- **Phase 2 (Agents):** 5-6 hours
- **Phase 3 (Docs):** 1-2 hours

**Proposed Schedule:**
- **This week:** Phase 1 (External Models)
- **Next week:** Phase 2 (External Agents)
- **Following:** Phase 3 (Polish & Docs)

---

## Success Criteria

### After Phase 1:
- ✅ Users can add Claude Sonnet 4.5 to `.machat/models.json`
- ✅ Data project can use Opus, Creative project can use vision models
- ✅ No extension rebuild needed

### After Phase 2:
- ✅ Data project can add "Data Analyst" agent
- ✅ Creative project can add "Creative Director" and "Video Editor" agents
- ✅ Can disable agents not needed (e.g., disable Reviewer in small projects)
- ✅ Can override agent models (e.g., use Haiku for Documenter)

### After Phase 3:
- ✅ Clear documentation with examples
- ✅ JSON schema validation
- ✅ Error messages guide users to fix issues

---

## User Workflow Examples

### Example 1: Setting up Data Analysis Project

```bash
# Initialize project
Ctrl+Shift+P → "Initialize Multi Agent Chat Project"

# Edit models
Ctrl+Shift+P → "Open Models Configuration"
# Edit .machat/models.json:
# - Set default to claude-3-opus
# - Remove creative/vision models

# Edit agents
Ctrl+Shift+P → "Open Agents Configuration"
# Edit .machat/agents.json:
# - Override Coder specializations to Python/data
# - Add custom "Data Analyst" agent
# - Disable Reviewer agent

# Reload
Ctrl+Shift+P → "Reload Configurations"

# Now use agents optimized for data work!
```

### Example 2: Setting up Creative Project

```bash
# Initialize project
Ctrl+Shift+P → "Initialize Multi Agent Chat Project"

# Edit models
# - Keep vision-capable models (Sonnet 4.5, GPT-4o)
# - Set Sonnet 4.5 as default

# Edit agents
# - Add "Creative Director" agent (vision model)
# - Add "Video Editor" agent
# - Disable Executor, Reviewer (not needed)

# Now have agents tuned for creative work!
```

---

## Open Questions

1. **Should we validate JSON on save?**
   - Yes - show errors in VS Code problems panel

2. **How to handle invalid configs?**
   - Fall back to defaults, show notification

3. **Should configs be committed to git?**
   - Yes - team consistency
   - Add to `.gitignore` if needed per project

4. **Migration for existing projects?**
   - Auto-create configs on next extension activation

---

## Next Steps

**Ready to start Phase 1 (External Models)?**

This will give you:
- ✅ Project-specific model lists
- ✅ Add Claude Sonnet 4.5 without rebuild
- ✅ Foundation for agent externalization

**Estimated: 4-5 hours**

Should we begin?
