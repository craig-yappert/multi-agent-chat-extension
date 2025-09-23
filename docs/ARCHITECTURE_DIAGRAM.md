# Multi Agent Chat - Architecture Overview

## System Architecture

```mermaid
graph TB
    subgraph "VS Code Environment"
        VSCode[VS Code API]
        Commands[Commands]
        StatusBar[Status Bar]
        ActivityBar[Activity Bar]
    end

    subgraph "Extension Core"
        ExtMain[extension.ts<br/>Main Entry Point]
        ChatProvider[ClaudeChatProvider<br/>Main Controller]
        WebviewProvider[ClaudeChatWebviewProvider<br/>Sidebar Provider]
    end

    subgraph "UI Layer"
        Webview[Webview Panel]
        Script[script.ts<br/>UI Logic]
        UIStyles[uiStyles.ts<br/>Styling]
        SettingsUI[SettingsPanel.ts<br/>Settings UI]
    end

    subgraph "Agent System"
        AgentMgr[AgentManager<br/>Agent Registry]
        Agents[7 Agents:<br/>Team, Architect,<br/>Coder, Executor,<br/>Reviewer, Documenter,<br/>Coordinator]
        CommHub[AgentCommunicationHub<br/>Inter-agent Messages]
    end

    subgraph "Provider Layer"
        ProviderMgr[ProviderManager<br/>Provider Factory]
        Claude[ClaudeProvider<br/>Claude API]
        Multi[MultiProvider<br/>Team Coordination]
        MCP[MCPWebSocketProvider<br/>MCP Protocol]
    end

    subgraph "Data Layer"
        Settings[SettingsManager<br/>Config Hierarchy]
        ConvMgr[ConversationManager<br/>Chat History]
        ContextMgr[ProjectContextManager<br/>Agent Memory]
        Cache[ResponseCache<br/>5-min TTL]
    end

    subgraph "Storage"
        ProjectStorage[.machat/<br/>Project Local]
        GlobalStorage[Global<br/>Extension Storage]
        ConfigJSON[config.json<br/>Project Settings]
    end

    %% Connections
    VSCode --> ExtMain
    ExtMain --> ChatProvider
    ExtMain --> WebviewProvider

    ChatProvider --> Webview
    WebviewProvider --> Webview
    Webview <--> Script

    ChatProvider --> AgentMgr
    AgentMgr --> Agents
    AgentMgr --> CommHub

    ChatProvider --> ProviderMgr
    ProviderMgr --> Claude
    ProviderMgr --> Multi
    ProviderMgr --> MCP

    Multi --> CommHub
    CommHub --> Agents

    ChatProvider --> Settings
    ChatProvider --> ConvMgr
    ChatProvider --> ContextMgr

    Claude --> Cache

    Settings --> ProjectStorage
    Settings --> GlobalStorage
    ConvMgr --> ProjectStorage
    ConvMgr --> GlobalStorage
    ContextMgr --> ProjectStorage

    ProjectStorage --> ConfigJSON

    style ExtMain fill:#f9f,stroke:#333,stroke-width:4px
    style ChatProvider fill:#bbf,stroke:#333,stroke-width:2px
    style AgentMgr fill:#bfb,stroke:#333,stroke-width:2px
    style ProviderMgr fill:#fbf,stroke:#333,stroke-width:2px
```

## Data Flow Patterns

### 1. Message Flow (User → Agent → Response)

```mermaid
sequenceDiagram
    participant User
    participant UI as Webview UI
    participant Chat as ChatProvider
    participant Agent as AgentManager
    participant Provider as Provider
    participant Claude as Claude API

    User->>UI: Type message
    UI->>Chat: postMessage({type: 'sendMessage'})
    Chat->>Agent: selectBestAgent(message)
    Agent-->>Chat: Return agent config
    Chat->>Provider: sendMessage(msg, agent, context)
    Provider->>Claude: Spawn process/API call
    Claude-->>Provider: Response stream
    Provider-->>Chat: Complete response
    Chat->>UI: postMessage({type: 'response'})
    UI->>User: Display response
```

### 2. Team Collaboration Flow

```mermaid
sequenceDiagram
    participant User
    participant Team as Team Agent
    participant Multi as MultiProvider
    participant Hub as CommHub
    participant A1 as Architect
    participant A2 as Coder
    participant A3 as Reviewer

    User->>Team: Complex request
    Team->>Multi: sendMessage()
    Multi->>Multi: selectRelevantAgents()

    par Parallel Execution
        Multi->>A1: Query architect
        and
        Multi->>A2: Query coder
        and
        Multi->>A3: Query reviewer
    end

    Multi->>Hub: broadcast context
    A1-->>Hub: Share insights
    A2-->>Hub: Share code
    A3-->>Hub: Share review

    Hub-->>Multi: Collected responses
    Multi->>Multi: synthesizeResponse()
    Multi-->>Team: Combined response
    Team-->>User: Unified answer
```

### 3. Settings Hierarchy

