# Multi Agent Chat Extension - Project Context

## Overview

Multi Agent Chat is a VS Code extension providing a collaborative AI team interface with 7 specialized agents (Team, Architect, Coder, Executor, Reviewer, Documenter, Coordinator) for software development tasks.

**Current Version:** 1.14.0 (Documentation Cleanup Release - 2025-09-30)

**Repository:** https://github.com/craig-yappert/multi-agent-chat-extension

## Architecture

### Core Components

1. **Agent System** (`src/agents.ts`)
   - 7 specialized agents with unique roles
   - Team agent coordinates multi-agent collaboration
   - Agent memory persists per project in `.machat/context/`

2. **Provider System** (`src/providers.ts`)
   - ClaudeProvider: Direct Claude CLI integration
   - MultiProvider: Team coordination
   - OpenAIProvider: Fallback (not fully implemented)

3. **Inter-Agent Communication** (`src/agentCommunication.ts`)
   - AgentCommunicationHub: Routes messages between agents
   - AgentMessageParser: Extracts @mentions from responses
   - Loop prevention (max depth 3, max 50 messages)
   - Live message display in UI

4. **UI Components** (`resources/webview/`)
   - External resources: index.html, script.js, styles.css
   - Floating window support
   - STOP button for process management
   - File attachment capability

5. **Settings Management** (`src/settings/SettingsManager.ts`)
   - Hierarchical: VS Code → Global → Project → Workspace
   - Project settings in `.machat/config.json`

6. **Storage** (`src/conversations/`, `src/context/`)
   - ConversationManager: Chat persistence
   - ProjectContextManager: Agent memory isolation
   - Per-project storage in `.machat/`

### Key Technologies

- **Language:** TypeScript (strict mode)
- **Target:** ES2022, Node16 modules
- **Platform:** VS Code Extension API (v1.94.0+)
- **AI Provider:** Claude CLI (direct integration)
- **Build:** TypeScript compiler, outputs to `out/`

### Project Structure

```
multi-agent-chat-extension/
├── src/
│   ├── settings/              # Hierarchical settings
│   ├── conversations/         # Chat persistence
│   ├── context/              # Agent memory
│   ├── commands/             # VS Code commands
│   ├── config/               # Model configurations
│   ├── ui/                   # Settings UI panel
│   ├── agents.ts             # Agent definitions
│   ├── providers.ts          # AI providers
│   ├── extension.ts          # Main controller
│   ├── agentCommunication.ts # Inter-agent hub
│   ├── agentMessageParser.ts # @mention parser
│   ├── performanceOptimizer.ts # Caching
│   └── requestManager.ts     # Request queue (unused)
├── resources/
│   └── webview/              # External UI files
│       ├── index.html
│       ├── script.js         (~6000 lines)
│       └── styles.css        (~2500 lines)
├── out/                      # Compiled JS (generated)
├── docs/                     # Documentation
│   ├── ARCHITECTURE_DIAGRAM.md
│   ├── CODE_FLOWS.md
│   ├── START_HERE.md
│   ├── QUICK_REFERENCE.md
│   ├── proposals/           # Feature proposals
│   └── archive/             # Historical docs
└── .machat/                 # Project storage
    ├── config.json          # Settings
    ├── conversations/       # Chat history
    └── context/            # Agent memory
```

## Guidelines

### Coding Standards

1. **TypeScript Strict Mode:** All code must pass strict type checking
2. **No Template Literals for UI:** Use external resources in `resources/webview/`
3. **Singleton Pattern:** Use `getInstance()` for managers (Settings, Conversation, Context)
4. **Error Handling:** Always wrap AI calls in try/catch
5. **File Paths:** Use absolute paths, never relative
6. **Documentation:** Update docs when file structure or architecture changes

### Naming Conventions

- **Classes:** PascalCase (e.g., `AgentManager`, `ClaudeProvider`)
- **Interfaces:** PascalCase with descriptive names (e.g., `AgentConfig`, `AIProvider`)
- **Files:** camelCase (e.g., `agentCommunication.ts`, `performanceOptimizer.ts`)
- **Settings:** `multiAgentChat.*` namespace (unified in v1.11.0)
- **Commands:** `multiAgentChat.*` namespace (e.g., `multiAgentChat.openChat`)

