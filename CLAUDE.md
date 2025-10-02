# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Multi Agent Chat is a VS Code extension that provides a collaborative AI team interface with specialized agents (Architect, Coder, Executor, Reviewer, Documenter, Coordinator, and Team) for software development tasks.

**Current Version:** 1.16.1 (Model Awareness & Safe Initialization)

## Essential Commands

### Development
- `npm run compile` - Compile TypeScript to JavaScript
- `npm run watch` - Watch mode for TypeScript compilation
- `npm run lint` - Run ESLint on src directory
- `npm test` - Run tests (compiles and lints first)

### Debugging Extension
- Press `F5` in VS Code to launch extension in new Extension Development Host window
- Use "Run Extension" configuration in VS Code debugger

### Building VSIX Package
- `npx vsce package --no-dependencies` - Create .vsix extension package for distribution

### Extension Commands (in VS Code)
- `Ctrl+Shift+P` → "Open Multi Agent Chat" - Main interface
- `Ctrl+Shift+P` → "Clear All Conversation History" - Reset conversations
- `Ctrl+Shift+P` → "Initialize Multi Agent Chat Project" - Create .machat folder
- `Ctrl+Shift+P` → "Migrate Conversations to Project" - Move to local storage
- `Ctrl+Shift+P` → "Manage API Keys" - **NEW v1.15.1** - Secure API key management
- `Ctrl+Shift+P` → "Open Models Configuration" - Edit project model list
- `Ctrl+Shift+P` → "Open Agents Configuration" - Edit project agent definitions
- `Ctrl+Shift+P` → "Reset Models to Defaults" - Restore bundled model list
- `Ctrl+Shift+P` → "Reset Agents to Defaults" - Restore bundled agent definitions
- `Ctrl+Shift+P` → "Update from Defaults" - **NEW v1.16.1** - Smart sync of models/agents from defaults
- `Ctrl+Shift+P` → "Reload Model Configurations" - Refresh configs without restart

## Architecture Overview (v1.15.0)

### Core Components

**Configuration Registry** (`src/config/ConfigurationRegistry.ts`) **NEW in v1.15.0**
- External model configuration from JSON files
- External agent configuration with smart merging
- Two-tier loading: defaults → project overrides
- `defaults/models.json` - Bundled model definitions (28+ models across 6 providers)
- `defaults/agents.json` - Bundled agent definitions (7 agents)
- `.machat/models.json` - Project-specific model list (optional)
- `.machat/agents.json` - Project-specific agent customization (optional)
- Dynamic reload without extension restart

**API Key Manager** (`src/settings/ApiKeyManager.ts`) **NEW in v1.15.1**
- Secure API key storage using VS Code SecretStorage API
- Encrypted, OS-level credential storage (never in plain text)
- Automatic migration from old settings.json storage
- Interactive setup command: `Ctrl+Shift+P` → "Manage API Keys"
- Per-user storage (never committed to git)
- Support for Claude and OpenAI API keys
- **Settings UI removed** - use Command Palette for key management

**Agent System** (`src/agents.ts`)
- 7 specialized agents with unique roles and capabilities
- Team agent coordinates multi-agent collaboration
- **NEW:** Agents loaded from JSON via ConfigurationRegistry
- Each agent configurable: provider, model, specializations, system prompt
- Agent memory persists across sessions

**Model Configuration** (`src/config/models.ts`)
- **NEW:** Dynamic model loading from registry
- Support for Claude, OpenAI, and local models
- Project-specific model selection
- Fallback to legacy configs for safety

**Provider System** (`src/providers/`) **NEW in v1.16.0**
- **3-Tier Architecture:** VS Code LM API → Direct HTTP → CLI fallback
- **ProviderRegistry:** Configurable provider selection based on user preference
- **VSCodeLMProvider:** Uses VS Code Language Model API (Copilot, Continue.dev, etc.)
- **HttpProvider:** Base class for direct API providers (OpenAI, Google, xAI)
- **ClaudeProvider:** Direct Claude CLI integration (legacy, still supported)
- **MultiProvider:** Team coordination
- **Provider Preference Setting:** User-configurable priority (claude-cli, auto, vscode-lm, direct-api)
- **See:** [Provider Setup Guide](docs/USER_GUIDE_PROVIDERS.md) | [Developer Guide](docs/ADDING_PROVIDERS.md)