```mermaid
graph TD
    subgraph "Settings Precedence (Lowest to Highest)"
        Default[Default Values]
        VSConfig[VS Code Settings<br/>settings.json]
        Global[Global Extension Settings<br/>multiAgentChat.*]
        Project[Project Settings<br/>.machat/config.json]
        Workspace[Workspace Settings<br/>.vscode/settings.json]
    end

    Default --> VSConfig
    VSConfig --> Global
    Global --> Project
    Project --> Workspace

    Workspace -->|Final| Applied[Applied Settings]

    style Applied fill:#9f9,stroke:#333,stroke-width:2px
```

## Component Responsibilities Matrix

| Component | Input | Processing | Output | Dependencies |
|-----------|-------|------------|--------|--------------|
| **extension.ts** | VS Code activation | Initialize all systems | Ready extension | All managers |
| **ChatProvider** | User messages | Route to agents | Agent responses | AgentMgr, ProviderMgr |
| **AgentManager** | Task description | Select best agent | Agent config | Agent definitions |
| **ProviderManager** | Message + Agent | Route to provider | AI response | Various providers |
| **ClaudeProvider** | Message + Context | Call Claude CLI | Text response | Claude CLI |
| **MultiProvider** | Team request | Coordinate agents | Synthesized response | CommHub, All agents |
| **CommHub** | Agent messages | Broadcast/route | Shared context | All agents |
| **SettingsManager** | Config changes | Merge hierarchies | Final settings | VS Code config |
| **ConversationManager** | Chat messages | Save/load chats | Persistence | File system |
| **ProjectContextManager** | Agent memories | Isolate by project | Context data | Project detection |

## State Management

```mermaid
stateDiagram-v2
    [*] --> Inactive: Extension Loaded
    Inactive --> Initializing: activate()
    Initializing --> Ready: All managers initialized

    Ready --> Processing: User sends message
    Processing --> WaitingProvider: Select agent/provider
    WaitingProvider --> Executing: Call AI provider
    Executing --> Streaming: Receive chunks
    Streaming --> Executing: More chunks
    Executing --> Responding: Complete response
    Responding --> Ready: Update UI

    Ready --> SettingsView: Open settings
    SettingsView --> Ready: Close settings

    Ready --> HistoryView: Load conversation
    HistoryView --> Ready: Conversation loaded

    Ready --> [*]: Deactivate
```

## Key Design Patterns

### 1. **Singleton Pattern**
- SettingsManager
- ConversationManager
- ProjectContextManager

### 2. **Factory Pattern**
- ProviderManager creates appropriate provider instances

### 3. **Observer Pattern**
- Settings change notifications
- Message streaming callbacks

### 4. **Strategy Pattern**
- Different providers implement AIProvider interface
- Agents selected based on task strategy

### 5. **Mediator Pattern**
- AgentCommunicationHub mediates inter-agent communication

## Performance Optimizations

```mermaid
graph LR
    subgraph "Optimization Layers"
        Cache[Response Cache<br/>5-min TTL]
        Stream[Streaming Responses<br/>Real-time feedback]
        Quick[Quick Team Mode<br/>3 agents vs 6]
        Timeout[Agent Timeouts<br/>12s default]
    end

    Request --> Cache
    Cache -->|Hit| FastResponse[Instant Response]
    Cache -->|Miss| Stream
    Stream --> Provider[AI Provider]

    TeamRequest --> Quick
    Quick -->|Enabled| ThreeAgents[Query 3 Agents]
    Quick -->|Disabled| AllAgents[Query 6 Agents]

    Provider --> Timeout
    Timeout -->|Success| Response
    Timeout -->|Timeout| Fallback[Partial Response]
```

## File System Layout

```
Project Root/
├── .machat/                    # Project-specific data
│   ├── config.json            # Project settings override
│   ├── conversations/         # Local conversation history
│   │   ├── index.json        # Conversation index
│   │   └── *.json           # Individual conversations
│   └── context/              # Agent memory/context
│       └── project-context.json
│
├── src/
│   ├── extension.ts          # Main entry point
│   ├── agents.ts            # Agent definitions
│   ├── providers.ts         # AI providers
│   ├── agentCommunication.ts # Inter-agent comm
│   ├── performanceOptimizer.ts # Optimization utilities
│   ├── script.ts           # Webview JavaScript
│   ├── ui.ts              # HTML generation
│   │
│   ├── settings/
│   │   └── SettingsManager.ts
│   ├── conversations/
│   │   └── ConversationManager.ts
│   ├── context/
│   │   └── ProjectContextManager.ts
│   └── commands/
│       └── MigrationCommands.ts
│
└── out/                    # Compiled JavaScript
    └── [mirrors src structure]
```

This architecture provides:
- **Modularity**: Each component has clear responsibilities
- **Scalability**: Easy to add new agents or providers
- **Flexibility**: Settings hierarchy allows customization
- **Performance**: Multiple optimization strategies
- **Persistence**: Conversations and context are preserved