### Best Practices

1. **Avoid Line-Number-Specific Documentation:** Use concept-based docs that remain accurate
2. **Verify Before Writing:** Always read files before editing
3. **No MCP References:** MCP infrastructure removed in v1.11.0/v1.13.0
4. **External Resources:** UI changes go in `resources/webview/`, not template literals
5. **Commit Messages:** Use conventional commits with Claude Code attribution

## Current Focus (v1.14.0)

### Just Completed
- ✅ Documentation cleanup and accuracy updates
- ✅ Removed all MCP server references
- ✅ Archived implemented proposals
- ✅ Version bumped to 1.14.0

### Next Priorities

**v1.15.0 - External Model Configuration** (4-5 hours)
- Move model definitions from code to JSON
- Bundled `defaults/models.json` + project `.machat/models.json`
- Add Claude Sonnet 4.5 and latest models
- Users can edit models without extension rebuild

**v1.16.0 - Permission System** (6-8 hours)
- Tier 1: Inherit from Claude Code (when installed)
- Tier 2: Implement Claude Agent SDK permission patterns
- Tier 3: Fallback defaults
- Per-project `.machat/permissions.json`

**v1.17.0 - Settings UI Improvements**
- Fix non-rendering settings sections
- Better model selection UI
- Permission configuration UI

### Deferred
- Diff Viewer (moved to v1.18.0+)
- Dynamic Model Discovery (low priority)

## Known Issues

1. **Settings UI:** Only API Keys section renders, other sections not displaying
2. **RequestManager:** Implemented but not currently used (available for future queue management)
3. **Performance Settings:** Need verification that caching/streaming are fully wired
4. **OpenAIProvider:** Declared but not fully implemented (falls back to Claude)

## Recent Major Changes

### v1.13.0 (2025-09-30)
- External resources refactor (removed 7,964 lines of template literals)
- Inter-agent communication polish (live display, loop prevention)
- STOP button implementation
- Timestamp persistence

### v1.11.0 (2025-09-19)
- MCP infrastructure removed (simplified to direct Claude CLI)
- Per-project settings (`.machat/config.json`)
- Settings hierarchy system
- Branding unified to `multiAgentChat.*`

## Documentation

**Primary Docs:**
- `CLAUDE.md` - For Claude Code development (this file!)
- `README.md` - User-facing documentation
- `docs/START_HERE.md` - Learning path for understanding codebase
- `docs/ARCHITECTURE_DIAGRAM.md` - System architecture diagrams
- `docs/CODE_FLOWS.md` - Conceptual flow documentation
- `docs/QUICK_REFERENCE.md` - Developer cheat sheet

**Proposals:**
- `docs/proposals/EXTERNAL_MODEL_CONFIGURATION_PROPOSAL.md` (v1.15.0)
- `docs/proposals/AGENT_PERMISSIONS_PROPOSAL.md` (v1.16.0)
- `docs/proposals/CLAUDE_CODE_PARITY_FEATURES.md` (deferred)

**Archived:**
- `docs/archive/implemented/` - Completed feature proposals
- `docs/archive/plans/` - Historical planning documents

## Development Commands

```bash
# Compile TypeScript
npm run compile

# Watch mode
npm run watch

# Lint
npm run lint

# Test
npm test

# Package VSIX
npx vsce package --no-dependencies

# Debug
F5 in VS Code (launches Extension Development Host)
```

## Key Extension Commands

- `Ctrl+Shift+C` - Open Multi Agent Chat
- `Ctrl+Shift+P` → "Initialize Multi Agent Chat Project" - Create `.machat/` folder
- `Ctrl+Shift+P` → "Clear All Conversation History" - Reset conversations
- `Ctrl+Shift+P` → "Migrate Conversations to Project" - Move to local storage

---

*Last Updated: 2025-09-30 (v1.14.0)*
*Maintained by: Craig Yappert with Multi Agent Chat team*