**Settings Management** (`src/settings/SettingsManager.ts`)
- Hierarchical settings: VS Code → Global → Project → Workspace
- Project settings in `.machat/config.json`
- Automatic merging with proper precedence

**Conversation Storage** (`src/conversations/ConversationManager.ts`)
- Project-local storage in `.machat/conversations/`
- Global storage fallback for non-project contexts
- Automatic migration utilities

**Project Context** (`src/context/ProjectContextManager.ts`)
- Agent memory isolation per project
- Project-specific prompts and documentation
- Context scoping to prevent cross-project bleeding

**Communication Hub** (`src/agentCommunication.ts`)
- Inter-agent communication system with @mention support
- Message broadcasting and routing between agents
- Loop prevention (max depth 3, max 50 messages per conversation)
- Live inter-agent message display in UI
- Context sharing for collaborative responses

**Performance Optimization** (`src/performanceOptimizer.ts`)
- Response caching (5-minute TTL)
- Streaming support for faster feedback
- Quick team mode (3 agents instead of 6)
- Configurable agent timeouts

**UI Components** (`resources/webview/`)
- External webview resources (index.html, script.js, styles.css)
- Agent selector for switching between specialists
- Markdown rendering with syntax highlighting
- Live inter-agent message display
- Float button for detachable chat window
- File attachment capability
- STOP button to kill all running processes

## Project Structure

```
multi-agent-chat-extension/
├── src/
│   ├── settings/              # Settings management
│   ├── conversations/         # Conversation storage
│   ├── context/              # Project context
│   ├── commands/             # Migration commands
│   ├── config/               # Model configurations
│   ├── ui/                   # Settings UI panel
│   ├── providers/            # NEW v1.16.0 - Provider implementations
│   │   ├── ProviderRegistry.ts    # Provider selection logic
│   │   ├── VSCodeLMProvider.ts    # VS Code Language Model API
│   │   ├── HttpProvider.ts        # Base HTTP provider
│   │   ├── OpenAIHttpProvider.ts  # OpenAI & xAI
│   │   └── GoogleHttpProvider.ts  # Google Gemini
│   ├── agents.ts             # Agent definitions
│   ├── providers.ts          # AI providers (legacy + manager)
│   ├── extension.ts          # Main extension controller
│   ├── agentCommunication.ts # Inter-agent messaging hub
│   ├── agentMessageParser.ts # @mention parser
│   ├── performanceOptimizer.ts # Caching & optimization
│   └── requestManager.ts     # Request queue management
├── defaults/                 # NEW v1.15.0 - External configs
│   ├── models.json           # Model definitions
│   ├── agents.json           # Agent definitions
│   └── providers.json        # NEW v1.16.0 - Provider configs
├── resources/
│   └── webview/              # External UI resources
│       ├── index.html        # HTML template
│       ├── script.js         # UI logic (~6000 lines)
│       └── styles.css        # Styling (~2500 lines)
├── docs/                     # Documentation
│   ├── USER_GUIDE_PROVIDERS.md  # NEW v1.16.0 - Provider setup
│   └── ADDING_PROVIDERS.md      # NEW v1.16.0 - Developer guide
├── .machat/                  # Project-local storage (in user projects)
│   ├── config.json           # Project settings
│   ├── models.json           # Project-specific models (optional)
│   ├── agents.json           # Project-specific agent config (optional)
│   ├── agents/
│   │   └── agent-prompts/   # Custom agent prompts (Markdown)
│   ├── conversations/        # Local conversations
│   └── context/             # Agent memory & knowledge base
├── out/                      # Compiled JavaScript (generated)
└── package.json              # Extension manifest
```

## Key Configuration Settings

The extension uses `multiAgentChat.*` settings (unified in v1.11.0):

