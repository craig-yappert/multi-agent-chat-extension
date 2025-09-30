# Multi Agent Chat - Architecture Overview

**Last Updated:** 2025-09-30 (v1.13.0)
**Status:** ✅ Accurate as of current codebase

---

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
        Resources[resources/webview/<br/>External Resources]
        Script[script.js<br/>UI Logic]
        Styles[styles.css<br/>Styling]
        HTML[index.html<br/>Template]
        SettingsUI[SettingsPanel.ts<br/>Settings UI]
    end

    subgraph "Agent System"
        AgentMgr[AgentManager<br/>Agent Registry]
        Agents[7 Agents:<br/>Team, Architect,<br/>Coder, Executor,<br/>Reviewer, Documenter,<br/>Coordinator]
        CommHub[AgentCommunicationHub<br/>Inter-agent Messages]
        MsgParser[AgentMessageParser<br/>Mention Parser]
    end

    subgraph "Provider Layer"
        ProviderMgr[ProviderManager<br/>Provider Factory]
        Claude[ClaudeProvider<br/>Claude CLI]
        OpenAI[OpenAIProvider<br/>OpenAI Fallback]
        Multi[MultiProvider<br/>Team Coordination]
    end

    subgraph "Data Layer"
        Settings[SettingsManager<br/>Config Hierarchy]
        ConvMgr[ConversationManager<br/>Chat History]
        ContextMgr[ProjectContextManager<br/>Agent Memory]
        Cache[ResponseCache<br/>5-min TTL]
        Optimizer[PerformanceOptimizer<br/>Streaming & Cache]
    end

    subgraph "Storage"
        ProjectStorage[.machat/<br/>Project Local]
        GlobalStorage[Global<br/>Extension Storage]
        ConfigJSON[config.json<br/>Project Settings]
        ConvJSON[conversations/<br/>Chat History]
        ContextJSON[context/<br/>Agent Memory]
    end

    %% Connections
    VSCode --> ExtMain
    ExtMain --> ChatProvider
    ExtMain --> WebviewProvider

    ChatProvider --> Webview
    WebviewProvider --> Webview
    Webview --> Resources
    Resources --> Script
    Resources --> Styles
    Resources --> HTML

    ChatProvider --> AgentMgr
    AgentMgr --> Agents
    AgentMgr --> CommHub
    CommHub --> MsgParser

    ChatProvider --> ProviderMgr
    ProviderMgr --> Claude
    ProviderMgr --> OpenAI
    ProviderMgr --> Multi

    Claude --> Optimizer
    Optimizer --> Cache
    Multi --> CommHub
    CommHub --> Agents

    ChatProvider --> Settings
    ChatProvider --> ConvMgr
    ChatProvider --> ContextMgr

    Settings --> ProjectStorage
    Settings --> GlobalStorage
    ConvMgr --> ProjectStorage
    ConvMgr --> GlobalStorage
    ContextMgr --> ProjectStorage

    ProjectStorage --> ConfigJSON
    ProjectStorage --> ConvJSON
    ProjectStorage --> ContextJSON

    style ExtMain fill:#f9f,stroke:#333,stroke-width:4px
    style ChatProvider fill:#bbf,stroke:#333,stroke-width:2px
    style AgentMgr fill:#bfb,stroke:#333,stroke-width:2px
    style ProviderMgr fill:#fbf,stroke:#333,stroke-width:2px
    style CommHub fill:#ffb,stroke:#333,stroke-width:2px
```

## Data Flow Patterns

### 1. Message Flow (User → Agent → Response)

```mermaid
sequenceDiagram
    participant User
    participant UI as Webview UI
    participant Chat as ChatProvider
    participant Agent as AgentManager
    participant Provider as ProviderManager
    participant Claude as ClaudeProvider

    User->>UI: Type message
    UI->>Chat: postMessage({type: 'sendMessage'})
    Chat->>Agent: selectBestAgent(message)
    Agent-->>Chat: Return agent config
    Chat->>Provider: getProvider(agent)
    Provider-->>Chat: ClaudeProvider instance
    Chat->>Claude: sendMessage(msg, agent, context)
    Claude->>Claude: Spawn Claude CLI process
    Claude-->>Chat: Response stream (if enabled)
    Chat->>UI: postMessage({type: 'agentResponse'})
    UI->>User: Display response
