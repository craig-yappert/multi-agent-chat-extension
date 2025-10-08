# Changelog

All notable changes to the Multi Agent Chat extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.16.1] - 2025-10-02

### Added
- Model awareness in agent system prompts (agents know which model they're using)
- Model descriptions included in agent context for better self-awareness
- Smart initialization system for project setup
- "Update from Defaults" command for explicit config synchronization
- Safe-by-default initialization (never overwrites existing files)

### Changed
- `initializeProject` now copies models.json and agents.json from defaults
- Enhanced project auto-initialization with proper file management
- Smart picker UI shows relevant options based on existing files
- ConfigurationRegistry integration with ProviderManager and ClaudeProvider

### Fixed
- Hardcoded fallback agents now use proper model IDs from defaults
- Initialization no longer accidentally overwrites customized configurations

## [1.16.0] - 2025-10-02

### Added
- **Multi-Provider Support** - 3-tier provider architecture
  - VS Code Language Model API (GitHub Copilot, Continue.dev, etc.)
  - Direct HTTP APIs (OpenAI, Google Gemini, xAI Grok)
  - Claude CLI (backward compatible)
- Provider preference setting (claude-cli, auto, vscode-lm, direct-api)
- `defaults/providers.json` - Provider API configurations
- `docs/USER_GUIDE_PROVIDERS.md` - User setup guide
- `docs/ADDING_PROVIDERS.md` - Developer guide for adding providers
- New provider implementations:
  - `ProviderRegistry.ts` - Provider selection logic
  - `VSCodeLMProvider.ts` - VS Code Language Model integration
  - `HttpProvider.ts` - Base class for HTTP providers
  - `OpenAIHttpProvider.ts` - OpenAI and xAI support
  - `GoogleHttpProvider.ts` - Google Gemini support

### Changed
- Zero API keys needed with GitHub Copilot integration
- Community-friendly "auto" mode tries free providers first
- Backward compatible - existing Claude CLI setups unchanged

## [1.15.2] - 2025-10-02

### Added
- True multi-agent collaboration with recursive @mention parsing
- Enhanced emergency stop functionality with visible stop messages
- Unicode support in inter-agent messages

### Fixed
- **Critical:** Wrong agent display in main chat (agents showing with wrong icons/names)
- **Critical:** Emergency stop button ineffective (required multiple presses)
- Secondary @mentions not being routed to agents
- `isInterAgentResponse` flag blocking response parsing
- Unicode encoding errors in message truncation

### Changed
- Agents now parse ALL responses for @mentions (with loop prevention via depth/message limits)
- Removed `onPartialResponse` from inter-agent message context
- Added `isStopped` flag to block new messages after emergency stop
- System confirmation messages for emergency stop events

## [1.15.1] - 2025-10-01

### Added
- **Secure API Key Management** via VS Code SecretStorage
- Interactive "Manage API Keys" command in Command Palette
- Automatic migration from old settings.json storage
- Encrypted, OS-level credential storage

### Changed
- Settings UI removed - use Command Palette for API key management
- API keys never stored in plain text or committed to git

### Deprecated
- `multiAgentChat.apiKeys.*` settings (auto-migrated to SecretStorage)

## [1.15.0] - 2025-10-01

### Added
- **External Model Configuration** - Models defined in JSON files
  - `defaults/models.json` - Bundled model definitions (28+ models)
  - `.machat/models.json` - Project-specific model overrides
  - Support for Claude Sonnet 4.5 and latest models
- **External Agent Configuration** - Agents defined in JSON files
  - `defaults/agents.json` - Bundled agent definitions
  - `.machat/agents.json` - Project-specific agent customization
  - Smart merging of project overrides with defaults
  - Add custom agents, disable agents, modify capabilities
- ConfigurationRegistry for dynamic loading
- Commands:
  - "Open Models Configuration"
  - "Open Agents Configuration"
  - "Reset Models to Defaults"
  - "Reset Agents to Defaults"
  - "Reload Model Configurations"

### Changed
- No rebuild needed to add new models
- JSON-first approach with VS Code syntax highlighting
- Git-friendly configuration tracking

## [1.13.0] - 2025-09-30

### Added
- External webview resources in `resources/webview/` directory
- Live inter-agent message display (transparent communication)
- STOP button kills all running Claude CLI processes
- Loop prevention for acknowledgments
- Timestamp persistence and formatting

### Changed
- Extracted webview UI to external files (index.html, script.js, styles.css)
- Clean separation of HTML, CSS, and JavaScript
- Fixed message display order (ack → execution → summary)

### Removed
- Template literal files (script.ts, ui.ts, uiStyles.ts) - 7,964 lines removed
- All MCP server references from documentation

### Documentation
- Updated architecture diagrams to 100% accuracy
- Concept-focused CODE_FLOWS.md
- Archived 4 implemented proposals

## [1.11.0] - 2025-09-19

### Added
- Per-project settings and conversation storage
- `.machat/` folder structure for project-local data
- Hierarchical settings system (VS Code → Global → Project → Workspace)
- Project-local conversation storage

### Changed
- Simplified to direct Claude CLI calls
- MCP infrastructure removed for simplicity

### Removed
- ~50 lines of MCP references
- 8 unused provider files

## Earlier Versions

This fork is built upon [Claude Code Chat](https://github.com/andrepimenta/claude-code-chat) by André Pimenta.

### Core Features Inherited from Original
- Beautiful chat interface with markdown support
- Code block copying
- File attachment support
- Image and screenshot support
- Auto-resizing input area
- Floating window mode
- Real-time streaming responses

### Multi-Agent Enhancements (This Fork)
- 7 specialized AI agents (Architect, Coder, Executor, Reviewer, Documenter, Coordinator, Team)
- Inter-agent communication with @mentions
- Team collaboration mode
- Agent-specific capabilities and permissions
- Project context management
- Enhanced agent routing and delegation

---

[1.16.1]: https://github.com/craig-yappert/multi-agent-chat-extension/compare/v1.16.0...v1.16.1
[1.16.0]: https://github.com/craig-yappert/multi-agent-chat-extension/compare/v1.15.2...v1.16.0
[1.15.2]: https://github.com/craig-yappert/multi-agent-chat-extension/compare/v1.15.1...v1.15.2
[1.15.1]: https://github.com/craig-yappert/multi-agent-chat-extension/compare/v1.15.0...v1.15.1
[1.15.0]: https://github.com/craig-yappert/multi-agent-chat-extension/compare/v1.13.0...v1.15.0
[1.13.0]: https://github.com/craig-yappert/multi-agent-chat-extension/compare/v1.11.0...v1.13.0
[1.11.0]: https://github.com/craig-yappert/multi-agent-chat-extension/releases/tag/v1.11.0
