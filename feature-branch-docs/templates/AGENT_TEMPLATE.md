# [Agent Name] Agent

## Overview
Brief description of the agent's purpose and role in the system.

## Capabilities

### Primary Functions
- List main capabilities
- Core responsibilities
- Key features

### Specializations
- Specific areas of expertise
- Unique capabilities
- Domain knowledge

## Communication

### Input Format
```typescript
// Example message structure
{
  type: 'request',
  agent: 'agent-name',
  content: 'message content',
  context: {}
}
```

### Output Format
```typescript
// Example response structure
{
  type: 'response',
  agent: 'agent-name',
  content: 'response content',
  metadata: {}
}
```

## Inter-Agent Communication

### Can Request Help From
- @agent1 - For specific tasks
- @agent2 - For other tasks

### Responds To Requests From
- @agent3 - Provides specific assistance
- @agent4 - Handles certain requests

## Usage Examples

### Example 1: Basic Usage
```
User: @agent-name, please perform task X
Agent: [Response and actions]
```

### Example 2: Collaboration
```
User: @agent-name, work with @other-agent to complete Y
Agent: [Collaborative response]
```

## Best Practices

1. **When to Use**: Scenarios where this agent is most effective
2. **Limitations**: What this agent cannot or should not do
3. **Performance Tips**: How to get the best results

## Configuration

```json
{
  "agent": {
    "name": "agent-name",
    "enabled": true,
    "priority": 1,
    "timeout": 30000
  }
}
```

## Related Documentation
- [Link to related agent]
- [Link to protocol documentation]
- [Link to API reference]