# External Model Configuration Proposal

**Status:** ✅ IMPLEMENTED (v1.15.0)
**Created:** 2025-09-30
**Implemented:** 2025-10-01
**Priority:** High
**Complexity:** Low-Medium

---

## Implementation Note

**IMPLEMENTED** in v1.15.0 (2025-10-01)

This proposal was successfully implemented with the following:
- ✅ `defaults/models.json` with 11+ models including Claude Sonnet 4.5
- ✅ Project-specific `.machat/models.json` override
- ✅ `ConfigurationRegistry` class for dynamic loading
- ✅ VS Code commands for managing model configs
- ✅ **BONUS:** Agent configuration also externalized in same release

Combined with agent externalization for complete configuration flexibility.

---

## Problem Statement

### Current Issues

1. **Hardcoded Model Definitions** - Models are defined in `src/config/models.ts`, requiring extension rebuild to update
2. **Outdated Model References** - Extension still references Claude 3.5 Sonnet when 4.5 is available
3. **No User Customization** - Users can't add their own models or edit model lists
4. **Inflexible Updates** - Every new model requires a code change, compile, and VSIX rebuild

### User Pain Points

- "I want to use Claude Sonnet 4.5 but it's not in the dropdown"
- "I have access to GPT-4.5 but can't add it to the extension"
- "Why do I need to wait for an extension update just to get new models?"

---

## Proposed Solution

### Phase 1: Local JSON Configuration (v1.15.0)

Move model definitions to JSON files with a simple hierarchy:

```
Extension Bundle:
└── defaults/
    └── models.json          # Bundled default models (read-only)

Project Initialization:
.machat/
└── models.json              # Project-local models (user-editable)
```

### Configuration Hierarchy

**Priority (lowest to highest):**
1. Bundled defaults (`defaults/models.json` in extension)
2. Project-local models (`.machat/models.json`)

**Behavior:**
- On first project initialization (`Initialize Multi Agent Chat Project`), copy bundled defaults to `.machat/models.json`
- Users can edit `.machat/models.json` to add/remove/modify models
- Extension reads from `.machat/models.json` if it exists, falls back to bundled defaults
- Each project can have different model lists

---

## Technical Design

### 1. JSON Schema

**File:** `defaults/models.json` (and `.machat/models.json`)

```json
{
  "version": "1.0.0",
  "lastUpdated": "2025-09-30",
  "providers": {
    "claude": {
      "displayName": "Claude (Anthropic)",
      "models": [
        {
          "id": "claude-sonnet-4-5-20250929",
          "displayName": "Claude Sonnet 4.5",
          "description": "Most intelligent model, best for complex tasks",
          "contextWindow": 200000,
          "maxOutput": 8096,
          "default": true,
          "tags": ["recommended", "latest"]
        },
        {
          "id": "claude-3-5-sonnet-latest",
          "displayName": "Claude 3.5 Sonnet",
          "description": "Previous generation, still very capable",
          "contextWindow": 200000,
          "maxOutput": 8096,
          "deprecated": false
        },
        {
          "id": "claude-3-5-haiku-latest",
          "displayName": "Claude 3.5 Haiku",
          "description": "Fast and efficient for simpler tasks",
          "contextWindow": 200000,
          "maxOutput": 8096
        }
      ]
    },
    "openai": {
      "displayName": "OpenAI",
      "models": [
        {
          "id": "gpt-4o",
          "displayName": "GPT-4o",
          "description": "OpenAI's most capable model",
          "contextWindow": 128000,
          "maxOutput": 4096,
          "default": true
        },
        {
          "id": "gpt-4o-mini",
          "displayName": "GPT-4o Mini",
          "description": "Faster, more affordable",
          "contextWindow": 128000,
          "maxOutput": 16384
        }
      ]
    }
  }
}
```

### 2. Model Registry Manager

**New File:** `src/config/ModelRegistry.ts`

