# 🤝 Multi Agent Chat - Collaborative AI Team for VS Code

[![VS Code Extension](https://img.shields.io/badge/VS%20Code-Extension-blue?style=for-the-badge&logo=visual-studio-code)](https://marketplace.visualstudio.com/)
[![Multi-Agent](https://img.shields.io/badge/Powered%20by-Multi--Agent%20AI-orange?style=for-the-badge)](https://github.com/craig-yappert/multi-agent-chat-extension)
[![TypeScript](https://img.shields.io/badge/Built%20with-TypeScript-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)

> **Work with a team of specialized AI agents, each expert in their domain, collaborating to solve your coding challenges.**

Transform your development workflow with Multi Agent Chat - a VS Code extension that provides you with an entire AI development team. Each agent specializes in different aspects of software development, working together or individually to help you build better software faster.

> 📌 **This extension is built upon the excellent foundation of [Claude Code Chat](https://github.com/andrepimenta/claude-code-chat) by André Pimenta, enhanced with multi-agent capabilities and specialized AI team features.**

---

## 🆕 **What's New in v1.16.1**

**Latest Updates (October 2025):**

✨ **Phase 2: Agents Can Actually Do Things!**
- **Operation Execution System** - Agents can now execute file operations and commands
- **Permission Enforcement** - Agent-specific permissions with workspace boundary checks
- **Operation Logging** - Complete audit trail of all operations
- **Security Fix** - Fixed HIGH severity path traversal vulnerability

🔐 **Enhanced Security:**
- Path resolution happens BEFORE permission checks (prevents directory traversal)
- Workspace boundary validation prevents access outside project
- Encrypted API key storage via VS Code SecretStorage
- Comprehensive operation logging for audit compliance

🎯 **Improved Developer Experience:**
- Model awareness in agent prompts (agents know their capabilities)
- Smart initialization (never overwrites existing configs)
- "Update from Defaults" command for syncing with latest configs
- JSON-based configuration (no rebuild needed)

🌍 **Community-Friendly:**
- **Works with free GitHub Copilot!** (zero API keys needed)
- Multi-provider support (OpenAI, Google Gemini, xAI, Claude CLI)
- "auto" mode tries free providers first

📚 **Better Documentation:**
- Reorganized into `docs/architecture/` and `docs/guides/`
- Updated for v1.16.1 with all latest features
- Clear learning paths and examples

See full version history in [CHANGELOG.md](CHANGELOG.md) and [docs/architecture/ARCHITECTURE_DIAGRAM.md](docs/architecture/ARCHITECTURE_DIAGRAM.md).

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

### 🔐 **Security & Operations** ✨ Phase 2

**Agents Can Actually Execute Operations:**
- **File Operations** - Create, read, update, delete files with proper validation
- **Command Execution** - Run shell commands, builds, tests, deployments
- **Git Operations** - Commit, push, branch management (with permission checks)
- **Operation Markers** - Agents use `[FILE_WRITE: path]...[/FILE_WRITE]` syntax
- **Real Execution** - No more hallucinations - operations actually happen!

**Security Features:**
- **Permission Enforcement** - Agent-specific permissions per operation type
- **Workspace Boundary** - Operations restricted to workspace (prevents path traversal)
- **Path Validation** - All paths resolved and validated BEFORE execution
- **Operation Logging** - Complete audit trail in VS Code workspaceState
- **Encrypted Keys** - API keys stored in OS-level encrypted storage

See [docs/proposals/PHASE_2_STATE_AND_ORCHESTRATION_CHALLENGE.md](docs/proposals/PHASE_2_STATE_AND_ORCHESTRATION_CHALLENGE.md) for implementation details.

### ⚙️ **Advanced Configuration**

**Model Configuration** ✨ v1.15.0
- Edit models in `.machat/models.json` (auto-created on first use)
- 28+ models including Claude Sonnet 4.5 (v1.16.1 model awareness)
- Add/remove models without rebuilding extension
- Project-specific model lists
- Commands: `Open Models Configuration`, `Reset Models to Defaults`, `Update from Defaults`

**Agent Configuration** ✨ v1.15.0
- Customize agents in `.machat/agents.json`
- **Custom Agent Prompts** (Markdown) - Add project-specific instructions in `.machat/agents/agent-prompts/`
  - Example: `.machat/agents/agent-prompts/coder.md` for coding standards
  - Layered approach: core behavior + project customization
  - No JSON escaping, git-friendly, rich formatting
- Modify agent capabilities, models, and system prompts
- Add custom agents (e.g., "Data Analyst", "Security Expert")
- Disable agents not needed for your project
- Smart merging with defaults
- Commands: `Open Agents Configuration`, `Reset Agents to Defaults`, `Update from Defaults`

**Provider Configuration** ✨ v1.16.0
- Choose provider preference: `multiAgentChat.providerPreference`
  - `auto` - Community-friendly (Copilot → API → CLI)
  - `vscode-lm` - Only VS Code Language Models
  - `direct-api` - Only direct HTTP APIs
  - `claude-cli` - Only Claude CLI
- See [docs/guides/USER_GUIDE_PROVIDERS.md](docs/guides/USER_GUIDE_PROVIDERS.md) for detailed setup

**Other Settings**
- Hierarchical settings: Global → Project → Workspace
- Project-specific settings in `.machat/config.json`
- Performance optimizations (caching, streaming, quick team mode)
- Permission policies and YOLO mode

---

## 🚀 **Getting Started**

### Prerequisites

- **VS Code 1.94+** - Latest version recommended

**Provider Options** ✨ NEW in v1.16.0 - Choose what works for you:

1. **Option A: Use GitHub Copilot (FREE for eligible users)**
   - Zero setup if you have GitHub Copilot or Continue.dev
   - Uses VS Code's Language Model API
   - **Recommended for community/open source users**

2. **Option B: Use Direct API (Your own keys)**
   - OpenAI, Google Gemini, or xAI Grok
   - Requires API key but works without subscription
   - Pay per use

3. **Option C: Use Claude CLI (For Claude Pro subscribers)**
   - Requires Claude Pro subscription
   - Install Claude CLI:
     ```bash
     npm install -g @anthropic-ai/claude-cli
     # Or: brew install claude (macOS)
     ```

### Installation

> **Note:** This extension is currently in **open source release** for community feedback. Not yet published to VS Code Marketplace.

1. **Download and Install**
   - Download the latest `.vsix` file from [GitHub Releases](https://github.com/craig-yappert/multi-agent-chat-extension/releases)
   - Install via Command Palette: `Extensions: Install from VSIX...`
   - Or drag and drop the `.vsix` file into VS Code

2. **Configure Provider** ✨ NEW in v1.16.0
   - Open VS Code Settings: `multiAgentChat.providerPreference`
   - Choose your preferred provider:
     - `auto` (default) - Try free providers first (Copilot → API → CLI)
     - `vscode-lm` - Use only VS Code Language Models (Copilot, Continue.dev)
     - `direct-api` - Use only direct HTTP APIs (OpenAI, Google, xAI)
     - `claude-cli` - Use only Claude CLI

3. **Setup API Keys (if using direct APIs or Claude CLI)** ✨ v1.15.1
   - Use Command Palette: `Ctrl+Shift+P` → `Multi Agent Chat: Manage API Keys`
   - Enter your API key based on your provider choice:
     - Claude: Get at [console.anthropic.com](https://console.anthropic.com/)
     - OpenAI: Get at [platform.openai.com](https://platform.openai.com/)
     - Google: Get at [aistudio.google.com](https://aistudio.google.com/)
     - xAI: Get at [x.ai](https://x.ai/)
   - Keys are stored **securely** in VS Code's encrypted SecretStorage
   - **Note:** Skip this step if using GitHub Copilot (Option A)

4. **Open Multi Agent Chat**
   - Press `Ctrl+Shift+C` (or `Cmd+Shift+C` on Mac)
   - Or click the Multi Agent Chat icon in the activity bar
   - Or use Command Palette: `Multi Agent Chat: Open Chat`

### 💬 **We Want Your Feedback!**

This project is in active development and we're seeking community input:
- What workflows would benefit from multiple AI agents?
- Which providers should we prioritize?
- What's missing from current AI coding assistants?
- How should multi-step tasks be orchestrated?

[Open an issue](https://github.com/craig-yappert/multi-agent-chat-extension/issues) or start a [discussion](https://github.com/craig-yappert/multi-agent-chat-extension/discussions) - we'd love to hear from you!

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

**v1.16.1 (2025-10-07):**
- **Security Fix** - Fixed HIGH severity path traversal vulnerability in OperationExecutor
- Model awareness in agent prompts (agents know which model they're using)
- Smart initialization system with safe defaults
- Enhanced project setup commands
- ConfigurationRegistry integration

**Phase 2 (2025-10-06):**
- **Operation Execution System** - Agents can execute file operations and commands
- **Permission Enforcement** - Agent-specific permissions with workspace boundary checks
- **Operation Logging** - Complete audit trail of all operations
- Path resolution before permission checks (security-first approach)

**v1.16.0 (2025-10-02):**
- **Multi-Provider Support** - VS Code LM API, OpenAI, Google, xAI, Claude CLI
- 3-tier provider architecture with flexible selection
- Zero API keys needed with GitHub Copilot
- Community-friendly "auto" mode

**v1.15.2 (2025-10-02):**
- True multi-agent collaboration with recursive @mention parsing
- Fixed critical bugs: wrong agent display, ineffective emergency stop
- Enhanced Unicode support

**v1.15.1 (2025-10-02):**
- Secure API key management via VS Code SecretStorage
- Encrypted, OS-level credential storage

**v1.15.0 (2025-10-01):**
- External model and agent configuration via JSON
- 28+ models including Claude Sonnet 4.5
- Project-specific customization
- No rebuild needed for configuration changes

**v1.13.0 (2025-09-30):**
- External webview resources (clean separation of HTML/CSS/JS)
- Inter-agent communication with @mentions
- Live inter-agent message display
- Loop prevention for safe agent collaboration
- STOP button for process management
- Floating window support

**v1.11.0 (2025-09-19):**
- Per-project settings and conversation storage (`.machat/` folder)
- Hierarchical settings system
- Direct Claude CLI integration (MCP removed for simplicity)

**Phase 1 (2025-09-18):**
- **Permission System Foundation** - Agent-specific permissions and soft enforcement
- Permission policies (Allow, Deny, Prompt, YOLO mode)
- Path-based restrictions for file operations

**Core Multi-Agent Features:**
- 7 specialized AI agents (Architect, Coder, Executor, Reviewer, Documenter, Coordinator, Team)
- Team collaboration mode for complex tasks
- Enhanced agent routing and context management
- Agent-specific permissions and capabilities

See [CHANGELOG.md](CHANGELOG.md) for complete version history.

We've significantly evolved from the original foundation while maintaining the core philosophy of providing a great developer experience with AI assistance.

---

Built with ❤️ by Craig Yappert and the AI agents themselves