```

### 2. Inter-Agent Communication Flow (v1.13.0)

```mermaid
sequenceDiagram
    participant User
    participant Coord as Coordinator
    participant Parser as MessageParser
    participant Hub as CommHub
    participant Arch as Architect
    participant Coder

    User->>Coord: "@coordinator ask @architect and @coder about X"
    Coord->>Parser: Parse message for @mentions
    Parser-->>Coord: Found: [@architect, @coder]

    par Send to Architect
        Coord->>Hub: sendMessage(architect, "X")
        Hub->>Arch: Process request
        Arch-->>Hub: Architecture response
        Hub-->>Coord: Response from architect
    and Send to Coder
        Coord->>Hub: sendMessage(coder, "X")
        Hub->>Coder: Process request
        Coder-->>Hub: Code response
        Hub-->>Coord: Response from coder
    end

    Coord->>User: Display consolidated response
```

### 3. Settings Hierarchy

```mermaid
graph TD
    subgraph "Settings Precedence (Lowest to Highest)"
        Default[Default Values<br/>in code]
        VSConfig[VS Code Global Settings<br/>settings.json]
        Global[Global Extension Settings<br/>~/.config/Code/]
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

| Component | Location | Input | Processing | Output | Key Dependencies |
|-----------|----------|-------|------------|--------|------------------|
| **extension.ts** | `src/` | VS Code activation | Initialize all systems | Ready extension | All managers |
| **ChatProvider** | `src/extension.ts` | User messages | Route to agents | Agent responses | AgentMgr, ProviderMgr, Settings |
| **AgentManager** | `src/agents.ts` | Task description | Manage agent registry | Agent configs | Agent definitions |
| **ProviderManager** | `src/providers.ts` | Agent config | Route to correct provider | Provider instance | ClaudeProvider, MultiProvider |
| **ClaudeProvider** | `src/providers.ts` | Message + Context | Spawn Claude CLI | Text response | child_process, Cache |
| **MultiProvider** | `src/providers.ts` | Team request | Coordinate agents | Synthesized response | CommHub, All agents |
| **CommHub** | `src/agentCommunication.ts` | Agent messages | Route, track, prevent loops | Delivered messages | MessageParser, ProviderManager |
| **MessageParser** | `src/agentMessageParser.ts` | Agent response text | Extract @mentions | Command list | Regex patterns |
| **SettingsManager** | `src/settings/` | Config changes | Merge hierarchies | Final settings | VS Code API, file system |
| **ConversationManager** | `src/conversations/` | Chat messages | Save/load/index chats | Persistence | File system, SettingsManager |
| **ProjectContextManager** | `src/context/` | Agent memories | Isolate by project | Context data | File system, workspace detection |
| **PerformanceOptimizer** | `src/performanceOptimizer.ts` | Requests | Cache, stream, optimize | Optimized responses | Cache, streaming |

## State Management

```mermaid
stateDiagram-v2
    [*] --> Inactive: Extension Loaded
    Inactive --> Initializing: activate()
    Initializing --> InitSettings: Create SettingsManager
    InitSettings --> InitConversations: Create ConversationManager
    InitConversations --> InitContext: Create ProjectContextManager
    InitContext --> InitProvider: Create ChatProvider
    InitProvider --> Ready: Register commands

    Ready --> Processing: User sends message
    Processing --> SelectingAgent: AgentManager.selectBestAgent()
    SelectingAgent --> CheckingInterAgent: Check for @mentions
    CheckingInterAgent --> DirectCall: No @mentions
    CheckingInterAgent --> InterAgentComm: Has @mentions

    DirectCall --> CallingProvider: ProviderManager.getProvider()
    CallingProvider --> Executing: Call AI provider

    InterAgentComm --> BroadcastMessage: CommHub.sendMessage()
    BroadcastMessage --> ExecutingMultiple: Multiple agent calls
    ExecutingMultiple --> CollectingResponses: Gather responses
    CollectingResponses --> Executing: Continue

    Executing --> Responding: Complete response
    Responding --> Saving: ConversationManager.save()
    Saving --> Ready: Update UI

    note right of Executing: Streaming enabled: chunks sent in real-time

    Ready --> SettingsView: Open settings
    SettingsView --> Ready: Close settings

    Ready --> HistoryView: Load conversation
    HistoryView --> Ready: Conversation loaded

    Ready --> StopProcessing: STOP button clicked
    StopProcessing --> KillingProcesses: Kill all Claude processes
    KillingProcesses --> Ready: Processes killed

    Ready --> [*]: Deactivate
```

## Key Design Patterns

### 1. **Singleton Pattern**

Used for managers that should have single instances:

- `SettingsManager.getInstance()`
- `ConversationManager.getInstance()`
- `ProjectContextManager.getInstance()`

### 2. **Factory Pattern**