### API Keys (v1.15.1+)
**NEW:** API keys are now stored in VS Code SecretStorage (encrypted, secure)
- Use Command Palette → `Multi Agent Chat: Manage API Keys` to configure
- Old settings (`multiAgentChat.apiKeys.*`) are DEPRECATED but auto-migrated
- Never stored in project files or committed to git

### Global Settings
- `multiAgentChat.defaultModel` - Default AI model
- `multiAgentChat.defaultProvider` - Default provider
- `multiAgentChat.providerPreference` - **NEW v1.16.0** - Provider selection strategy:
  - `claude-cli`: Prefer Claude CLI (for Claude Max subscribers)
  - `auto`: Auto-detect (VS Code LM → HTTP → CLI)
  - `vscode-lm`: Only VS Code Language Model API
  - `direct-api`: Only direct HTTP APIs
- `multiAgentChat.permissions.yoloMode` - Auto-approve actions
- `multiAgentChat.permissions.defaultPolicy` - Permission policy

### Agent Configuration
- `multiAgentChat.agents.defaultAgent` - Default agent to use
- `multiAgentChat.agents.enableInterCommunication` - Agent collaboration
- `multiAgentChat.agents.showInterCommunication` - Display agent chatter

#### Custom Agent Prompts (Markdown-based)

For project-specific agent behavior, you can add custom prompts as **Markdown files** instead of editing JSON:

**Location:** `.machat/agents/agent-prompts/<agent-id>.md`

**How it Works:**
1. **System Prompt** (from `agents.json`): Defines core agent role and behavior
2. **+** **Custom Prompt** (from `.md` file): Adds project-specific instructions
3. **=** Final agent context with both general behavior and project tuning

**Example: `.machat/agents/agent-prompts/coder.md`**
```markdown
# Project Coding Standards

## TypeScript Requirements
- Always use strict mode
- Prefer `interface` over `type` for object shapes
- Use explicit return types on public functions

## Testing
- Write Jest tests for all new functions
- Aim for 80%+ code coverage
- Use `describe` blocks to organize tests by feature

## Style Guide
- Follow the project's ESLint config
- Max line length: 100 characters
- Use meaningful variable names (no single letters except loop indices)
```

**Benefits:**
- ✅ Richer formatting (headers, lists, code blocks)
- ✅ No JSON escaping headaches
- ✅ Git-friendly diffs
- ✅ Easier to maintain multi-line instructions
- ✅ Layered approach: core behavior + project customization

**Available Agents:**
- `architect.md` - Architecture and design standards
- `coder.md` - Coding standards and patterns
- `executor.md` - Execution and deployment procedures
- `reviewer.md` - Review criteria and quality standards
- `documenter.md` - Documentation style and requirements
- `coordinator.md` - Project workflow and delegation rules
- `team.md` - Team collaboration guidelines

**Note:** These files are optional. If not present, agents use only their default system prompts.

### Project Settings
- `multiAgentChat.project.useLocalStorage` - Use .machat folder
- `multiAgentChat.project.autoInitialize` - Auto-create .machat
- `multiAgentChat.project.shareSettings` - Use project config

### Performance
- `multiAgentChat.performance.enableStreaming` - Response streaming
- `multiAgentChat.performance.enableCache` - Response caching
- `multiAgentChat.performance.quickTeamMode` - Use 3 agents
- `multiAgentChat.performance.agentTimeout` - Timeout per agent

## Recent Changes

### v1.16.1 (2025-10-02) - Model Awareness & Safe Initialization

**Enhanced Model Awareness:**
- Agents now receive detailed model information in their system prompts
- Display name + model ID: "You are using Claude Sonnet 4.5 (model: claude-sonnet-4-5-20250929)"
- Model descriptions included for better context
- ConfigurationRegistry integration with ProviderManager and ClaudeProvider
- Fixed hardcoded fallback agents to use proper model IDs from defaults

**Smart Initialization System:**
- `initializeProject` and auto-initialization now copy models.json and agents.json
- Safe by default: Only creates missing files, never overwrites existing
- New "Update from Defaults" command for explicit sync operations
- Smart picker shows relevant options based on what files exist
- Clear messaging: "Create" vs "Update/Overwrite" labels
- Git-friendly workflow for tracking configuration changes

