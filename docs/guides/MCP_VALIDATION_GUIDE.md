# MCP Server Validation Guide

## Quick Status Check

### Method 1: VS Code Status Bar

Look at the bottom-right status bar in VS Code:

- **$(vm-active) MCP Server** (green) = Running ✅
- **$(vm-outline) MCP Server** (yellow) = Stopped ❌

Click the status bar item to toggle on/off.

### Method 2: Quick Status Command

1. Open Command Palette (Ctrl+Shift+P)
2. Run: `Multi Agent Chat: MCP Server Quick Status`
3. See popup with:
   - HTTP API: ✅ Online / ❌ Offline
   - WebSocket: ✅ Online / ❌ Offline (response time)

## Full Validation

### Method 1: Built-in Validator (Recommended)

1. Open Command Palette (Ctrl+Shift+P)
2. Run: `Multi Agent Chat: Validate MCP Server`
3. Check "MCP Server Validator" output channel for results

Tests performed:

- ✅ HTTP Health Check
- ✅ WebSocket Connection
- ✅ Agent Response Test
- ✅ Performance Measurement

Expected output:

```
==================================================
MCP Server Validation Suite
==================================================

1. Checking HTTP health endpoint...
  ✅ HTTP health check passed

2. Checking WebSocket connection...
  ✅ WebSocket connected successfully

3. Testing agent response...
  ✅ Agent response received in 215ms

4. Running performance test...
  ✅ Average response time: 187ms

==================================================
VALIDATION SUMMARY
==================================================
HTTP Health: ✅ PASS
WebSocket: ✅ PASS
Agent Response: ✅ PASS
Performance: ✅ 187ms avg

🎉 All validation tests PASSED!
```

### Method 2: Command Line Test

Run the included test script:

```bash
cd multi-agent-chat-extension
node test-mcp-server.js
```

Expected output:

```
============================================================
MCP Server Test Client
============================================================

[TEST 1] HTTP Health Check
  ✅ PASS - HTTP health check successful

[TEST 2] WebSocket Connection
  ✅ PASS - WebSocket working correctly

[TEST 3] Agent Response Test
  Response received in 245ms
  ✅ PASS - Agent response working

[TEST 4] HTTP API Chat
  Response received in 198ms
  ✅ PASS - HTTP API working

============================================================
TEST SUMMARY
============================================================
Tests Run: 4
Tests Passed: 4
Pass Rate: 100%

🎉 All tests PASSED! MCP Server is working correctly.
```

### Method 3: Manual Browser Test

1. Open browser to: <http://localhost:3001/api/health>
2. Should see: `{"status":"ok","timestamp":1234567890}`

### Method 4: WebSocket Test (Advanced)

Use a WebSocket client (like wscat):

```bash
npm install -g wscat
wscat -c ws://localhost:3000

# After connection, type:
{"type":"heartbeat"}

# Should receive:
{"type":"heartbeat","timestamp":1234567890}
```

## Viewing Logs

### MCP Server Logs

1. View menu → Output
2. Select dropdown: "MCP Server"
3. Shows server startup, connections, errors

### Message Routing Logs

1. View menu → Output
2. Select dropdown: "Multi-Agent Message Routing"
3. Shows which backend handled each message

### Performance Logs

1. View menu → Output
2. Select dropdown: "Multi-Agent Performance"
3. Shows response times and metrics

## Troubleshooting

### Server Won't Start

```
❌ All tests failed. Is the MCP server running?
```

**Solutions:**

1. Check status bar - click to start
2. Command Palette → "Multi Agent Chat: Start MCP Server"
3. Check ports 3000/3001 aren't in use:

   ```bash
   netstat -an | grep 3000
   netstat -an | grep 3001
   ```

4. View "MCP Server" output for errors

### WebSocket Connection Failed

```
❌ WebSocket connection timeout
```

**Solutions:**

1. Restart server: Command Palette → "Restart MCP Server"
2. Check firewall settings for ports 3000/3001
3. Verify WebSocket URL in settings: `ws://localhost:3000`

### Slow Performance

```
⚠️ Slow performance (> 3 seconds)
```

**Solutions:**

1. Check if falling back to CLI (view Message Routing logs)
2. Ensure MCP server is running (not CLI fallback)
3. Restart server for fresh connection

### Port Already in Use

```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solutions:**

1. Find process using port:

   ```bash
   # Windows
   netstat -ano | findstr :3000
   taskkill /PID <PID> /F

   # Mac/Linux
   lsof -i :3000
   kill -9 <PID>
   ```

2. Change port in settings:
   - `claudeCodeChat.mcp.wsPort`: 3100
   - `claudeCodeChat.mcp.httpPort`: 3101

## Performance Expectations

### With MCP Server Running

- **Single agent**: 100-500ms ✅
- **Team (6 agents)**: 1-3 seconds ✅
- **With caching**: <100ms 🚀

### Without MCP Server (CLI fallback)

- **Single agent**: 9-12 seconds ❌
- **Team (6 agents)**: 60+ seconds ❌

## Quick Commands Reference

| Command | Description |
|---------|-------------|
| `Start MCP Server` | Start the server |
| `Stop MCP Server` | Stop the server |
| `Restart MCP Server` | Restart the server |
| `Toggle MCP Server` | Toggle on/off |
| `Show MCP Server Logs` | View server logs |
| `Validate MCP Server` | Run full validation |
| `MCP Server Quick Status` | Quick status check |

## Success Indicators

You know the MCP server is working when:

1. ✅ Status bar shows green "$(vm-active) MCP Server"
2. ✅ Validation shows all tests PASS
3. ✅ Agent responses come back in <1 second
4. ✅ Message Routing logs show "MCP_WS" not "CLI_FALLBACK"
5. ✅ No timeout errors in chat
