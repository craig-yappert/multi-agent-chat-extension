# 🤝 Multi Agent Chat - Collaborative AI Team for VS Code

[![VS Code Extension](https://img.shields.io/badge/VS%20Code-Extension-blue?style=for-the-badge&logo=visual-studio-code)](https://marketplace.visualstudio.com/)
[![Multi-Agent](https://img.shields.io/badge/Powered%20by-Multi--Agent%20AI-orange?style=for-the-badge)](https://github.com/craig-yappert/multi-agent-chat-extension)
[![TypeScript](https://img.shields.io/badge/Built%20with-TypeScript-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)

> **Work with a team of specialized AI agents, each expert in their domain, collaborating to solve your coding challenges.**

Transform your VS Code into a powerful AI development hub with **Multi Agent Chat** - an extension that provides you with a full team of specialized AI agents working together on your projects. Each agent brings unique expertise, from system architecture to code review, creating a collaborative environment that mirrors a real development team.

## 🌟 Key Features

### 👥 Seven Specialized Agents
- **🏗️ Architect** - System design, architecture planning, and high-level technical decisions
- **💻 Coder** - Implementation, feature development, and complex programming tasks
- **⚡ Executor** - File operations, command execution, testing, and system operations
- **🔍 Reviewer** - Code review, quality assurance, and best practices enforcement
- **📝 Documenter** - Documentation creation, code comments, and technical explanations
- **🤝 Coordinator** - Multi-agent orchestration, workflow management, and task delegation
- **👥 Team** - Full team collaboration, broadcasting to all agents for comprehensive solutions

### 🚀 Advanced Capabilities
- **Inter-Agent Communication** - Agents can communicate and collaborate with each other
- **Agent Memory System** - Each agent maintains conversation context (last 10 exchanges)
- **File Operations** - Executor agent can create and modify files directly
- **Persistent Sessions** - Save and reload conversations with full agent context
- **Smart Routing** - Messages automatically routed to the most appropriate agent
- **Visual Agent Identity** - Color-coded messages with agent icons for easy tracking

### ⚡ Performance Features
- **Fast Team Mode** - Get responses from multiple agents quickly
- **Response Caching** - 5-minute TTL for repeated queries
- **Streaming Support** - Real-time response updates
- **Adaptive Timeouts** - Intelligent timeout management
- **WebSocket & HTTP API** - Multiple backend options for reliability

## 📦 Installation

### From VS Code Marketplace
1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X)
3. Search for "Multi Agent Chat"
4. Click Install

### Manual Installation
```bash
# Clone the repository
git clone https://github.com/craig-yappert/multi-agent-chat-extension.git

# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Package the extension
npx vsce package

# Install the VSIX file in VS Code
code --install-extension multi-agent-chat-*.vsix
```

## 🎯 Quick Start

1. **Open the Extension**
   - Press `Ctrl+Shift+C` (Windows/Linux) or `Cmd+Shift+C` (Mac)
   - Or click the Multi Agent Chat icon in the activity bar

2. **Choose Your Agent**
   - Use `@agent` mentions to direct messages to specific agents
   - Examples:
     - `@coder implement a binary search algorithm`
     - `@architect design a microservices architecture for an e-commerce platform`
     - `@team help me refactor this codebase for better performance`

3. **Let Agents Collaborate**
   - Agents automatically hand off tasks to specialists when needed
   - The Team agent coordinates all agents for complex problems

## 💬 Agent Capabilities

### Architect 🏗️
- System architecture design
- API and database design
- Technology stack recommendations
- Scalability planning
- Design patterns and best practices

### Coder 💻
- Feature implementation
- Algorithm development
- Code refactoring
- Bug fixes
- Performance optimization

### Executor ⚡
- File creation and modification
- Command execution
- Test running
- Build processes
- Deployment operations

### Reviewer 🔍
- Code quality assessment
- Security audits
- Performance reviews
- Best practices enforcement
- Improvement suggestions

### Documenter 📝
- README creation
- API documentation
- Code comments
- User guides
- Technical specifications

### Coordinator 🤝
- Task breakdown and delegation
- Workflow orchestration
- Agent coordination
- Project planning
- Resource allocation

### Team 👥
- Multi-agent collaboration
- Comprehensive problem solving
- Brainstorming sessions
- Consensus building
- Knowledge synthesis

## ⚙️ Configuration

### Settings
Access settings through VS Code preferences or the Settings button in the chat interface:

```json
{
  "claudeCodeChat.interAgentComm.enabled": true,
  "claudeCodeChat.performance.enableStreaming": true,
  "claudeCodeChat.performance.enableCache": true,
  "claudeCodeChat.performance.quickTeamMode": false,
  "claudeCodeChat.mcp.enabled": true,
  "claudeCodeChat.mcp.autoStart": true
}
```

### Key Settings Explained
- **Inter-Agent Communication** - Enable agents to communicate with each other
- **Streaming** - Get responses as they're generated
- **Cache** - Cache responses for faster repeated queries
- **Quick Team Mode** - Use only 3 most relevant agents instead of all 6
- **MCP Server** - Enable WebSocket server for faster responses

## 🧹 Managing Conversations

### Clear All History
1. Press `Ctrl+Shift+P`
2. Type "Clear All Conversation History"
3. Confirm deletion

### Save/Load Conversations
- Conversations auto-save with agent context
- Access history through the 📚 History button
- Each conversation preserves agent memory

## 🛠️ Development

### Prerequisites
- Node.js 16+
- VS Code 1.94.0+
- Claude CLI (for full functionality)

### Build from Source
```bash
# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Watch mode for development
npm run watch

# Run tests
npm test

# Package extension
npx vsce package
```

### Testing
Press `F5` in VS Code to launch Extension Development Host

## 🤔 Troubleshooting

### Agent Not Responding
- Check Claude CLI installation: `claude --version`
- Verify VS Code version: 1.94.0 or higher
- Clear conversations and restart: `Ctrl+Shift+P` → "Clear All Conversation History"

### File Operations Not Working
- Ensure Executor agent is selected
- Check workspace permissions
- Verify file paths are correct

### Memory Issues
- Agent context limited to 20 messages (10 exchanges)
- Clear old conversations regularly
- Restart VS Code if memory usage is high

## 📝 Recent Updates

### v1.8.0+ (Latest)
- ✅ Fixed agent tag persistence across session reloads
- ✅ Implemented per-agent conversation memory
- ✅ Added file creation support for Executor agent
- ✅ Added "Clear All Conversations" command
- ✅ Enhanced conversation save/load with agent context

### v1.3.0 - v1.7.0
- Inter-agent communication framework
- Performance optimizations
- FastTeamProvider implementation
- MCP server support
- Response caching

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Areas for Contribution
- Custom agent creation
- Additional provider integrations
- UI/UX improvements
- Performance optimizations
- Documentation and examples

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

This extension is built on the foundation of [Claude Code Chat](https://github.com/andrepimenta/claude-code-chat) by Andre Pimenta. We've extended it with:
- Multi-agent architecture
- Team collaboration mode for complex tasks
- Enhanced agent routing and context management
- Specialized agent capabilities for different development tasks

We maintain full compatibility with the original Claude Code Chat features while extending its capabilities to provide a comprehensive AI development team experience.

---

Built with ❤️ by Craig Yappert and the AI agents themselves