# Multi Agent Chat Extension Documentation

Welcome to the documentation for the Multi Agent Chat VS Code Extension. This extension provides a collaborative AI team interface with specialized agents for software development tasks.

## Documentation Structure

### [Architecture](./architecture/README.md)
Technical architecture documentation including system design, MCP architecture, and inter-agent communication protocols.

- **ARCHITECTURE_REDESIGN.md** - Complete system redesign specifications
- **MCP_ARCHITECTURE.md** - Model Context Protocol implementation details
- **INTER_AGENT_COMM.md** - Inter-agent communication system documentation

### [Guides](./guides/README.md)
Setup guides, tutorials, and best practices for using the extension.

- **QUICK_START_v131.md** - Quick start guide for version 1.3.1
- **FAST_MODE_SETUP.md** - Configuration guide for performance optimization
- **PERFORMANCE_GUIDE.md** - Performance tuning and optimization strategies
- **MCP_VALIDATION_GUIDE.md** - MCP server validation and testing guide

### [Development](./development/README.md)
Developer documentation for contributing to and extending the extension.

- **CLAUDE.md** - Claude Code integration instructions
- **SESSION_CONTEXT.md** - Development session context and state management
- **TODO_NEXT_SESSION.md** - Development roadmap and task tracking

### [Releases](./releases/README.md)
Release notes and changelog for all versions.

- **changelog.md** - Complete version history
- **RELEASE_NOTES_v170.md** - Release notes for version 1.7.0
- **RELEASE_NOTES_v171.md** - Release notes for version 1.7.1

### [API](./api/README.md)
API documentation for extension interfaces and provider systems.

## Quick Links

- [Getting Started](./guides/QUICK_START_v131.md)
- [Architecture Overview](./architecture/ARCHITECTURE_REDESIGN.md)
- [Performance Optimization](./guides/PERFORMANCE_GUIDE.md)
- [Latest Release Notes](./releases/RELEASE_NOTES_v171.md)

## Extension Overview

Multi Agent Chat is a VS Code extension featuring:
- 7 specialized AI agents (Architect, Coder, Executor, Reviewer, Documenter, Coordinator, Team)
- MCP (Model Context Protocol) WebSocket server for fast communication
- Multiple provider backends (WebSocket, HTTP API, CLI)
- Performance optimizations including caching and streaming
- Collaborative multi-agent responses

For more information, see the main [README](../README.md) in the project root.