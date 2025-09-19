# Changelog

All notable changes to the Multi Agent Chat extension will be documented in this file.

## [1.13.0] - 2025-09-19

### Added
- **Project-level agent configuration UI** - Configure each agent's model, provider, and settings
- Agent definition cards with provider/model selection
- Advanced settings (temperature, max tokens) with collapsible UI
- Centralized model configuration in `src/config/models.ts`
- Settings cascade indicator showing project vs global settings
- Sticky save/cancel buttons in settings panel
- Dynamic Model Discovery Proposal for future implementation

### Fixed
- Settings panel scrolling issues - all agent cards now accessible
- Removed duplicate Settings headers in UI
- Fixed Advanced button toggle text
- Resolved command registration inconsistencies
- Fixed conversation history loading from .machat folder

### Changed
- Simplified settings UI to focus on agent definitions
- Moved completed proposals to `docs/completed-proposals/`
- Updated model lists to include latest Claude and GPT models

### Technical
- Removed template literals in favor of string concatenation for better stability
- Improved CSS flexbox layout for settings panel
- Added proper overflow handling for scrollable content

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.13.0] - 2025-09-19

### 🔧 Polish & Consistency Update

This release focuses on final cleanup, consistency improvements, and ensuring proper conversation history management.

### Fixed
- **Command registration consistency** - Fixed "command not found" errors by unifying all command IDs to use `multiAgentChat.` prefix
- **Conversation history** - Now properly reads from `.machat` folder when available, with correct fallback to global storage
- **File naming conventions** - Standardized all source files to use camelCase (`ui-styles.ts` → `uiStyles.ts`)

### Removed
- **Legacy folder** `claude-code-chat-permissions-mcp` - Removed unused MCP permissions folder
- **Outdated references** - Cleaned up tsconfig.json and .vscodeignore

### Improved
- Conversation loading prioritizes project-local `.machat` storage
- Delete conversation now uses ConversationManager for proper cleanup
- Conversation index properly syncs with storage location

### Technical Details
- All commands now consistently use `multiAgentChat.` prefix
- ConversationManager handles all storage operations (read, write, delete)
- Removed direct workspaceState access for conversation management

## [1.12.0] - 2025-09-19

### 🔌 MCP Server Restoration

This release restores the MCP (Model Context Protocol) server functionality that was accidentally removed during the v1.11.0 cleanup, while maintaining all the branding and architecture improvements.

### Added
- **MCP Server restored** with full functionality
  - WebSocket server on port 3030 for real-time communication
  - HTTP API on port 3031 as fallback
  - Auto-start capability on extension activation
  - Server health monitoring and validation
- **MCP WebSocket Provider** for enhanced performance
  - Persistent WebSocket connections
  - Message queuing and routing
  - Automatic reconnection logic
- **MCP Commands restored**
  - `Start MCP Server`
  - `Stop MCP Server`
  - `Restart MCP Server`
  - `Toggle MCP Server`
  - `Show MCP Server Logs`
- **MCP Configuration settings**
  - `multiAgentChat.mcp.enabled` - Enable/disable MCP server
  - `multiAgentChat.mcp.autoStart` - Auto-start on activation
  - `multiAgentChat.mcp.wsPort` - WebSocket port configuration
  - `multiAgentChat.mcp.httpPort` - HTTP port configuration
  - `multiAgentChat.mcp.preferWebSocket` - Performance preference

### Fixed
- Restored README.md with proper André Pimenta attribution
- Updated all MCP server files to use unified `multiAgentChat` branding
- Integrated MCP server with cleaned codebase architecture

### Technical Details
- MCP server provides tool access for agents (file operations, commands)
- WebSocket provider tries MCP first, falls back to CLI if unavailable
- Maintains all v1.11.0 improvements (per-project settings, clean codebase)

## [1.11.0] - 2025-09-19

### 🎉 Major Cleanup Release

This release represents a significant cleanup and architectural improvement of the Multi Agent Chat extension, removing legacy code and unifying branding throughout the codebase.

### Added
- **Complete per-project settings implementation**
  - `SettingsManager` for hierarchical settings loading
  - `ConversationManager` for project-local conversation storage
  - `ProjectContextManager` for agent memory isolation
  - `MigrationCommands` for moving existing conversations

### Removed (30KB+ of legacy code)
- **Entire MCP server infrastructure** (`src/mcp-server/` directory)
- **WSL support and configuration** (all WSL-related code)
- **8 unused provider files**:
  - `FastTeamProvider.ts`
  - `FastTeamProviderV2.ts`
  - `SimpleWebSocketProvider.ts`
  - `IntelligentProvider.ts`
  - `webSocketTest.ts`
  - `localtest.ts`
  - `testInterAgent.ts`
  - `websocketManager.ts`
- **7 MCP-related commands** from package.json

### Changed
- **Unified branding**: All references changed from "claudeCodeChat" to "multiAgentChat"
- **Command IDs**: Standardized to `multiAgentChat.*` format
- **Package.json**: Reorganized settings into logical categories
  - API Keys
  - Global Settings
  - Agent Configuration
  - Project Settings
  - Performance
- **Simplified provider architecture** in `providers.ts`

### Fixed
- TypeScript compilation errors from legacy code removal
- Command ID inconsistencies throughout the extension
- Missing variable declarations (`claudeProcess`, `terminal`)
- Import statements for deleted files

### Performance
- **Package size reduced**: 1.5MB → 1.3MB (200KB reduction)
- **Faster extension activation** due to removed dependencies
- **Cleaner codebase** for easier maintenance

### Technical Details
- Removed ~30KB of unused/legacy code
- Fixed all branding references via automated script
- Cleaned up provider implementations
- Simplified extension architecture

## [1.10.0] - 2025-09-19

### Added
- **Per-project settings architecture** with `.machat` folder support
  - Project-local configuration management
  - Settings hierarchy: Global → Project → Workspace
  - Automatic `.machat` folder creation and management
- **Project-local conversation storage**
  - Conversations are now stored per-project in `.machat/conversations/`
  - Better organization and isolation of conversations by project
- **Migration utilities for existing conversations**
  - Automatic detection of legacy conversation data
  - Migration tools to move global conversations to project-local storage
  - Backward compatibility with existing conversation history
- **New commands for project management**
  - `Initialize Multi Agent Chat Project` - Sets up `.machat` folder structure
  - `Migrate Conversations to Project` - Moves existing conversations to current project
  - `Show Migration Status` - Displays migration progress and status
- **Enhanced settings management**
  - Hierarchical configuration loading with proper precedence
  - Project-specific overrides for global settings
  - Workspace-level configuration support

### Changed
- Settings architecture now supports project-local configuration
- Conversation storage moved from global to per-project structure
- Improved settings loading with hierarchical precedence

## [1.9.3] - 2025-01-18

### Added
- Agent memory system with conversation context persistence
- File operations support via Executor agent
- Agent tag persistence across sessions
- Delete conversation functionality
- Settings UI infrastructure (partial implementation)

### Fixed
- Agent metadata (name, icon, color) now saves with messages
- Tags properly reload when viewing conversation history
- Conversation context persists across session saves/loads

### Technical Details
- Each agent maintains last 10 exchanges (20 messages)
- Context included in agent prompts for coherent multi-turn conversations
- Automatic file creation from agent responses
- Pattern matching for file operations in responses