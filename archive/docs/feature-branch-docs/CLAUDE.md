# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Multi-Agent Chat Extension - A VS Code extension providing a collaborative multi-agent AI chat interface with a beautiful UI, replacing terminal-based Claude Code interactions.

**Tech Stack**: TypeScript, VS Code Extension API, Webview UI
**Architecture**: VS Code extension with webview-based chat interface, multi-agent system, and MCP (Model Context Protocol) server integration

## Build & Development Commands

```bash
# Install dependencies
npm install

# Compile TypeScript (required before running)
npm run compile

# Watch mode for development
npm run watch

# Run linting
npm run lint

# Run tests
npm run test

# Build extension package (.vsix)
vsce package

# Debug in VS Code
# Press F5 or use "Run and Debug" panel to launch Extension Development Host
```

## Key Architecture Components

### Extension Structure
- **src/extension.ts**: Main extension entry point, manages webview panels and VS Code integration
- **src/ui.ts**: Generates the webview HTML/CSS/JavaScript for the chat interface
- **src/agents.ts**: Defines multi-agent system with different AI personas (Architect, Coder, Executor, etc.)
- **src/providers.ts**: Manages different AI provider integrations (Claude, OpenAI, MCP servers)
- **src/script.ts**: Client-side JavaScript for webview interactions and message handling

### Multi-Agent System
The extension supports collaborative AI agents with inter-agent communication:
- Agents can request help from other specialized agents
- Communication depth is configurable (1-5 levels)
- Each agent has specific roles and capabilities
- Supports various providers: Claude API, OpenAI, local models, MCP servers

### Key Features Implementation
- **Webview Communication**: Uses VS Code's postMessage API for bidirectional communication
- **File Context**: @-mention files to include in conversation context
- **Permission System**: Interactive dialogs for tool execution approval
- **Session Management**: Automatic conversation saving and restoration
- **MCP Integration**: Supports Model Context Protocol servers for extended functionality

## Important Development Notes

1. **Webview Security**: Content Security Policy is enforced - inline scripts must be in script.ts
2. **State Management**: Webview state persists across panel switches using getState/setState
3. **Path Handling**: Use vscode.Uri for resource paths in webviews
4. **TypeScript Strict Mode**: Enabled - ensure proper type checking
5. **Testing**: VS Code Test framework is configured but tests need implementation

## Configuration Settings

The extension uses VS Code workspace configuration:
- `claudeCodeChat.interAgent.maxDepth`: Controls agent collaboration depth (1-5)
- `claudeCodeChat.permissions.yoloMode`: Skip permission checks when enabled