**Key Files Modified:**
- `src/extension.ts` - AgentManager loads from registry, enhanced auto-init
- `src/providers.ts` - Enhanced model awareness in agent prompts
- `src/agents.ts` - Fixed fallback agents to use proper model IDs
- `src/commands/MigrationCommands.ts` - Enhanced initialization with models/agents
- `package.json` - Added "Update from Defaults" command

**Benefits:**
- Agents understand their capabilities better (model descriptions)
- No accidental overwrites of customized configurations
- Easy to sync with latest defaults when needed
- Works seamlessly across all projects (bundled defaults + optional project overrides)

### v1.16.0 (2025-10-02) - Multi-Provider Support

**3-Tier Provider Architecture:**
- **VS Code Language Model API:** Use GitHub Copilot, Continue.dev, and other AI extensions
- **Direct HTTP APIs:** OpenAI, Google Gemini, xAI Grok support
- **Claude CLI:** Existing functionality preserved (default for backward compat)

**Provider Preference Setting:**
- `claude-cli` (default): Prefer Claude CLI for Max subscribers
- `auto`: Community-friendly (tries VS Code models first)
- `vscode-lm`: Only VS Code Language Model API
- `direct-api`: Only direct HTTP APIs with user keys

**New Components:**
- `defaults/providers.json` - Provider API configurations
- `src/providers/ProviderRegistry.ts` - Provider selection logic
- `src/providers/VSCodeLMProvider.ts` - VS Code LM integration
- `src/providers/HttpProvider.ts` - Base for HTTP providers
- `src/providers/OpenAIHttpProvider.ts` - OpenAI & xAI (compatible)
- `src/providers/GoogleHttpProvider.ts` - Google Gemini
- `docs/USER_GUIDE_PROVIDERS.md` - User setup guide
- `docs/ADDING_PROVIDERS.md` - Developer guide

**Key Features:**
- Zero API keys needed with GitHub Copilot
- Ride the "coattails" of VS Code authentication
- Backward compatible - existing setups unchanged
- Easy to add new providers (often just JSON config)
- Per-user provider preference configuration

### v1.15.2 (2025-10-02) - Inter-Agent Collaboration Fixes

**True Multi-Agent Collaboration Working:**
- Fixed secondary @mentions not being routed to agents
- Removed `isInterAgentResponse` flag that blocked response parsing
- Agents now parse ALL responses for @mentions (loop prevention via depth/message limits)
- Successful 3-5 agent collaborative discussions with natural conversation flow

**Critical Bug Fixes:**

**Bug #1: Wrong Agent Display in Main Chat**
- **Issue**: Agent responses displaying with wrong icon/name (e.g., Architect showing as Coordinator)
- **Cause**: Inter-agent responses inherited `onPartialResponse` callback from original requester
- **Fix**: Strip `onPartialResponse` from inter-agent message context (`agentCommunication.ts:473`)
- **Result**: Inter-agent responses now only appear in inter-agent panel with correct attribution

**Bug #2: Emergency Stop Ineffective**
- **Issue**: STOP button didn't halt agents - required 2-3 presses, agents kept chatting
- **Cause**: Cleared message queue but didn't block NEW messages from being queued
- **Fix**: Added `isStopped` flag to block all new inter-agent messages after emergency stop
- **Result**: Emergency stop now immediately halts all agent communication

**Enhanced Emergency Stop:**
- Visible stop message injected into chat: "🛑 EMERGENCY STOP - HALT ALL OPERATIONS IMMEDIATELY"
- System confirmation: "⚠️ Emergency stop activated - All agent operations halted"
- Agents trained to recognize stop command in their system prompts
- Triple kill switch: process kill + queue clear + stop flag + visible message

**Unicode Support:**
- Fixed `btoa()` encoding error with Unicode characters (arrows, em-dashes) in inter-agent messages
- Added `encodeURIComponent()` wrapper for proper Unicode handling in message truncation

**Key Insights from Testing:**
- Initial message quality and framing significantly impacts agent behavior
- Coordinator's "CRITICAL RULES" messaging effectively sets conversation tone
- Agents naturally engage in multi-round discussions when properly configured
- Message ordering issue identified (display by completion time vs request time)

