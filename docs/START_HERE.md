# 📚 Multi Agent Chat - Code Understanding Guide

Welcome! This guide will help you understand how the Multi Agent Chat extension works internally.

## 📖 Documentation Overview

I've created several documents to help you understand the codebase:

### 1. **[CODE_FLOWS.md](CODE_FLOWS.md)** - Detailed Function Flows
- Shows exactly how code flows through the system
- Covers 6 core scenarios with function-by-function breakdown
- Includes Mermaid diagrams for visual understanding
- **Start here to understand specific features**

### 2. **[ARCHITECTURE_DIAGRAM.md](ARCHITECTURE_DIAGRAM.md)** - System Architecture
- High-level system overview with visual diagrams
- Component relationships and responsibilities
- Data flow patterns and state management
- **Read this to understand the big picture**

### 3. **[QUICK_REFERENCE.md](QUICK_REFERENCE.md)** - Developer Cheat Sheet
- Key entry points for code reading
- Debugging tips and breakpoint locations
- Common code paths simplified
- **Keep this handy while coding**

## 🎯 Your Learning Path

### Day 1: Understanding the Basics
1. Read the **System Architecture** section in ARCHITECTURE_DIAGRAM.md
2. Study **Extension Initiation** flow in CODE_FLOWS.md
3. Open `src/extension.ts` and find the `activate()` function
4. Set a breakpoint and run the extension (F5)

### Day 2: Message Flow
1. Study **Single Agent Communication** in CODE_FLOWS.md
2. Set breakpoints at:
   - `extension.ts:550` (_handleMessage)
   - `providers.ts:39` (sendMessage)
3. Send a message and watch it flow through

### Day 3: Team Collaboration
1. Study **Multi-Agent/Team Communication** in CODE_FLOWS.md
2. Understand how `OptimizedMultiProvider` works
3. Try sending a message to the Team agent
4. Watch the Output panel for inter-agent communication

### Day 4: Customization
1. Review **Quick Reference** for modification tips
2. Try adding a console.log in `selectBestAgent()`
3. Change a default setting and see it apply
4. Modify the UI slightly in `ui.ts`

## 🔍 Key Concepts to Master

### 1. **The Message Loop**
```
UI → postMessage → _handleMessage → Agent → Provider → Claude → Response → UI
```

### 2. **Agent Selection**
- User can manually select an agent
- Or AgentManager.selectBestAgent() chooses based on keywords
- Team agent coordinates multiple agents

### 3. **Provider Pattern**
- ClaudeProvider: Direct Claude CLI calls
- MultiProvider: Team coordination
- MCPProvider: Enhanced capabilities

### 4. **Settings Hierarchy**
```
Default < VS Code < Global < Project < Workspace
```
Higher levels override lower levels.

### 5. **Storage Locations**
- Global: Extension's global storage
- Project: `.machat/` folder in project
- Settings cascade from global to project-specific

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
1. `extension.ts` - Main orchestrator
2. `agents.ts` - Agent definitions
3. `providers.ts` - AI provider logic
4. `script.ts` - UI behavior
5. Everything else builds on these

### Use VS Code Features
- **F12**: Go to Definition
- **Shift+F12**: Find All References
- **Ctrl+K Ctrl+0**: Fold all code
- **Ctrl+K Ctrl+J**: Unfold all code
- **Ctrl+Shift+O**: Go to symbol in file

## 🛠️ Making Your First Change

Try this simple modification:

1. Open `src/agents.ts`
2. Find the `defaultAgents` array (line 15)
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
A: `src/ui.ts` generates it dynamically

**Q: How do agents know their role?**
A: Defined in `src/agents.ts` defaultAgents array

**Q: Where are conversations saved?**
A: `.machat/conversations/` or global storage

**Q: How does streaming work?**
A: `StreamingClaudeProvider` in `performanceOptimizer.ts`

**Q: What triggers extension activation?**
A: `onStartupFinished` in `package.json:51`

## 🎓 Advanced Understanding

Once comfortable with basics:

1. Study `AgentCommunicationHub` for inter-agent messaging
2. Understand `ResponseCache` for performance
3. Learn how `ProjectContextManager` isolates agent memory
4. Explore `MCPServerManager` for advanced capabilities

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