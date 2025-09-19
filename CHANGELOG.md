# Changelog

All notable changes to the Multi Agent Chat extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

### Technical Details
- Added `.machat/settings.json` for project-specific configuration
- Added `.machat/conversations/` directory for local conversation storage
- Enhanced settings manager with project detection and hierarchy support
- Migration utilities handle conversation data transfer seamlessly

## [1.9.3] - Previous Release
- Various bug fixes and performance improvements
- MCP server enhancements
- Inter-agent communication features