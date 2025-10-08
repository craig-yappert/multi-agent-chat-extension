# Multi Agent Chat - Code Flow Documentation

**Last Updated:** 2025-10-07 (v1.16.1)
**Status:** ✅ Accurate - focuses on concepts, not specific line numbers

---

This document explains how code flows through the Multi Agent Chat extension for core scenarios. Flows are presented conceptually to remain accurate as code evolves.

## Table of Contents

1. [Extension Initiation](#1-extension-initiation)
2. [Settings Change](#2-settings-change)
3. [Single Agent Communication](#3-single-agent-communication)
4. [Provider Selection (v1.16.0)](#4-provider-selection-v1160)
5. [Operation Execution (Phase 2)](#5-operation-execution-phase-2)
6. [Inter-Agent Communication (@mentions)](#6-inter-agent-communication-mentions)
7. [Team Coordination](#7-team-coordination)
8. [Conversation Persistence](#8-conversation-persistence)
9. [STOP Button Flow](#9-stop-button-flow)

---

## 1. Extension Initiation

When VS Code starts or the extension is activated:

```mermaid
graph TD
    A[VS Code Starts] --> B[activate function]
    B --> C[Create SettingsManager]
    C --> D[SettingsManager.initialize]
    D --> E[Create ConversationManager]
    E --> F[ConversationManager.ensureInitialized]
    F --> G[Create ProjectContextManager]
    G --> H[Create MigrationCommands]
    H --> I[MigrationCommands.registerCommands]
    I --> J[Create ClaudeChatProvider]
    J --> K[Register VS Code Commands]
    K --> L[Register Webview Provider]
    L --> M[Create Status Bar Item]
    M --> N[Extension Ready]
```

### Key Components Initialized

| Component | Purpose | Storage Location |
|-----------|---------|------------------|
| **SettingsManager** | Load hierarchical settings | VS Code config + `.machat/config.json` |
| **ConfigurationRegistry** | Load models/agents JSON | `defaults/` + `.machat/` (v1.15.0) |
| **ApiKeyManager** | Initialize secure key storage | VS Code SecretStorage (v1.15.1) |
| **ConversationManager** | Set up conversation storage | `.machat/conversations/` |
| **ProjectContextManager** | Initialize agent memory | `.machat/context/` |
| **PermissionEnforcer** | Initialize permission system | In-memory (Phase 1) |
| **OperationExecutor** | Initialize operation executor | In-memory (Phase 2) |
| **OperationLogger** | Initialize operation logging | VS Code workspaceState (Phase 2) |
| **MigrationCommands** | Register migration utilities | Command palette |
| **ClaudeChatProvider** | Main controller instance | In-memory |
| **AgentManager** | Load 7 agent definitions | ConfigurationRegistry (v1.15.0) |
| **ProviderManager** | Initialize AI providers | In-memory |
| **ProviderRegistry** | Initialize provider selection | In-memory (v1.16.0) |
| **AgentCommunicationHub** | Set up inter-agent messaging | In-memory |

### Files Involved

- `src/extension.ts` - Main activation function
- `src/config/ConfigurationRegistry.ts` - Load models/agents (v1.15.0)
- `src/settings/SettingsManager.ts` - Settings singleton
- `src/settings/ApiKeyManager.ts` - Secure key storage (v1.15.1)
- `src/conversations/ConversationManager.ts` - Conversation persistence
- `src/context/ProjectContextManager.ts` - Agent memory
- `src/permissions/PermissionEnforcer.ts` - Permission checks (Phase 1)
- `src/operations/OperationExecutor.ts` - Operation execution (Phase 2)
- `src/logging/OperationLogger.ts` - Operation logging (Phase 2)
- `src/agents.ts` - Agent definitions
- `src/providers.ts` - Provider implementations
- `src/providers/ProviderRegistry.ts` - Provider selection (v1.16.0)

---

## 2. Settings Change

When a user changes settings (via VS Code settings UI or `.machat/config.json`):

```mermaid
graph TD
    A[User Changes Setting] --> B[VS Code Config Change Event]
    B --> C[SettingsManager detects change]
    C --> D[SettingsManager.loadSettings]
    D --> E[Load VS Code settings]
    E --> F[Load Global settings]
    F --> G[Load Project settings from .machat]
    G --> H[Merge with precedence]
    H --> I[Notify dependent components]
    I --> J[Update runtime behavior]
```

### Settings Hierarchy (lowest to highest precedence)

1. Default values in code
2. VS Code global settings (`settings.json`)
3. Global extension settings
4. Project settings (`.machat/config.json`)
5. Workspace settings (`.vscode/settings.json`)

### Example Settings Flow

```typescript
// User changes: multiAgentChat.agents.enableInterCommunication = false
// → SettingsManager reloads all layers
// → Merges with precedence
// → AgentCommunicationHub sees change
// → Disables @mention parsing in future messages
```

---

## 3. Single Agent Communication

Standard message flow (no @mentions, no team coordination):

```mermaid
sequenceDiagram
    participant User
    participant Webview as script.js
    participant Provider as ClaudeChatProvider
    participant AgentMgr as AgentManager
    participant ProvMgr as ProviderManager
    participant Claude as ClaudeProvider
    participant CLI as Claude CLI Process

    User->>Webview: Type message + click send
    Webview->>Provider: postMessage({type: 'sendMessage'})
    Provider->>Provider: _handleMessage()
    Provider->>Provider: _processMessage()

    Provider->>AgentMgr: getAgent(agentId)
    AgentMgr-->>Provider: Agent config

    Provider->>ProvMgr: getProvider(agentConfig)
    ProvMgr->>ProvRegistry: selectProvider(model, preference)
    ProvRegistry-->>ProvMgr: Selected provider (v1.16.0)
    ProvMgr-->>Provider: Provider instance (Claude/VSCodeLM/Http)

    Provider->>Claude: sendMessage(msg, agent, context)
    Claude->>Claude: Check cache (5-min TTL)
    Claude->>CLI: spawn('claude', args) OR API call
    CLI-->>Claude: Response stream
    Claude->>Provider: Complete response

    Provider->>Provider: Save to ConversationManager
    Provider->>Webview: postMessage({type: 'agentResponse'})
    Webview->>User: Display response
```

### Key Decision Points

1. **Cache Check**: If identical request within 5 minutes, return cached response
2. **Streaming**: If enabled, send chunks to UI in real-time
3. **Context**: Include conversation history and project context

### Files Involved

- `resources/webview/script.js` - UI logic
- `src/extension.ts` - ClaudeChatProvider message handling
- `src/agents.ts` - Agent registry
- `src/providers.ts` - Provider routing and Claude CLI interaction
- `src/performanceOptimizer.ts` - Cache management

---

## 4. Provider Selection (v1.16.0)

How the system chooses which AI provider to use for a request:

```mermaid
sequenceDiagram
    participant User
    participant ProvMgr as ProviderManager
    participant Registry as ProviderRegistry
    participant Config as ConfigurationRegistry
    participant ApiKeys as ApiKeyManager
    participant Provider as Selected Provider

    User->>ProvMgr: Request with agent (has model)
    ProvMgr->>Registry: selectProvider(model, userPreference)

    Registry->>Config: getModel(modelId)
    Config-->>Registry: Model config with provider info

    Registry->>Registry: Check user preference
    Note over Registry: claude-cli, auto, vscode-lm, or direct-api

    alt User prefers claude-cli
        Registry->>Registry: Try Claude CLI first
    else User prefers vscode-lm
        Registry->>Registry: Only try VS Code LM API
    else User prefers direct-api
        Registry->>ApiKeys: Get API key for provider
        ApiKeys-->>Registry: API key (if configured)
        Registry->>Registry: Try HTTP provider
    else User prefers auto
        Registry->>Registry: Try VS Code LM first
        Registry->>Registry: Fall back to HTTP if key exists
        Registry->>Registry: Fall back to Claude CLI last
    end

    Registry-->>ProvMgr: Provider selection result
    ProvMgr->>Provider: Initialize provider instance
    Provider-->>ProvMgr: Ready to send message
    ProvMgr-->>User: Provider ready
```

### Provider Selection Logic

**Priority Order for "auto" mode:**
1. **VS Code Language Model API** - Free via Copilot, Continue.dev
2. **Direct HTTP API** - If API key configured
3. **Claude CLI** - Fallback for Claude models

**Key Decision Points:**
- User preference setting (`providerPreference`)
- Model availability on each provider
- API key configuration status
- Provider capability matching

### Files Involved

- `src/providers/ProviderRegistry.ts` - Provider selection logic
- `src/config/ConfigurationRegistry.ts` - Model metadata
- `src/settings/ApiKeyManager.ts` - API key retrieval
- `defaults/providers.json` - Provider configurations
- `defaults/models.json` - Model provider mappings

---

## 5. Operation Execution (Phase 2)

When an agent response contains operation markers, they get executed:

```mermaid
sequenceDiagram
    participant Agent
    participant Provider as ClaudeProvider
    participant Parser as OperationParser
    participant Executor as OperationExecutor
    participant Enforcer as PermissionEnforcer
    participant Logger as OperationLogger
    participant FS as File System

    Agent->>Provider: Response with [FILE_WRITE: path]...[/FILE_WRITE]
    Provider->>Parser: parseOperations(response)
    Parser->>Parser: Extract markers & content
    Parser-->>Provider: List of operations

    loop For each operation
        Provider->>Executor: executeOperation(op, agentId)

        Executor->>Executor: Resolve path (prevent traversal)
        Executor->>Executor: Validate workspace boundary

        Executor->>Enforcer: checkPermission(agent, opType, path)
        Enforcer->>Enforcer: Check agent permissions config
        Enforcer-->>Executor: Allow/Deny decision

        alt Permission granted
            Executor->>FS: Perform operation (write/read/delete)
            FS-->>Executor: Operation result
            Executor->>Logger: logOperation(success, details)
            Logger-->>Executor: Logged
            Executor-->>Provider: ✅ Success message
        else Permission denied
            Executor->>Logger: logOperation(denied, reason)
            Logger-->>Executor: Logged
            Executor-->>Provider: 🚫 Permission denied
        end

        Provider->>Parser: replaceMarker(operation, result)
    end

    Parser-->>Provider: Updated response with results
    Provider->>Agent: Display updated response to user
```

### Operation Types

- **FILE_WRITE** - Create or overwrite file
- **FILE_READ** - Read file contents
- **FILE_DELETE** - Delete file
- **FILE_APPEND** - Append to file
- **EXECUTE** - Run shell command
- **GIT** - Git operations

### Security Measures

1. **Path Resolution** - All paths resolved to absolute before checks
2. **Workspace Boundary** - Prevents access outside workspace
3. **Permission Enforcement** - Agent-specific permissions checked
4. **Operation Logging** - All operations logged for audit trail

### Files Involved

- `src/operations/OperationParser.ts` - Extract operations from text
- `src/operations/OperationExecutor.ts` - Execute file/command operations
- `src/permissions/PermissionEnforcer.ts` - Permission checks
- `src/logging/OperationLogger.ts` - Audit logging
- `src/providers.ts` - Parse & execute pipeline

---

## 6. Inter-Agent Communication (@mentions)

When an agent response contains @mentions (v1.13.0 feature):

```mermaid
sequenceDiagram
    participant User
    participant Coord as Coordinator Agent
    participant Parser as AgentMessageParser
    participant Hub as AgentCommunicationHub
    participant Arch as Architect Agent
    participant Coder as Coder Agent

    User->>Coord: "@coordinator ask @architect and @coder about X"
    Coord->>Coord: Generate response text
    Coord->>Parser: Parse for @mentions
    Parser-->>Coord: Commands: [{@architect}, {@coder}]

    Coord->>Hub: sendMessage(architect, "X", context)
    Hub->>Hub: Check loop prevention
    Hub->>Hub: Track conversation ID
    Hub->>Arch: Process via ProviderManager
    Arch-->>Hub: Architecture response
    Hub-->>Coord: Display in UI (live message)

    par Parallel execution
        Coord->>Hub: sendMessage(coder, "X", context)
        Hub->>Coder: Process via ProviderManager
        Coder-->>Hub: Code response
        Hub-->>Coord: Display in UI (live message)
    end

    Coord->>User: All responses visible in UI
```

### Loop Prevention

The AgentCommunicationHub prevents infinite loops by:

1. Tracking conversation depth (max 3 levels)
2. Limiting messages per conversation (max 50)
3. Blocking simple acknowledgment responses (< 100 chars)
4. Setting `isInterAgentResponse: true` flag to prevent nested @mentions

### Message Flow Example

```
User: "@coordinator ask @architect about database design"
  → Coordinator receives message
  → Generates initial response: "I'll consult the architect. @architect ..."
  → MessageParser extracts: [@architect]
  → CommHub sends to Architect with original context
  → Architect responds (visible live in UI)
  → Coordinator doesn't trigger new @mentions (isInterAgentResponse flag)
```

### Files Involved

- `src/agentMessageParser.ts` - Extract @mentions from responses
- `src/agentCommunication.ts` - Route messages, prevent loops
- `src/providers.ts` - Execute agent requests
- `resources/webview/script.js` - Display live inter-agent messages

---

## 7. Team Coordination

When user explicitly requests Team agent:

```mermaid
sequenceDiagram
    participant User
    participant Team as Team Agent
    participant Multi as MultiProvider
    participant Hub as CommHub
    participant A1 as Architect
    participant A2 as Coder
    participant A3 as Reviewer

    User->>Team: "Team, help with X"
    Team->>Multi: sendMessage(teamRequest)
    Multi->>Multi: selectRelevantAgents(request)

    Note over Multi: Quick Mode: 3 agents<br/>Full Mode: 6 agents

    par Parallel Agent Queries
        Multi->>A1: Query architect
        Multi->>A2: Query coder
        Multi->>A3: Query reviewer
    end

    A1-->>Multi: Architecture perspective
    A2-->>Multi: Code perspective
    A3-->>Multi: Review perspective

    Multi->>Multi: synthesizeResponse()
    Multi-->>Team: Combined response
    Team-->>User: Unified team answer
```

### Team Mode Optimization

- **Quick Team Mode** (default): Selects 3 most relevant agents
- **Full Team Mode**: Queries all 6 specialized agents
- Configured via: `multiAgentChat.performance.quickTeamMode`

### Agent Selection Strategy

```typescript
// MultiProvider analyzes request and selects:
// - Keywords match (e.g., "code" → Coder)
// - Complexity match (e.g., architecture question → Architect)
// - Task type (e.g., review → Reviewer)
```

### Files Involved

- `src/providers.ts` - MultiProvider coordination
- `src/performanceOptimizer.ts` - OptimizedMultiProvider
- `src/agentCommunication.ts` - Message broadcasting
- `src/agents.ts` - Agent capabilities and specializations

---

## 8. Conversation Persistence

How conversations are saved, indexed, and reloaded:

```mermaid
graph TD
    A[Message Sent/Received] --> B[ConversationManager.addMessage]
    B --> C{Project has .machat?}
    C -->|Yes| D[Save to .machat/conversations/]
    C -->|No| E[Save to global storage]

    D --> F[Update conversation file]
    F --> G[Update index.json]
    G --> H[Update ProjectContextManager]

    E --> I[Update global conversation file]
    I --> J[Update global index]

    H --> K[Conversation persisted]
    J --> K

    L[VS Code Reload] --> M[ConversationManager.ensureInitialized]
    M --> N[Load index.json]
    N --> O[Populate conversation list]
    O --> P[User selects conversation]
    P --> Q[Load conversation JSON]
    Q --> R[Replay messages to UI]
```

### Storage Structure

```
.machat/
├── conversations/
│   ├── index.json                    # List of all conversations
│   └── 2025-09-30_14-23_title.json  # Individual conversation
└── context/
    └── project-context.json          # Agent memories
```

### Conversation File Format

```json
{
  "id": "conv_abc123",
  "title": "Discussing architecture",
  "agent": "architect",
  "timestamp": "2025-09-30T14:23:00.000Z",
  "messages": [
    {
      "role": "user",
      "content": "Explain SOLID principles",
      "timestamp": "2025-09-30T14:23:05.000Z"
    },
    {
      "role": "assistant",
      "content": "SOLID stands for...",
      "timestamp": "2025-09-30T14:23:15.000Z"
    }
  ]
}
```

### Files Involved

- `src/conversations/ConversationManager.ts` - Save/load/index
- `src/context/ProjectContextManager.ts` - Agent memory
- `src/extension.ts` - Trigger saves on message completion

---

## 9. STOP Button Flow

When user clicks STOP to kill all running processes:

```mermaid
graph TD
    A[User Clicks STOP] --> B[Webview postMessage 'stopProcessing']
    B --> C[ClaudeChatProvider._handleMessage]
    C --> D[Call ProviderManager.killAllActiveProcesses]
    D --> E[ClaudeProvider.killAllProcesses]
    E --> F[Iterate activeProcesses Set]
    F --> G[Call process.kill on each]
    G --> H[Clear activeProcesses Set]
    H --> I[Clear message buffers]
    I --> J[Update UI: Ready state]
```

### Process Tracking

```typescript
// ClaudeProvider maintains activeProcesses Set
private activeProcesses: Set<cp.ChildProcess> = new Set();

// On spawn:
const process = cp.spawn('claude', args);
this.activeProcesses.add(process);

// On STOP:
this.activeProcesses.forEach(p => p.kill());
this.activeProcesses.clear();
```

### Files Involved

- `resources/webview/script.js` - STOP button UI
- `src/extension.ts` - Message routing
- `src/providers.ts` - Process management

---

## Common Patterns & Practices

### 1. Message Passing (Extension ↔ Webview)

```typescript
// Webview → Extension
vscode.postMessage({ type: 'sendMessage', data: userInput });

// Extension → Webview
webview.postMessage({ type: 'agentResponse', data: response, agent: {...} });
```

### 2. Singleton Managers

```typescript
// Always use getInstance() for managers
const settingsManager = SettingsManager.getInstance(context);
const conversationManager = ConversationManager.getInstance(context, settingsManager);
const contextManager = ProjectContextManager.getInstance(context, settingsManager);
```

### 3. Provider Routing

```typescript
// ProviderManager routes based on agent config
const provider = providerManager.getProvider(agentConfig);
// Returns: ClaudeProvider | OpenAIProvider | MultiProvider
```

### 4. Context Building

Every AI request includes:

- Conversation history (last N messages)
- Agent-specific context
- Project context (if `.machat/` exists)
- User's current file/selection (if relevant)

### 5. Error Handling

```typescript
// Always wrap AI calls in try/catch
try {
    const response = await provider.sendMessage(...);
    // Save and display
} catch (error) {
    // Show error in UI
    // Log to output channel
    // Don't crash extension
}
```

---

## Debugging Tips

### 1. Extension Output Channel

View detailed logs:

1. Open Output panel (View → Output)
2. Select "Multi-Agent Communication" from dropdown
3. See message routing, agent selection, errors

### 2. Message Flow Logging

Look for these console logs:

```
[ClaudeProvider] Using direct Claude CLI for architect
[AgentCommunicationHub] Broadcasting to 3 agents
[MessageParser] Found @mentions: ["architect", "coder"]
[Loop Prevention] Blocking acknowledgment loop
```

### 3. Conversation Files

Inspect actual conversation data:

```bash
cat .machat/conversations/2025-09-30_*.json
cat .machat/conversations/index.json
cat .machat/context/project-context.json
```

### 4. Settings Hierarchy

Check effective settings:

```typescript
// In extension.ts
const config = vscode.workspace.getConfiguration('multiAgentChat');
console.log('Effective settings:', config);
```

---

## Architecture Evolution

### v1.16.1 (2025-10-02)
- ✅ Model awareness in agent prompts
- ✅ Smart initialization (safe, no overwrites)
- ✅ ConfigurationRegistry integration

### v1.16.0 (2025-10-02)
- ✅ Multi-provider support (VS Code LM, HTTP providers, Claude CLI)
- ✅ ProviderRegistry for intelligent provider selection
- ✅ Provider preference setting (claude-cli, auto, vscode-lm, direct-api)

### v1.15.2 (2025-10-02)
- ✅ Fixed inter-agent @mention routing
- ✅ Enhanced emergency stop with visible messaging
- ✅ Unicode support in messages

### v1.15.1 (2025-10-02)
- ✅ Secure API key storage (VS Code SecretStorage)
- ✅ Interactive API key management

### v1.15.0 (2025-10-01)
- ✅ External configuration (models.json, agents.json)
- ✅ ConfigurationRegistry for dynamic configs
- ✅ Project-specific model/agent overrides

### v1.13.0 (2025-09-30)
- ✅ Inter-agent communication polish (@mentions fully working)
- ✅ External resources (webview in `resources/webview/`)
- ✅ Loop prevention for inter-agent messages
- ✅ STOP button kills all processes immediately

### v1.11.0 (2025-09-19)
- ✅ MCP infrastructure removed (simplified to direct Claude CLI)
- ✅ Per-project settings (`.machat/config.json`)
- ✅ Project-local conversation storage

### Phase 2 (2025-10-06)
- ✅ Operation execution system (file ops, command execution)
- ✅ Permission enforcement with workspace boundary checks
- ✅ Operation logging for audit trail
- ✅ Security fix: Path traversal vulnerability (2025-10-07)

---

*Flows accurate as of v1.16.1 (2025-10-07)*
*Focused on concepts rather than specific line numbers for maintainability*
*See `docs/architecture/ARCHITECTURE_DIAGRAM.md` for system architecture diagrams*
