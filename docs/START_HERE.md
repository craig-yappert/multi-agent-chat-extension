# 📚 Multi Agent Chat - Code Understanding Guide

Welcome! This guide will help you understand how the Multi Agent Chat extension works internally.

## 📖 Documentation Overview

I've created several documents to help you understand the codebase:

### 1. **[CODE_FLOWS.md](architecture/CODE_FLOWS.md)** - Conceptual Code Flows

- Shows how code flows through the system conceptually
- Covers 9 core scenarios with component-level breakdowns
- Includes Mermaid diagrams for visual understanding
- **Start here to understand specific features**
- Now includes Provider Selection (v1.16.0) and Operation Execution (Phase 2)

### 2. **[ARCHITECTURE_DIAGRAM.md](architecture/ARCHITECTURE_DIAGRAM.md)** - System Architecture

- High-level system overview with visual diagrams
- Component relationships and responsibilities
- Data flow patterns and state management
- **Read this to understand the big picture**
- Updated with v1.15.0-v1.16.1 components

### 3. **[QUICK_REFERENCE.md](guides/QUICK_REFERENCE.md)** - Developer Cheat Sheet

- Key entry points for code reading
- Debugging tips and breakpoint locations
- Common code paths simplified
- **Keep this handy while coding**
- Updated with external configs and multi-provider support

## 🎯 Your Learning Path

### Day 1: Understanding the Basics

1. Read the **System Architecture** section in [ARCHITECTURE_DIAGRAM.md](architecture/ARCHITECTURE_DIAGRAM.md)
2. Study **Extension Initiation** flow in [CODE_FLOWS.md](architecture/CODE_FLOWS.md)
3. Open `src/extension.ts` and find the `activate()` function
4. Set a breakpoint and run the extension (F5)

### Day 2: Message Flow & Provider Selection

1. Study **Single Agent Communication** in [CODE_FLOWS.md](architecture/CODE_FLOWS.md)
2. Study **Provider Selection** flow (v1.16.0) to understand how providers are chosen
3. Set breakpoints at:
   - `extension.ts` in `_handleMessage()` method
   - `providers/ProviderRegistry.ts` in `selectProvider()` method
4. Send a message and watch it flow through

### Day 3: Inter-Agent Communication & Operations

1. Study **Inter-Agent Communication (@mentions)** in [CODE_FLOWS.md](architecture/CODE_FLOWS.md)
2. Study **Operation Execution** flow (Phase 2) to understand file operations
3. Understand how `AgentCommunicationHub` routes messages
4. Try using @mentions to trigger agent collaboration
5. Watch live inter-agent messages and operations appear in the UI

### Day 4: Customization with External Configs

1. Review **Quick Reference** for modification tips
2. Edit `defaults/models.json` or `.machat/models.json` to add a model
3. Edit `defaults/agents.json` or `.machat/agents.json` to customize agents
4. Create custom agent prompt: `.machat/agents/agent-prompts/coder.md`
5. Run "Reload Configurations" command to see changes (no restart needed!)

## 🔍 Key Concepts to Master

### 1. **The Message Loop**

```
UI → postMessage → _handleMessage → Agent → Provider → Claude → Response → UI
```

### 2. **Agent Selection**

- User can manually select an agent
- Or AgentManager.selectBestAgent() chooses based on keywords
- Team agent coordinates multiple agents

### 3. **Multi-Provider System (v1.16.0)**

- **ProviderRegistry**: Selects best provider for each model
- **ClaudeProvider**: Direct Claude CLI calls
- **VSCodeLMProvider**: VS Code Language Model API (Copilot, Continue.dev)
- **HttpProvider**: Direct HTTP API calls (OpenAI, Google, xAI)
- **MultiProvider**: Team coordination
- **Provider Preference**: User configures priority (claude-cli, auto, vscode-lm, direct-api)

### 4. **Configuration System (v1.15.0)**

- **ConfigurationRegistry**: Loads models and agents from JSON
- **Two-tier loading**: `defaults/` → `.machat/` (project overrides)
- **No rebuild needed**: Edit JSON, run "Reload Configurations"
- **Custom prompts**: Markdown files in `.machat/agents/agent-prompts/`

### 5. **Settings Hierarchy**