```typescript
export interface ModelDefinition {
    id: string;
    displayName: string;
    description?: string;
    contextWindow?: number;
    maxOutput?: number;
    default?: boolean;
    deprecated?: boolean;
    tags?: string[];
}

export interface ProviderModels {
    displayName: string;
    models: ModelDefinition[];
}

export interface ModelRegistry {
    version: string;
    lastUpdated: string;
    providers: Record<string, ProviderModels>;
}

export class ModelRegistryManager {
    private registry: ModelRegistry | null = null;

    constructor(
        private context: vscode.ExtensionContext,
        private settingsManager: SettingsManager
    ) {}

    /**
     * Load model registry from:
     * 1. .machat/models.json (if exists)
     * 2. Bundled defaults/models.json (fallback)
     */
    async loadRegistry(): Promise<ModelRegistry> {
        // Try project-local first
        const projectPath = this.getProjectModelsPath();
        if (projectPath && fs.existsSync(projectPath)) {
            return this.loadFromFile(projectPath);
        }

        // Fall back to bundled defaults
        return this.loadBundledDefaults();
    }

    /**
     * Get models for a specific provider
     */
    getModelsForProvider(providerId: string): ModelDefinition[] {
        if (!this.registry) {
            throw new Error('Registry not loaded');
        }
        return this.registry.providers[providerId]?.models || [];
    }

    /**
     * Get default model for a provider
     */
    getDefaultModel(providerId: string): ModelDefinition | undefined {
        const models = this.getModelsForProvider(providerId);
        return models.find(m => m.default) || models[0];
    }

    /**
     * Initialize project with default models
     * Called when user runs "Initialize Multi Agent Chat Project"
     */
    async initializeProjectModels(): Promise<void> {
        const projectPath = this.getProjectModelsPath();
        if (!projectPath) {
            throw new Error('No workspace folder open');
        }

        // Copy bundled defaults to .machat/models.json
        const bundled = await this.loadBundledDefaults();
        await this.saveToFile(projectPath, bundled);
    }

    private loadBundledDefaults(): ModelRegistry {
        const defaultsPath = path.join(
            this.context.extensionPath,
            'defaults',
            'models.json'
        );
        return this.loadFromFile(defaultsPath);
    }

    private loadFromFile(filePath: string): ModelRegistry {
        const content = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(content);
    }

    private async saveToFile(filePath: string, registry: ModelRegistry): Promise<void> {
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(filePath, JSON.stringify(registry, null, 2));
    }

    private getProjectModelsPath(): string | null {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) return null;
        return path.join(workspaceFolder.uri.fsPath, '.machat', 'models.json');
    }
}
```

### 3. Integration with Settings UI

**Update:** `src/ui/SettingsPanel.ts`

```typescript
// Instead of hardcoded models, load from registry
const modelRegistry = await ModelRegistryManager.getInstance().loadRegistry();
const claudeModels = modelRegistry.providers.claude.models;

// Populate dropdown dynamically
const modelOptions = claudeModels.map(m => `
    <option value="${m.id}" ${m.default ? 'selected' : ''}>
        ${m.displayName}${m.tags?.includes('latest') ? ' ⭐' : ''}
    </option>
`).join('');
```

### 4. Commands

**New Commands:**

1. **`multiAgentChat.initializeProjectModels`**
   - Copies bundled defaults to `.machat/models.json`
   - Called automatically during project initialization
   - Can be called manually to reset models

2. **`multiAgentChat.openModelsConfig`**
   - Opens `.machat/models.json` in editor
   - Validates JSON schema on save
   - Shows helpful comments/examples

3. **`multiAgentChat.validateModelsConfig`** (optional)
   - Validates `.machat/models.json` schema
   - Reports errors
   - Suggests fixes

---

## Implementation Plan

### Step 1: Create Default Models JSON (30 min)
- Create `defaults/` folder
- Create `defaults/models.json` with current models + Claude 4.5
- Update to latest model IDs

### Step 2: Build ModelRegistryManager (1-2 hours)
- Create `src/config/ModelRegistry.ts`
- Implement load hierarchy
- Add initialization logic
- Add file I/O operations

### Step 3: Refactor Existing Code (1 hour)
- Update `src/config/models.ts` to use registry
- Update `src/ui/SettingsPanel.ts` to load from registry
- Update agent configurations to reference registry

### Step 4: Add Commands (30 min)
- Register new commands
- Add to Command Palette
- Update migration commands to include model initialization

### Step 5: Documentation (30 min)
- Update README.md with model customization instructions
- Add example `.machat/models.json`
- Document JSON schema

### Step 6: Testing (1 hour)
- Test bundled defaults fallback
- Test project-local models
- Test adding custom models
- Test invalid JSON handling

