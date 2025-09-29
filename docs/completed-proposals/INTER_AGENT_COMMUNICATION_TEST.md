# Inter-Agent Communication Testing Guide

## What's Been Implemented

### 1. Message Loop Prevention
- **Max messages per conversation**: 10 (configurable)
- **Max conversation depth**: 5 (configurable)
- **Max concurrent agents**: 3 (configurable)
- Conversations automatically stop when limits are reached

### 2. Communication Methods

Agents can now use these formats to communicate:

#### Direct Messages
- `@architect: What's the best design for this?`
- `[[coder: Can you implement this function?]]`
- `ASK executor: Can you run the tests?`

#### Broadcast Messages
- `@all: I need everyone's input on this`
- `[[broadcast: Team meeting required]]`
- `BROADCAST: Critical issue found`

#### Coordination Requests
- `COORDINATE: We need to refactor the authentication system`
- `[[coordinate: Multi-agent task required]]`

### 3. Configuration Settings

New settings in VS Code (under Multi Agent Chat):
- `multiAgentChat.agents.enableInterCommunication` - Enable/disable inter-agent messaging (default: true)
- `multiAgentChat.agents.showInterCommunication` - Show agent conversations in UI (default: true)
- `multiAgentChat.interAgentComm.maxConcurrent` - Max agents processing at once (default: 3)
- `multiAgentChat.interAgentComm.maxMessagesPerConversation` - Max messages per conversation (default: 10)
- `multiAgentChat.interAgentComm.maxConversationDepth` - Max conversation depth (default: 5)

## Testing Instructions

### Test 1: Basic Direct Message
1. Select any agent (e.g., Architect)
2. Send: "I need help with database design. @coder: What do you think about using PostgreSQL?"
3. Expected: The Coder agent should receive and respond to the message

### Test 2: Broadcast Message
1. Select the Coordinator agent
2. Send: "We have a new feature to implement. @all: Please provide your perspective"
3. Expected: All agents should receive the message and provide responses

### Test 3: Loop Prevention
1. Select any agent
2. Try to create a message chain that would loop
3. Expected: After 10 messages or depth of 5, system should stop with limit message

### Test 4: Command Cleaning
1. Send a message with inter-agent commands
2. Expected: The commands should be executed but removed from the display (unless showInterCommunication is true)

## How It Works

1. **Message Parsing**: When an agent responds, the system scans for communication patterns
2. **Command Execution**: Detected commands are executed through AgentCommunicationHub
3. **Loop Prevention**: Message counts and depth are tracked per conversation
4. **Response Integration**: Inter-agent responses are integrated into the main response

## Architecture

```
User Message
    ↓
Agent (with inter-agent instructions in prompt)
    ↓
Agent Response (may contain @agent commands)
    ↓
AgentMessageParser (detects commands)
    ↓
AgentCommunicationHub (executes with limits)
    ↓
Target Agent(s) (process messages)
    ↓
Formatted Response (shown to user)
```

## Troubleshooting

### Agents not communicating?
1. Check `multiAgentChat.agents.enableInterCommunication` is true
2. Verify agents are using correct syntax (@agent: message)
3. Check output channel for communication logs

### Hitting limits too quickly?
1. Increase `maxMessagesPerConversation` in settings
2. Increase `maxConversationDepth` for deeper chains

### Not seeing inter-agent messages?
1. Enable `multiAgentChat.agents.showInterCommunication` in settings

## Example Scenarios

### Scenario 1: Code Review Request
```
User: "Review this authentication code"
Coder: "I've analyzed the code. @reviewer: Can you check for security issues?"
Reviewer: "Found potential SQL injection vulnerability..."
```

### Scenario 2: Architecture Discussion
```
User: "Design a microservices architecture"
Architect: "I propose... @all: What are your thoughts on this design?"
[All agents provide input]
```

### Scenario 3: Implementation Coordination
```
User: "Implement user management feature"
Coordinator: "COORDINATE: We need database schema, API endpoints, and frontend"
[Coordinator orchestrates multiple agents]
```