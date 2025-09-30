# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Multi Agent Chat is a VS Code extension that provides a collaborative AI team interface with specialized agents (Architect, Coder, Executor, Reviewer, Documenter, Coordinator, and Team) for software development tasks.

**Current Version:** 1.13.0 (External Resources & Inter-Agent Polish)

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

## Architecture Overview (v1.13.0)

### Core Components

**Agent System** (`src/agents.ts`)
- 7 specialized agents with unique roles and capabilities
- Team agent coordinates multi-agent collaboration
- Each agent configured with provider, model, and specializations
- Agent memory persists across sessions

**Provider System** (`src/providers.ts`)
- ClaudeProvider: Direct Claude CLI integration
- OpenAIProvider: Fallback to Claude (not yet implemented)
- MultiProvider: Team coordination
- **All MCP references removed in v1.13.0**

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
│   ├── agents.ts             # Agent definitions
│   ├── providers.ts          # AI providers
│   ├── extension.ts          # Main extension controller
│   ├── agentCommunication.ts # Inter-agent messaging hub
│   ├── agentMessageParser.ts # @mention parser
│   ├── performanceOptimizer.ts # Caching & optimization
│   └── requestManager.ts     # Request queue management
├── resources/
│   └── webview/              # External UI resources
│       ├── index.html        # HTML template
│       ├── script.js         # UI logic (~6000 lines)
│       └── styles.css        # Styling (~2500 lines)
├── .machat/                  # Project-local storage (in user projects)
│   ├── config.json           # Project settings
│   ├── conversations/        # Local conversations
│   └── context/             # Agent memory
├── out/                      # Compiled JavaScript (generated)
└── package.json              # Extension manifest
```

## Key Configuration Settings

The extension uses `multiAgentChat.*` settings (unified in v1.11.0):

### API Keys
- `multiAgentChat.apiKeys.claude` - Claude API key
- `multiAgentChat.apiKeys.openai` - OpenAI API key (optional)

### Global Settings
- `multiAgentChat.defaultModel` - Default AI model
- `multiAgentChat.defaultProvider` - Default provider
- `multiAgentChat.permissions.yoloMode` - Auto-approve actions
- `multiAgentChat.permissions.defaultPolicy` - Permission policy

### Agent Configuration
- `multiAgentChat.agents.defaultAgent` - Default agent to use
- `multiAgentChat.agents.enableInterCommunication` - Agent collaboration
- `multiAgentChat.agents.showInterCommunication` - Display agent chatter

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

- Settings UI only shows API Keys section (other sections not rendering)
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