**Total Estimated Time:** 4-5 hours

---

## User Experience

### Adding Claude Sonnet 4.5

**Before (v1.14.0):**
1. Wait for extension developer to update code
2. Wait for new VSIX release
3. Reinstall extension

**After (v1.15.0):**
1. Open `.machat/models.json`
2. Add new model entry:
```json
{
  "id": "claude-sonnet-4-5-20250929",
  "displayName": "Claude Sonnet 4.5",
  "description": "Latest and greatest",
  "default": true
}
```
3. Reload window
4. Model appears in dropdown

### Adding Custom OpenAI Model

```json
{
  "providers": {
    "openai": {
      "models": [
        {
          "id": "gpt-4.5-turbo-custom",
          "displayName": "My Custom GPT-4.5",
          "description": "Fine-tuned for my domain"
        }
      ]
    }
  }
}
```

### Sharing Models Across Team

1. Commit `.machat/models.json` to git
2. Team members get same model list
3. Project-specific model preferences preserved

---

## Benefits

### For Users
- ✅ Always have latest models without waiting for updates
- ✅ Customize model lists per project
- ✅ Add custom/fine-tuned models
- ✅ Share model configurations with team

### For Developers
- ✅ No code changes needed for new models
- ✅ No VSIX rebuild for model updates
- ✅ Easy to maintain model list
- ✅ Community can contribute model definitions

### For Extension
- ✅ More flexible and future-proof
- ✅ Reduced maintenance burden
- ✅ Better user experience
- ✅ Foundation for external agent configs

---

## Risks & Mitigations

### Risk 1: Users Break JSON
**Mitigation:**
- JSON schema validation on load
- Fallback to bundled defaults on error
- Clear error messages with line numbers
- Command to validate and reset

### Risk 2: Model IDs Change
**Mitigation:**
- Keep deprecated models in registry
- Mark with `deprecated: true` flag
- Show warnings in UI
- Easy to update via JSON

### Risk 3: Large Model Lists
**Mitigation:**
- Group models by provider
- Support search/filter in UI
- Allow hiding deprecated models
- Keep defaults focused

---

## Future Enhancements (Not v1.15.0)

### Phase 2: Remote Registry (v1.16.0+)
```json
{
  "registryUrl": "https://raw.githubusercontent.com/.../registry/models.json",
  "autoUpdate": false,
  "updateInterval": "weekly"
}
```

**Features:**
- Fetch latest models from GitHub
- Cache locally with TTL
- Manual refresh command
- Fall back to bundled if offline

### Phase 3: Community Registry
- Community-contributed model definitions
- Voting/ratings for custom models
- Curated "recommended" lists
- Model discovery UI

### Phase 4: Agent Definitions
- Apply same pattern to `agents.json`
- Custom agent creation via JSON
- Share agent configurations
- Agent marketplace?

---

## Acceptance Criteria

✅ **v1.15.0 Complete When:**

1. Bundled `defaults/models.json` exists with current models
2. `.machat/models.json` created on project initialization
3. Settings UI loads models from registry (not hardcoded)
4. Users can add custom models via JSON editing
5. Invalid JSON falls back gracefully to bundled defaults
6. Documentation shows how to customize models
7. All existing functionality works with new system
8. Claude Sonnet 4.5 available in bundled defaults

---

## Open Questions

1. **Versioning:** Should we version the JSON schema? (e.g., `"schemaVersion": "1.0.0"`)
2. **Model Validation:** Validate model IDs against actual API availability?
3. **UI for Editing:** Build a UI for editing models, or keep it JSON-only?
4. **Migration:** Auto-migrate users from v1.14.0 to v1.15.0?

---

## Recommendation

**Start with Phase 1 (Local JSON) for v1.15.0:**
- Solves immediate pain (Claude 4.5 availability)
- Low complexity, high value
- Foundation for future remote registry
- Matches existing `.machat/` pattern
- 4-5 hours implementation time

**Defer Phase 2 (Remote Registry) to v1.16.0:**
- Assess user feedback on Phase 1
- Determine if auto-update is truly needed
- More complexity, requires network handling

---

*Proposal by: Craig Yappert (with AI assistance)*
*Target Version: 1.15.0*
*Estimated Effort: 4-5 hours*
