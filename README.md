# 🤝 Multi Agent Chat - Collaborative AI Team for VS Code

[![VS Code Extension](https://img.shields.io/badge/VS%20Code-Extension-blue?style=for-the-badge&logo=visual-studio-code)](https://marketplace.visualstudio.com/)
[![Multi-Agent](https://img.shields.io/badge/Powered%20by-Multi--Agent%20AI-orange?style=for-the-badge)](https://github.com/craig-yappert/multi-agent-chat-extension)
[![TypeScript](https://img.shields.io/badge/Built%20with-TypeScript-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)

> **Work with a team of specialized AI agents, each expert in their domain, collaborating to solve your coding challenges.**

Transform your development workflow with Multi Agent Chat - a VS Code extension that provides you with an entire AI development team. Each agent specializes in different aspects of software development, working together or individually to help you build better software faster.

> 📌 **This extension is built upon the excellent foundation of [Claude Code Chat](https://github.com/andrepimenta/claude-code-chat) by André Pimenta, enhanced with multi-agent capabilities and specialized AI team features.**

---

## ✨ **Why Multi Agent Chat?**

🤝 **Specialized AI Team** - Seven expert agents, each focused on their domain
👥 **Collaborative Problem Solving** - Agents work together with @mentions
🎯 **Targeted Expertise** - Choose the right agent for the right job
💬 **Beautiful Chat Interface** - Intuitive UI with markdown support
⚡ **Smart Context Management** - Agents share context and collaborate
🛠️ **Flexible Workflow** - Work with individual agents or the entire team
🪟 **Floating Windows** - Detach chat to separate window

---

## 🤖 **Meet Your AI Team**

### 👥 **Team** (Default)

The collaborative hub that coordinates all agents. When you're not sure which agent to use or need multiple perspectives, the Team automatically delegates to the right specialists and synthesizes their responses.

### 🏗️ **Architect**

Your system design expert who:

- Designs application architecture and system structure
- Reviews and improves existing architecture
- Plans database schemas and API designs
- Recommends design patterns and best practices
- Creates technical specifications

### 💻 **Coder**

Your implementation specialist who:

- Writes clean, efficient code in any language
- Implements features based on specifications
- Refactors and optimizes existing code
- Follows coding best practices and conventions
- Handles algorithm implementation

### ⚡ **Executor**

Your automation and operations expert who:

- Executes commands and scripts
- Manages file operations and project structure
- Runs builds, tests, and deployments
- Handles system integration tasks
- Automates repetitive workflows

### 🔍 **Reviewer**

Your quality assurance specialist who:

- Reviews code for bugs and issues
- Suggests improvements and optimizations
- Ensures code quality and standards
- Identifies security vulnerabilities
- Validates implementation against requirements

### 📝 **Documenter**

Your documentation expert who:

- Writes clear, comprehensive documentation
- Creates API documentation and guides
- Generates code comments and docstrings
- Produces user manuals and README files
- Maintains changelog and release notes

### 🤝 **Coordinator**

Your project management specialist who:

- Breaks down complex tasks into steps
- Coordinates work between agents
- Tracks progress and dependencies
- Manages task prioritization
- Ensures smooth workflow integration

---

## 🌟 **Key Features**

### 💬 **Beautiful Chat Interface**

- Clean, modern UI integrated into VS Code
- Real-time streaming responses
- Full markdown support with syntax highlighting
- Code block copying with one click
- Auto-resizing input area
- Floating window mode (detach chat to separate window)
- STOP button to kill all running processes

### 🎯 **Smart Agent Selection & Inter-Agent Communication**

- Quick agent switcher in the chat interface
- Automatic agent recommendation based on task
- @mentions for specific agent requests (e.g., "@architect design a schema")
- Live inter-agent message display (see agents collaborate in real-time)
- Team mode for collaborative responses
- Loop prevention for safe inter-agent messaging

### 📁 **Context Management**

- File attachment support
- Image and screenshot support
- Smart file referencing
- Shared context between agents
- Per-project conversation storage (`.machat/` folder)

### ⚙️ **Advanced Configuration** ✨ NEW in v1.15.0

- **External Model Configuration** - Edit models in `.machat/models.json`
  - 11+ models including Claude Sonnet 4.5
  - Add/remove models without rebuilding extension
  - Project-specific model lists
- **External Agent Configuration** - Customize agents in `.machat/agents.json`
  - Modify agent capabilities, models, and prompts
  - Add custom agents (e.g., "Data Analyst", "Video Editor")
  - Disable agents not needed for your project
  - Smart merging with defaults
- Hierarchical settings: Global → Project → Workspace
- Project-specific settings in `.machat/config.json`
- Performance optimizations (caching, streaming, quick team mode)
- YOLO mode for power users

---

## 🚀 **Getting Started**

### Prerequisites

- **VS Code 1.94+** - Latest version recommended
- **Claude CLI** - Installed and configured with API key
  ```bash
  # Install Claude CLI
  npm install -g @anthropic-ai/claude-cli

  # Or via Homebrew (macOS)
  brew install claude
  ```

### Installation

1. **Install from VS Code Marketplace**

   ```
   ext install CraigYappert.multi-agent-chat
   ```

2. **Or install from VSIX**
   - Download the latest `.vsix` file from releases
   - Install via Command Palette: `Extensions: Install from VSIX...`

3. **Setup API Keys** ✨ NEW in v1.15.1
   - Use Command Palette: `Ctrl+Shift+P` → `Multi Agent Chat: Manage API Keys`
   - Enter your Claude API key (get one at [console.anthropic.com](https://console.anthropic.com/))
   - Optionally enter OpenAI API key
   - Keys are stored **securely** in VS Code's encrypted SecretStorage

4. **Open Multi Agent Chat**
   - Press `Ctrl+Shift+C` (or `Cmd+Shift+C` on Mac)
   - Or click the Multi Agent Chat icon in the activity bar
   - Or use Command Palette: `Multi Agent Chat: Open Chat`

---

## 💡 **Usage Examples**

### 🏗️ **Architecture Design**

```
You: @architect Design a scalable microservices architecture for an e-commerce platform

Architect: I'll design a comprehensive microservices architecture for your e-commerce platform...
[Detailed architecture with diagrams and explanations]
```

### 💻 **Implementation**

```
You: @coder Implement the user authentication service we just designed

Coder: I'll implement the authentication service based on the architecture...
[Complete implementation with best practices]
```

### 🔍 **Code Review**

```
You: @reviewer Review the authentication implementation for security issues

Reviewer: I'll perform a security-focused review of the authentication service...
[Detailed security analysis with recommendations]
```

### 👥 **Team Collaboration**

```
You: Help me build a real-time chat feature for my application

Team: I'll coordinate the team to help you build this feature:
- Architect will design the system
- Coder will implement the functionality
- Reviewer will ensure quality
- Documenter will create the documentation
[Comprehensive solution from multiple agents]
```

---

## ⚙️ **Configuration**

### Agent Selection

- Click the agent selector button (shows current agent name)
- Choose from Team, Architect, Coder, Executor, Reviewer, Documenter, or Coordinator
- Your selection persists across sessions

### Per-Project Settings

Initialize project-local settings and conversation storage:

1. Run: `Ctrl+Shift+P` → "Initialize Multi Agent Chat Project"
2. This creates a `.machat/` folder with:
   - `config.json` - Project-specific settings
   - `conversations/` - Local conversation history
   - `context/` - Agent memory for this project

### API Key Management ✨ NEW in v1.15.1

**Secure, encrypted storage** via VS Code SecretStorage:
- Command: `Ctrl+Shift+P` → `Multi Agent Chat: Manage API Keys`
- Keys never stored in plain text or committed to git
- Automatic migration from old settings
- Per-user, OS-level encryption

### Settings Configuration

Configure via VS Code settings (`multiAgentChat.*`):
- Default agent and model
- Inter-agent communication settings
- Performance options (caching, streaming, quick team mode)
- Permission policies
- ⚠️ **Note:** API key settings deprecated - use `Manage API Keys` command instead

---

## 🛠️ **Troubleshooting**

### Extension Not Loading

- Ensure VS Code is version 1.94 or higher
- Check that Claude CLI is installed: `claude --version`
- Reload VS Code window: `Developer: Reload Window`

### Agent Not Responding

- Verify Claude CLI is working: `claude "hello"`
- Check Claude API key is configured
- Check internet connection
- Try the STOP button to kill running processes and retry

### Inter-Agent Communication Not Working

- Verify setting: `multiAgentChat.agents.enableInterCommunication` is `true`
- Use proper @mention syntax: `@architect design a schema`
- Check Output panel: `View → Output → Multi-Agent Communication`

---

## 📝 **License**

This extension is released under the MIT License. See [LICENSE](LICENSE) file for details.

---

## 🤝 **Contributing**

Contributions are welcome! Please feel free to submit issues and pull requests on our [GitHub repository](https://github.com/craig-yappert/multi-agent-chat-extension).

---

## 📧 **Support**

For issues, feature requests, or questions:

- Open an issue on [GitHub](https://github.com/craig-yappert/multi-agent-chat-extension/issues)
- Contact the author: Craig Yappert

---

## 🙏 **Acknowledgments**

This project is a fork and extension of [Claude Code Chat](https://github.com/andrepimenta/claude-code-chat) by **André Pimenta**. We are deeply grateful for the excellent foundation and core functionality provided by the original project.

### Original Project Credits

- **Author**: André Pimenta
- **Repository**: [https://github.com/andrepimenta/claude-code-chat](https://github.com/andrepimenta/claude-code-chat)
- **License**: MIT

### Enhancements in This Fork

**v1.13.0 (2025-09-30):**
- External webview resources (clean separation of HTML/CSS/JS)
- Inter-agent communication with @mentions
- Live inter-agent message display
- Loop prevention for safe agent collaboration
- STOP button for process management
- Floating window support

**Core Features:**
- Multi-agent system with specialized AI roles (Architect, Coder, Reviewer, etc.)
- Team collaboration mode for complex tasks
- Per-project settings and conversation storage
- Enhanced agent routing and context management
- Direct Claude CLI integration (MCP removed for simplicity)

We've significantly evolved from the original foundation while maintaining the core philosophy of providing a great developer experience with AI assistance.

---

Built with ❤️ by Craig Yappert and the AI agents themselves
