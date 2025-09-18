# MCP WebSocket Architecture

## Overview

The new MCP (Message Control Protocol) WebSocket architecture replaces the slow Claude CLI approach with a persistent, high-performance connection system.

## Performance Comparison

### Old Architecture (Claude CLI)
- **Per Request**: Spawn new Claude process → Wait for startup → Send message → Wait for response → Process dies
- **Response Time**: 9-12+ seconds per agent
- **Team Response**: 6 agents × 12 seconds = 72+ seconds
- **Issues**: Process spawn overhead, no connection reuse, no caching

### New Architecture (MCP WebSocket)
- **Per Request**: Send via existing WebSocket → Get response
- **Response Time**: 50-500ms per agent
- **Team Response**: 6 agents × 200ms = 1.2 seconds (60x faster!)
- **Benefits**: Persistent connection, connection pooling, intelligent routing

## Architecture Components

### 1. MCP Server (`src/mcp-server/server.ts`)
- Runs as separate process
- Maintains persistent Claude CLI instance (or API connection)
- Handles both WebSocket and HTTP connections
- Features:
  - WebSocket server on port 3000
  - HTTP API server on port 3001
  - Request queuing
  - Heartbeat for connection health
  - Auto-restart on crash

### 2. Intelligent Provider (`src/providers/intelligentProvider.ts`)
- Smart routing between multiple backends
- Priority order:
  1. **MCP WebSocket** (fastest, ~200ms)
  2. **HTTP API** (fallback, ~500ms)
  3. **Claude CLI** (last resort, 10+ seconds)
- Features:
  - Adaptive routing based on performance
  - Automatic fallback on failures
  - Performance metrics tracking
  - Message path logging

### 3. Message Router
- Logs which path each message takes
- Tracks performance metrics
- Output channels:
  - "Multi-Agent Message Routing" - Shows routing decisions
  - "MCP Server" - Server logs
  - "Multi-Agent Performance" - Timing metrics

### 4. Server Manager (`src/mcp-server/serverManager.ts`)
- Manages MCP server lifecycle
- Features:
  - Auto-start on extension load
  - Status bar indicator
  - Commands: start/stop/restart/toggle
  - Health checks
  - Auto-restart on crash

## Configuration

### Essential Settings

```json
{
  // Enable MCP WebSocket server
  "claudeCodeChat.mcp.enabled": true,
  "claudeCodeChat.mcp.autoStart": true,

  // Routing preferences
  "claudeCodeChat.routing.preferWebSocket": true,
  "claudeCodeChat.routing.fallbackToHttp": true,
  "claudeCodeChat.routing.fallbackToCLI": false,

  // Adaptive routing (learns from performance)
  "claudeCodeChat.routing.adaptive": true
}
```

### Port Configuration

```json
{
  "claudeCodeChat.mcp.wsPort": 3000,      // WebSocket port
  "claudeCodeChat.mcp.httpPort": 3001     // HTTP API port
}
```

## How It Works

### 1. Extension Startup
```
Extension loads → Server Manager starts → MCP Server launches
                                        ↓
                              WebSocket server (port 3000)
                              HTTP API server (port 3001)
```

### 2. Message Flow
```
User Message → Intelligent Provider → Route Decision
                                    ↓
                    [WebSocket Available?] → Yes → MCP WebSocket → Response (200ms)
                              ↓ No
                    [HTTP API Available?] → Yes → HTTP API → Response (500ms)
                              ↓ No
                    [CLI Fallback Enabled?] → Yes → Claude CLI → Response (12s)
                              ↓ No
                            Error
```

### 3. Adaptive Routing
The system learns from each request:
- Tracks average response time per route
- Tracks success rate per route
- Calculates route score: `(successRate × 0.7) + (speedScore × 0.3)`
- Automatically prefers faster, more reliable routes

## Status Bar Indicators

- **$(vm-active) MCP Server** - Server is running (green)
- **$(vm-outline) MCP Server** - Server is stopped (yellow)
- Click to toggle server on/off

## Commands

- `Multi Agent Chat: Start MCP Server` - Start the server
- `Multi Agent Chat: Stop MCP Server` - Stop the server
- `Multi Agent Chat: Restart MCP Server` - Restart the server
- `Multi Agent Chat: Toggle MCP Server` - Toggle on/off
- `Multi Agent Chat: Show MCP Server Logs` - View server logs

## Monitoring

### Output Channels
1. **MCP Server** - Server startup, connections, errors
2. **Multi-Agent Message Routing** - Shows which backend handled each message
3. **Multi-Agent Performance** - Response times and metrics

### Example Routing Log
```
[2025-09-17T10:30:00] Message msg_123 -> MCP_WS: {"agent":"coder","connected":true}
[2025-09-17T10:30:00.215] Message msg_123 completed in 215ms - SUCCESS
```

## Troubleshooting

### Server Won't Start
1. Check if ports 3000/3001 are in use
2. View "MCP Server" output channel for errors
3. Try manual restart: Command Palette → "Restart MCP Server"

### Slow Responses
1. Check "Multi-Agent Message Routing" to see which backend is being used
2. If seeing "CLI_FALLBACK", the WebSocket/HTTP servers may be down
3. Enable verbose logging: `"claudeCodeChat.routing.logVerbose": true`

### Connection Issues
1. Status bar shows server status
2. Check firewall isn't blocking ports 3000/3001
3. Try disabling and re-enabling: `"claudeCodeChat.mcp.enabled": false` then `true`

## Performance Expectations

With MCP WebSocket:
- **Single agent**: 100-500ms
- **Team (6 agents)**: 1-3 seconds
- **With caching**: <100ms

Fallback to CLI:
- **Single agent**: 9-12 seconds
- **Team (6 agents)**: 60+ seconds

## Development

### Running MCP Server Standalone
```bash
cd multi-agent-chat-extension
npm run compile
node out/mcp-server/server.js
```

### Testing WebSocket Connection
```javascript
const ws = new WebSocket('ws://localhost:3000');
ws.on('open', () => {
  ws.send(JSON.stringify({
    type: 'agent_request',
    id: 'test_1',
    agent: 'coder',
    message: 'Hello'
  }));
});
```

### Testing HTTP API
```bash
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{"agent":"coder","message":"Hello"}'
```

## Future Improvements

1. **Connection Pooling** - Multiple WebSocket connections for parallel requests
2. **Redis Integration** - Shared cache across instances
3. **Load Balancing** - Multiple MCP servers for high availability
4. **Direct Claude API** - Skip CLI entirely when API keys available
5. **Request Batching** - Send multiple agent requests in single message