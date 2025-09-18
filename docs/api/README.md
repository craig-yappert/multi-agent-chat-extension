# API Documentation

This directory contains API documentation for the Multi Agent Chat extension interfaces and provider systems.

## Contents

*Note: API documentation files will be added here as the interfaces are formalized*

## API Categories

### Extension API
- Commands exposed to VS Code
- Configuration settings
- Activation events

### Agent Interface
```typescript
interface AgentConfig {
  id: string;
  name: string;
  role: string;
  provider: 'claude' | 'mcp' | 'multi';
  model: string;
  specialization?: string[];
}
```

### Provider Interface
```typescript
interface Provider {
  sendMessage(message: string, context?: any): Promise<string>;
  isAvailable(): Promise<boolean>;
  getMetrics(): ProviderMetrics;
}
```

### MCP Server API
- WebSocket endpoint: `ws://localhost:3030`
- HTTP fallback: `http://localhost:3031`
- Message format: JSON with type, agent, message fields

### Communication Hub API
- Inter-agent messaging
- Conversation management
- Context sharing

## Planned Documentation

### To Be Added
1. **provider-api.md** - Detailed provider interface specification
2. **mcp-protocol.md** - MCP message format and protocol
3. **agent-api.md** - Agent configuration and customization
4. **extension-api.md** - VS Code extension commands and settings
5. **webhooks.md** - Event hooks and callbacks

## API Usage Examples

### Creating a Custom Provider
```typescript
class CustomProvider implements Provider {
  async sendMessage(message: string, context?: any) {
    // Implementation
  }
  
  async isAvailable() {
    return true;
  }
  
  getMetrics() {
    return { successRate: 1.0, avgResponseTime: 100 };
  }
}
```

### Registering an Agent
```typescript
const customAgent: AgentConfig = {
  id: 'custom',
  name: 'Custom Agent',
  role: 'Specialized task',
  provider: 'mcp',
  model: 'claude-3-sonnet',
  specialization: ['domain-specific']
};
```

## Adding API Documentation

When documenting APIs:
1. Include TypeScript interfaces
2. Provide usage examples
3. Document all parameters
4. Specify return types
5. Note any breaking changes
6. Include error handling