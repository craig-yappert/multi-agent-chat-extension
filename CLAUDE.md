# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Multi Agent Chat is a VS Code extension that provides a collaborative AI team interface with specialized agents (Architect, Coder, Executor, Reviewer, Documenter, Coordinator, and Team) for software development tasks.

**Current Version:** 1.11.0 (Major Cleanup Release)

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

## Architecture Overview (v1.11.0)

### Core Components

**Agent System** (`src/agents.ts`)
- 7 specialized agents with unique roles and capabilities
- Team agent coordinates multi-agent collaboration
- Each agent configured with provider, model, and specializations
- Agent memory persists across sessions

**Provider System** (`src/providers.ts`)
- ClaudeProvider: Direct Claude CLI integration
- OpenAIProvider: Fallback to Claude (not yet implemented)
- MCPProvider: Pass-through to Claude
- MultiProvider: Team coordination
- **Legacy providers removed in v1.11.0**

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
- Inter-agent communication system
- Message broadcasting and routing between agents
- Context sharing for collaborative responses

**Performance Optimization** (`src/performanceOptimizer.ts`)
- Response caching (5-minute TTL)
- Streaming support for faster feedback
- Quick team mode (3 agents instead of 6)
- Configurable agent timeouts

**UI Components** (`src/webview/`)
- Webview-based chat interface
- Agent selector for switching between specialists
- Markdown rendering with syntax highlighting
- Settings panel (partially implemented)

## Project Structure

```
multi-agent-chat-extension/
├── src/
│   ├── settings/          # Settings management
│   ├── conversations/     # Conversation storage
│   ├── context/          # Project context
│   ├── commands/         # Migration commands
│   ├── agents.ts         # Agent definitions
│   ├── providers.ts      # AI providers (cleaned)
│   ├── extension.ts      # Main extension
│   └── webview/         # UI components
├── .machat/              # Project-local storage (in user projects)
│   ├── config.json       # Project settings
│   ├── conversations/    # Local conversations
│   └── context/         # Agent memory
└── package.json          # Extension manifest
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

## Recent Changes (v1.11.0)

### Removed
- Entire MCP server infrastructure
- WSL support and configuration
- 8 unused provider files
- 7 MCP-related commands
- ~30KB of legacy code

### Added
- Per-project settings architecture
- Project-local conversation storage
- Settings hierarchy management
- Migration commands

### Fixed
- Unified branding (claudeCodeChat → multiAgentChat)
- Command ID consistency
- TypeScript compilation errors
- Package size (1.5MB → 1.3MB)

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
3. Test team coordination
4. Verify project settings isolation
5. Test conversation migration

## Known Issues

- Settings UI only shows API Keys section (other sections not rendering)
- Some performance settings not fully wired up

## Contributing

When adding new features:
1. Follow existing architecture patterns
2. Update relevant documentation
3. Test with both global and project settings
4. Ensure backward compatibility
5. Update CHANGELOG.md