```
Default < VS Code < Global < Project < Workspace
```

Higher levels override lower levels.

### 6. **Storage Locations**

- **Global**: Extension's global storage
- **Project**: `.machat/` folder in project
- **Configs**: `defaults/` (bundled) + `.machat/` (project overrides)
- **API Keys** (v1.15.1): VS Code SecretStorage (encrypted)
- **Operation Logs** (Phase 2): VS Code workspaceState

### 7. **Security & Operations (Phase 2)**

- **PermissionEnforcer**: Agent-specific permissions
- **OperationExecutor**: Executes file/command operations
- **OperationLogger**: Audit trail of all operations
- **Path Resolution**: Prevents directory traversal attacks
- **Workspace Boundary**: Operations restricted to workspace

## 💡 Understanding Tips

### Follow One Message

Pick a simple message like "Hello" and trace it:

1. Where user types it (webview)
2. How it reaches the extension
3. Which agent handles it
4. How Claude is called
5. How response returns
6. How UI updates

### Read in This Order

1. `src/extension.ts` - Main orchestrator
2. `src/agents.ts` - Agent definitions
3. `src/providers.ts` - AI provider logic
4. `resources/webview/script.js` - UI behavior
5. `src/agentCommunication.ts` - Inter-agent messaging
6. Everything else builds on these

### Use VS Code Features

- **F12**: Go to Definition
- **Shift+F12**: Find All References
- **Ctrl+K Ctrl+0**: Fold all code
- **Ctrl+K Ctrl+J**: Unfold all code
- **Ctrl+Shift+O**: Go to symbol in file

## 🛠️ Making Your First Change

Try this simple modification:

1. Open `src/agents.ts`
2. Find the `defaultAgents` array
3. Change an agent's icon (e.g., Architect from 🏗️ to 🎨)
4. Run `npm run compile`
5. Press F5 to test
6. See your change in the agent selector!

## 📊 Code Statistics

To help set expectations, here's what you're working with:

- **Total TypeScript files**: ~20
- **Main logic files**: 5-6
- **Lines of code**: ~5,000
- **Key functions**: ~50
- **Agents**: 7
- **Providers**: 3-4

## 🤔 Common Questions

**Q: Where does the UI HTML come from?**
A: `resources/webview/index.html` with `script.js` and `styles.css`

**Q: How do agents know their role?**
A: Defined in `src/agents.ts` defaultAgents array

**Q: Where are conversations saved?**
A: `.machat/conversations/` (project-local) or global storage

**Q: How does streaming work?**
A: Response streaming in `performanceOptimizer.ts`

**Q: What triggers extension activation?**
A: `onStartupFinished` in `package.json`

## 🎓 Advanced Understanding

Once comfortable with basics:

1. Study `ConfigurationRegistry` for dynamic model/agent loading (v1.15.0)
2. Study `ProviderRegistry` for intelligent provider selection (v1.16.0)
3. Study `OperationExecutor` for secure file operations (Phase 2)
4. Study `PermissionEnforcer` for agent permission checks (Phase 1 & 2)
5. Study `AgentCommunicationHub` for inter-agent messaging and loop prevention
6. Study `AgentMessageParser` for @mention extraction
7. Understand `ResponseCache` for performance optimization
8. Learn how `ProjectContextManager` isolates agent memory per project
9. Explore the STOP button flow in `ClaudeProvider.killAllProcesses()`

## 🚦 Signs You Understand the Code

You're ready when you can:

- [ ] Explain how a message flows from UI to Claude
- [ ] Add a new command to the extension
- [ ] Change how an agent behaves
- [ ] Debug a message not appearing
- [ ] Add a new setting that works
- [ ] Explain what each major file does

## 📞 Getting Stuck?

1. Check the console logs (lots of helpful ones already there)
2. Set breakpoints at key functions
3. Read the specific flow in CODE_FLOWS.md
4. Trace backwards from where something appears
5. Remember: Most logic flows through `_handleMessage()`

---

**Remember**: This codebase is well-structured but complex. Take it one flow at a time, and you'll understand it piece by piece. Start with the basics, experiment with small changes, and gradually work up to bigger modifications.

Good luck with your code exploration! 🚀
