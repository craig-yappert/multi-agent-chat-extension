# Changelog

All notable changes to the Multi Agent Chat extension will be documented in this file.

## [1.2.3] - 2025-09-17

### Unified Backend
- All agents now use Claude Sonnet model for consistent LLM backend
- Removed placeholder OpenAI and MCP providers - all agents functional with Claude
- Standardized all agents (except Team) to use the same Claude provider

## [1.2.2] - 2025-09-17

### Enhanced
- Team agent now properly coordinates responses from ALL 6 specialized agents
- Team agent synthesizes multiple agent responses into a unified team recommendation
- Improved agent color styling with full sidebar highlighting and icon backgrounds

### Fixed
- Removed "coming soon" fallback message from Team agent
- Team agent now provides meaningful consolidated responses instead of placeholder text
- Agent-specific colors now properly apply to both sidebar and icon backgrounds

## [1.2.1] - 2025-09-17

### Fixed
- Fixed Documenter agent returning placeholder responses - now properly uses Claude
- Fixed Reviewer agent returning placeholder responses - now properly uses Claude
- Fixed Executor agent returning placeholder responses - now properly uses Claude
- All agents now provide functional responses instead of "coming soon" messages

## [1.2.0] - 2025-09-17

### Visual Improvements
- Agent-specific colors now applied to chat message sidebars matching colors from agents.ts
- Response headers now show the actual agent name instead of generic "CLAUDE"
- Each agent's unique color creates visual distinction in conversations
- Improved agent identity visibility throughout the chat interface

## [1.1.9] - 2025-09-17

### Fixed
- Fixed 'claude-code' provider warning by updating to 'multi-agent-chat'
- Fixed selectAgent error trying to update removed UI element
- Removed references to selectedAgent element that no longer exists

## [1.1.8] - 2025-09-17

### UI Improvements
- Changed webview panel title from "Claude Code Chat" to "Multi Agent Chat"
- Removed agent selector button and dropdown - use @agent mentions instead
- @agent mentions are already case insensitive (e.g., @Team, @TEAM, @team all work)
- Cleaned up UI to focus on @ mention workflow

## [1.1.7] - 2025-09-17

### Documentation
- Completely rewritten README to reflect Multi Agent Chat functionality
- Updated extension description and metadata
- Removed references to original Claude Code Chat fork
- Added comprehensive agent descriptions and usage examples
- Restructured changelog for Multi Agent Chat focus

## [1.1.6] - 2025-09-17

### Fixed
- Agent selector now properly defaults to "Team" instead of showing "multi"
- Fixed null reference errors for settings elements
- Improved agent display initialization after DOM loads

## [1.1.5] - 2025-09-17

### Fixed
- Fixed updateStatus function accessing undefined DOM elements
- Added null checks for status display elements
- Moved status initialization to after DOM loads

## [1.1.4] - 2025-09-17

### Fixed
- Added comprehensive null checks for all addEventListener calls
- Protected all document.getElementById operations
- Fixed messageInput event listener attachment issues

## [1.1.3] - 2025-09-17

### Fixed
- Wrapped event listeners in setupEventListeners function
- Added DOM ready checks before element access
- Fixed undefined element errors during initialization

## [1.1.2] - 2025-09-17

### Fixed
- Fixed critical regex syntax error preventing script execution
- Properly escaped regex patterns in markdown parsing

## [1.1.1] - 2025-09-17

### Fixed
- Added debug logging to verify script loading
- Added version identification in console
- Fixed function scope issues

## [1.1.0] - 2025-09-17

### Fixed
- Moved script tag to head for proper function definition
- Functions now properly attached to window object
- Fixed onclick handler reference errors

## [1.0.9] - 2025-09-17

### Fixed
- Converted all functions to window-scoped definitions
- Fixed "function not defined" errors for onclick handlers

## [1.0.8] - 2025-09-17

### Fixed
- Added window function assignments for all onclick handlers
- Fixed scope issues with inline event handlers

## [1.0.7] - 2025-09-17

### Fixed
- Fixed regex escaping issues in script
- Version bump to clear extension cache

## [1.0.6] - 2025-09-17

### Stable Base Version
- Multi-agent chat system with 7 specialized agents
- Team, Architect, Coder, Executor, Reviewer, Documenter, and Coordinator agents
- MCP (Model Context Protocol) server integration
- Beautiful chat interface with markdown support
- Agent selector dropdown
- Settings panel with WSL support
- Thinking mode intensity levels
- Slash commands integration
- File and image attachment support
- Session management and history

## [1.0.5] - 2025-09-16

### Multi-Agent Implementation
- Implemented multi-agent routing system
- Added agent-specific providers
- Created specialized agent behaviors
- Enhanced team coordination capabilities

## [1.0.4] - 2025-09-16

### UI Improvements
- Simplified @ mentions for agent selection
- Cleaned up multi-agent experience
- Improved agent selector interface
- Enhanced message formatting

## [1.0.3] - 2025-09-16

### Provider System
- Implemented multi-provider system for AI agent routing
- Fixed Claude provider arguments
- Removed unsupported options

## [1.0.2] - 2025-09-16

### Agent System Foundation
- Added base agent infrastructure
- Implemented agent manager
- Created provider abstraction layer

## [1.0.1] - 2025-09-16

### Initial Fork
- Forked from Claude Code Chat extension
- Rebranded to Multi Agent Chat
- Updated package metadata
- Changed extension ID and publisher

## [1.0.0] - 2025-09-15

### Original Base
- Initial codebase from Claude Code Chat
- Basic chat interface
- MCP server support
- File and image attachment capabilities

---

## Agent Capabilities Summary

### 👥 Team Agent
- Coordinates between all agents
- Automatically delegates tasks to appropriate specialists
- Synthesizes responses from multiple agents
- Default agent for complex tasks

### 🏗️ Architect Agent
- System design and architecture planning
- Database schema design
- API design and documentation
- Design patterns and best practices
- Technical specifications

### 💻 Coder Agent
- Code implementation in any language
- Feature development
- Code refactoring
- Algorithm implementation
- Best practices enforcement

### ⚡ Executor Agent
- Command execution
- File operations
- Build and deployment tasks
- System integration
- Workflow automation

### 🔍 Reviewer Agent
- Code review and quality assurance
- Bug identification
- Security vulnerability detection
- Performance optimization suggestions
- Standards compliance

### 📝 Documenter Agent
- Technical documentation
- API documentation
- Code comments and docstrings
- User guides and manuals
- README and changelog maintenance

### 🤝 Coordinator Agent
- Task breakdown and planning
- Work coordination between agents
- Progress tracking
- Dependency management
- Workflow optimization

---

## Future Roadmap

### Planned Features
- Enhanced agent collaboration protocols
- Custom agent creation and training
- Agent performance analytics
- Advanced context sharing between agents
- Plugin system for extending agent capabilities
- Visual agent workflow designer
- Real-time collaboration features
- Integration with more AI providers