`ProviderManager` creates appropriate provider instances based on agent configuration:

```typescript
getProvider(agentConfig: AgentConfig): AIProvider {
    switch (agentConfig.provider) {
        case 'claude': return this.claudeProvider;
        case 'openai': return this.openaiProvider;
        case 'multi': return this.multiProvider;
    }
}
```

### 3. **Observer Pattern**

- Settings change notifications trigger re-initialization
- Message streaming uses callbacks for real-time updates:

```typescript
onStreamCallback?: (chunk: string, agentId: string) => void
```

### 4. **Strategy Pattern**

- Different providers implement `AIProvider` interface
- Each agent has a `provider` field determining routing strategy

### 5. **Mediator Pattern**

- `AgentCommunicationHub` mediates all inter-agent communication
- Prevents loops, tracks conversations, manages queue

## Performance Optimizations

```mermaid
graph LR
    subgraph "Optimization Layers"
        Cache[ResponseCache<br/>5-min TTL]
        Stream[Streaming Responses<br/>Real-time feedback]
        Quick[Quick Team Mode<br/>3 agents vs 6]
        Timeout[Agent Timeouts<br/>Configurable]
        STOP[STOP Button<br/>Kill all processes]
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
    Timeout -->|Timeout| PartialResponse[Partial Response]

    User --> STOP
    STOP --> KillProcesses[Kill all Claude CLI]
    KillProcesses --> CleanState[Ready for new request]
```

## File System Layout (v1.13.0)

```
Project Root/
├── .machat/                      # Project-specific data (gitignored by default)
│   ├── config.json              # Project settings override
│   ├── conversations/           # Local conversation history
│   │   ├── index.json          # Conversation index
│   │   └── 2025-09-30_*.json  # Individual conversations
│   └── context/                # Agent memory/context
│       └── project-context.json # Per-agent conversation state
│
├── resources/                   # Extension resources
│   └── webview/                # Webview UI (external files)
│       ├── index.html          # HTML template
│       ├── script.js           # UI logic (6000+ lines)
│       └── styles.css          # Styling (2500+ lines)
│
├── src/
│   ├── extension.ts            # Main entry point, ChatProvider
│   ├── agents.ts              # Agent definitions (7 agents)
│   ├── providers.ts           # AI providers (Claude, OpenAI, Multi)
│   ├── agentCommunication.ts # Inter-agent communication hub
│   ├── agentMessageParser.ts # @mention parsing
│   ├── performanceOptimizer.ts # Optimization utilities
│   ├── requestManager.ts      # Request queue management
│   │
│   ├── settings/
│   │   └── SettingsManager.ts # Hierarchical settings
│   ├── conversations/
│   │   └── ConversationManager.ts # Chat persistence
│   ├── context/
│   │   └── ProjectContextManager.ts # Agent memory
│   ├── commands/
│   │   └── MigrationCommands.ts # Migration utilities
│   ├── config/
│   │   └── models.ts          # Model configurations
│   └── ui/
│       └── SettingsPanel.ts   # Settings UI
│
└── out/                        # Compiled JavaScript
    └── [mirrors src structure]
```

## Key Architecture Changes (History)

### v1.13.0 (2025-09-30)

✅ **External Resources Refactor**

- Moved webview UI to `resources/webview/` external files
- Eliminated template literal hell (7,964 lines removed)
- Clean separation: HTML, CSS, JavaScript

✅ **Inter-Agent Communication Polish**

- Live message display (transparent communication)
- Loop prevention for acknowledgments
- Message display order (ack → execution → summary)
- Timestamp persistence and formatting

### v1.11.0 (2025-09-19)

✅ **MCP Infrastructure Removed**

- Deleted MCP WebSocket server
- Simplified to direct Claude CLI calls
- Removed ~50 lines of MCP references

✅ **Per-Project Settings**

- `.machat/` folder structure
- Hierarchical settings system
- Project-local conversation storage

## This Architecture Provides

- ✅ **Modularity**: Each component has clear, single responsibility
- ✅ **Scalability**: Easy to add new agents or providers
- ✅ **Flexibility**: Settings hierarchy allows deep customization
- ✅ **Performance**: Caching, streaming, parallelization
- ✅ **Persistence**: Conversations and context preserved per-project
- ✅ **Transparency**: Inter-agent messages visible in UI
- ✅ **Control**: STOP button kills all running processes immediately

---

*Architecture accurate as of v1.13.0 (2025-09-30)*
*See `docs/internal/CONSOLIDATION_PLAN.md` for planned documentation improvements*
