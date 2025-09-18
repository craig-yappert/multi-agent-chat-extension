# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Multi Agent Chat is a VS Code extension that provides a collaborative AI team interface with specialized agents (Architect, Coder, Executor, Reviewer, Documenter, Coordinator, and Team) for software development tasks. Built on Claude Code Chat foundation with enhanced multi-agent capabilities and MCP (Model Context Protocol) support.

## Essential Commands

### Development
- `npm run compile` - Compile TypeScript to JavaScript
- `npm run watch` - Watch mode for TypeScript compilation
- `npm run lint` - Run ESLint on src directory
- `npm test` - Run tests (compiles and lints first)
- `npm run vscode:prepublish` - Prepare for publishing

### Debugging Extension
- Press `F5` in VS Code to launch extension in new Extension Development Host window
- Or use "Run Extension" configuration in VS Code debugger

### Building VSIX Package
- `npx vsce package` - Create .vsix extension package for distribution

## Architecture Overview

### Core Components

**Agent System** (`src/agents.ts`)
- 7 specialized agents with unique roles and capabilities
- Team agent coordinates multi-agent collaboration
- Each agent configured with provider (claude/mcp/multi), model, and specializations

**Provider System** (`src/providers.ts`, `src/providers/`)
- ProviderManager handles routing between different backends
- Supports WebSocket (MCP), HTTP API, and CLI fallback
- Intelligent routing with adaptive performance metrics
- mcpWebSocketProvider for fast MCP server communication

**MCP Server** (`src/mcp-server/`)
- WebSocket server (default port 3030) for real-time agent communication
- HTTP API server (default port 3031) as fallback
- Server validation and health monitoring
- Auto-start capability with extension activation

**Communication Hub** (`src/agentCommunication.ts`)
- Inter-agent communication system
- Message broadcasting and routing between agents
- Context sharing for collaborative responses

**Performance Optimization** (`src/performanceOptimizer.ts`, `src/superFastMode.ts`)
- Response caching (5-minute TTL)
- Streaming support for faster feedback
- Quick team mode (3 agents instead of 6)
- Ultra-fast mode configuration
- First responders vs batched strategies

**UI Components** (`src/ui.ts`, `src/ui-styles.ts`)
- Webview-based chat interface
- Agent selector for switching between specialists
- Markdown rendering with syntax highlighting
- File drag-and-drop support

## Key Configuration Settings

The extension uses various `claudeCodeChat.*` settings:
- `wsl.*` - WSL integration for Windows users
- `mcp.*` - MCP server configuration (enabled, ports, auto-start)
- `performance.*` - Speed optimizations (streaming, cache, timeouts)
- `routing.*` - Backend selection preferences
- `interAgentComm.*` - Inter-agent communication settings

## Development Notes

- TypeScript strict mode enabled
- Targets ES2022, Node16 module system
- Minimum VS Code version: 1.94.0
- Main entry: `out/extension.js` (compiled from `src/extension.ts`)
- Extension activated on startup (`onStartupFinished`)
- Primary command: `claude-code-chat.openChat` (Ctrl+Shift+C)