**Files Modified:**
- `src/agentCommunication.ts` - Emergency stop flag, onPartialResponse removal, message blocking
- `src/extension.ts` - Reset stop flag on new messages, inject visible stop messages
- `src/providers.ts` - Always parse responses for @mentions, emergency stop training
- `resources/webview/script.js` - Unicode encoding fix for message truncation

### v1.15.0 (2025-10-01) - External Configuration

**External Model Configuration:**
- Model definitions moved to JSON (`defaults/models.json`)
- Project-specific model overrides (`.machat/models.json`)
- 11+ models including **Claude Sonnet 4.5** ⭐
- ConfigurationRegistry for dynamic loading
- Commands: Open Models Config, Reset Models, Reload Configs
- No rebuild needed to add new models

**External Agent Configuration:**
- Agent definitions moved to JSON (`defaults/agents.json`)
- Project-specific agent overrides with smart merging (`.machat/agents.json`)
- Customize agents per project type (models, prompts, capabilities)
- Add custom agents (e.g., "Data Analyst", "Creative Director")
- Disable agents per project
- Commands: Open Agents Config, Reset Agents

**Benefits:**
- JSON-first approach (edit in VS Code with syntax highlighting)
- Git-friendly configuration (track changes, share with team)
- Project-specific AI configurations
- No Settings UI code needed (VS Code is the UI)

### v1.13.0 (2025-09-30)

**External Resources Refactor:**
- Extracted webview UI to `resources/webview/` external files
- Deleted template literal files (script.ts, ui.ts, uiStyles.ts)
- Removed 7,964 lines of template literal code
- Clean separation: HTML, CSS, JavaScript

**Inter-Agent Communication Polish:**
- Live inter-agent message display (transparent communication)
- Fixed message display order (ack → execution → summary)
- Loop prevention for acknowledgments
- Timestamp persistence and formatting
- STOP button kills all running Claude CLI processes

**Documentation Cleanup:**
- Removed all MCP server references from docs
- Updated architecture diagrams to 100% accuracy
- Concept-focused CODE_FLOWS.md (maintainable)
- Archived 4 implemented proposals

### v1.11.0 (2025-09-19)

**MCP Infrastructure Removed:**
- Simplified to direct Claude CLI calls
- Removed ~50 lines of MCP references
- Deleted 8 unused provider files

**Per-Project Settings:**
- `.machat/` folder structure
- Hierarchical settings system
- Project-local conversation storage

## Development Notes

- TypeScript strict mode enabled
- Targets ES2022, Node16 module system
- Minimum VS Code version: 1.94.0
- Main entry: `out/extension.js` (compiled from `src/extension.ts`)
- Extension activated on startup (`onStartupFinished`)
- Primary command: `multiAgentChat.openChat` (Ctrl+Shift+C)

## Testing

1. Clear all conversations: `Ctrl+Shift+P` → "Clear All Conversation History"
2. Test each agent individually
3. Test inter-agent communication with @mentions
4. Test team coordination (Quick vs Full mode)
5. Verify project settings isolation
6. Test conversation migration
7. Test STOP button kills all processes
8. Test floating window detachment

## Known Issues

- **RESOLVED in v1.15.1:** Settings UI removed - use Command Palette for API key management
- Some performance settings may need verification (requestManager, cache effectiveness)

## Contributing

When adding new features:
1. Follow existing architecture patterns
2. Update relevant documentation (especially if files/structure changes)
3. Test with both global and project settings
4. Ensure backward compatibility
5. Verify documentation accuracy (see `docs/internal/CONSOLIDATION_PLAN.md`)

## Documentation

See `docs/` for comprehensive documentation:
- **START_HERE.md** - Learning path for understanding the codebase
- **ARCHITECTURE_DIAGRAM.md** - System architecture with diagrams
- **CODE_FLOWS.md** - Conceptual flow documentation
- **QUICK_REFERENCE.md** - Developer cheat sheet
- **proposals/** - Active feature proposals (3 active, 4 archived)