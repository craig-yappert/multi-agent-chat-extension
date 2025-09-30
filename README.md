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
👥 **Collaborative Problem Solving** - Agents work together on complex tasks
🎯 **Targeted Expertise** - Choose the right agent for the right job
🔌 **MCP Server Integration** - Full Model Context Protocol support
💬 **Beautiful Chat Interface** - Intuitive UI with markdown support
⚡ **Smart Context Management** - Agents share context and collaborate
🛠️ **Flexible Workflow** - Work with individual agents or the entire team

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

### 🎯 **Smart Agent Selection**
- Quick agent switcher in the chat interface
- Automatic agent recommendation based on task
- @ mentions for specific agent requests
- Team mode for collaborative responses

### 📁 **Context Management**
- Drag and drop files into chat
- Image and screenshot support
- Smart file referencing
- Shared context between agents

### ⚙️ **Advanced Configuration**
- WSL support for Windows users
- Customizable settings per agent
- Thinking mode intensity levels
- YOLO mode for power users

---

## 🚀 **Getting Started**

### Prerequisites
- **VS Code 1.94+** - Latest version recommended
- **Claude Desktop** - With API key configured
- **Node.js** - For MCP server support (optional)

### Installation

1. **Install from VS Code Marketplace**
   ```
   ext install CraigYappert.multi-agent-chat
   ```

2. **Or install from VSIX**
   - Download the latest `.vsix` file from releases
   - Install via Command Palette: `Extensions: Install from VSIX...`

3. **Open Multi Agent Chat**
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

### WSL Integration (Windows)
For Windows users running Claude in WSL:
1. Open settings (gear icon)
2. Enable WSL integration
3. Configure your WSL distribution name
4. Set paths to Node.js and Claude

### MCP Servers
1. Click the MCP button (when available)
2. Add servers from the popular gallery or custom configurations
3. Manage permissions and tools

---

## 🛠️ **Troubleshooting**

### Extension Not Loading
- Ensure VS Code is version 1.94 or higher
- Check that Claude Desktop is installed and configured
- Reload VS Code window: `Developer: Reload Window`

### Agent Not Responding
- Verify Claude API key is configured
- Check internet connection
- Try selecting a different agent and switching back

### WSL Issues (Windows)
- Ensure WSL is installed and running
- Verify the distribution name in settings
- Check that Claude is installed in WSL

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
- Multi-agent system with specialized AI roles (Architect, Coder, Reviewer, etc.)
- Team collaboration mode for complex tasks
- Enhanced agent routing and context management
- Specialized agent capabilities for different development tasks

We maintain full compatibility with the original Claude Code Chat features while extending its capabilities to provide a comprehensive AI development team experience.

---

Built with ❤️ by Craig Yappert and the AI agents themselves