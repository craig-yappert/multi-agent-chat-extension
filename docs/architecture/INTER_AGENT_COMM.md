# Inter-Agent Communication Feature

## Overview

The Inter-Agent Communication system enables direct message passing and coordination between AI agents, allowing for more sophisticated collaborative problem-solving and workflow orchestration.

## Key Components

### 1. AgentCommunicationHub
Central hub that manages all inter-agent communications, conversations, and workflows.

### 2. Message Types
- **Request**: Direct request from one agent to another
- **Response**: Reply to a request
- **Broadcast**: Message sent to multiple agents
- **Coordination**: Workflow coordination messages

### 3. Conversation Tracking
All inter-agent communications are tracked in conversations with unique IDs for debugging and analysis.

## Configuration

Enable inter-agent communication in VS Code settings:

```json
{
  "claudeCodeChat.interAgentComm.enabled": true,
  "claudeCodeChat.interAgentComm.showInUI": true,
  "claudeCodeChat.interAgentComm.maxConcurrent": 3
}
```

### Settings Description

- **enabled**: Turn inter-agent communication on/off
- **showInUI**: Display inter-agent messages in the chat UI
- **maxConcurrent**: Maximum number of agents that can communicate simultaneously (1-6)

## How It Works

### Standard Mode (Inter-Agent Comm Disabled)
When disabled, the Team agent polls all specialized agents independently and synthesizes their responses.

### Enhanced Mode (Inter-Agent Comm Enabled)
When enabled:
1. Agents can send messages directly to each other
2. Conversations are tracked with unique IDs
3. Agents can coordinate workflows
4. Messages are queued and processed with concurrency control
5. All communications are logged to the output channel

## Usage Examples

### Example 1: Team Collaboration
When you mention `@team` with inter-agent communication enabled:
- Team agent creates a conversation
- Broadcasts the request to all specialized agents
- Agents can communicate with each other during processing
- Team synthesizes the collaborative response
- Conversation ID is included in the response for tracking

### Example 2: Workflow Coordination
The Coordinator agent can orchestrate multi-step workflows:
1. Architect designs the system
2. Coder implements based on architecture
3. Reviewer checks the implementation
4. Documenter creates documentation

## Viewing Communication Logs

Open the Output panel in VS Code and select "Multi-Agent Communication" to view:
- Message exchanges between agents
- Conversation tracking
- Workflow progress
- Error messages

## Benefits

1. **Enhanced Collaboration**: Agents can share context and coordinate efforts
2. **Better Solutions**: Multiple perspectives are considered with direct feedback loops
3. **Workflow Automation**: Complex multi-step tasks can be orchestrated
4. **Transparency**: All communications are logged and trackable
5. **Flexibility**: Can be enabled/disabled per session as needed

## Performance Considerations

- Inter-agent communication adds processing time due to message passing
- Concurrency is limited by the maxConcurrent setting
- Each agent message requires a separate LLM call
- Best used for complex tasks that benefit from multi-agent collaboration

## Future Enhancements

- Visual workflow editor
- Agent memory persistence
- Custom workflow templates
- Real-time communication visualization
- Agent performance metrics