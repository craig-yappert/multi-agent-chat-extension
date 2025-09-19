# Fast MCP Server Setup Guide

## Overview
The Fast MCP Server significantly improves response times by maintaining persistent connections and caching responses. It's a clean, optimized Python server without Mattermost dependencies.

## Performance Benefits
- **10x faster response times** compared to spawning new Claude processes
- **Response caching** for common queries (5-minute TTL)
- **Persistent connection** eliminates initialization overhead
- **Lightweight design** with minimal dependencies

## Prerequisites
1. Python 3.8 or higher
2. ANTHROPIC_API_KEY environment variable (optional, but recommended)

## Installation Steps

### 1. Install Python Dependencies
Navigate to the MCP server directory and install requirements:

```bash
cd path/to/extension/mcp-server
pip install -r requirements.txt
```

### 2. Set Environment Variables (Optional)
For full AI functionality, set your Anthropic API key:

```bash
# Windows
set ANTHROPIC_API_KEY=your_key_here

# macOS/Linux
export ANTHROPIC_API_KEY=your_key_here
```

### 3. Test the Server
Run the server manually to verify it works:

```bash
# Windows
python server.py
# or use the batch file:
start-server.bat

# macOS/Linux
python3 server.py
```

You should see: "Fast MCP Server running on stdio"

## VS Code Extension Configuration

### Enable Fast MCP Mode
1. Open the Multi-Agent Chat in VS Code
2. Click the Settings button (⚙️)
3. Enable "Use Fast MCP Server (Experimental)"
4. Save settings

### Alternative: Manual Configuration
Add to your VS Code settings.json:

```json
{
    "claudeCodeChat.performance.useFastMCP": true,
    "claudeCodeChat.mcp.serverTimeout": 10000
}
```

## Troubleshooting

### Server Won't Start
- Ensure Python is in your PATH
- Try `python`, `python3`, or `py` commands
- Check if all dependencies are installed: `pip list`

### Mock Responses
If you see "[Mock Agent]" responses:
- Set your ANTHROPIC_API_KEY environment variable
- Restart VS Code after setting the key

### Connection Timeout
If connection times out:
- Increase timeout in settings: `claudeCodeChat.mcp.serverTimeout`
- Check Python and MCP installation
- Look for error messages in VS Code Output panel

## Performance Comparison

### Without Fast MCP (Claude CLI)
- New process spawn: ~2-3 seconds
- Model initialization: ~1-2 seconds
- Total response time: **4-5 seconds per message**

### With Fast MCP Server
- Cached response: ~50ms
- New response: **0.5-1 second**
- **5-10x performance improvement**

## Architecture

```
VS Code Extension
    ↓
MCPClientProvider (TypeScript)
    ↓ JSON-RPC
Fast MCP Server (Python)
    ↓ Cached/Direct
Anthropic API
```

## Advanced Configuration

### Cache Settings
Edit `server.py` to adjust cache behavior:
- `cache_ttl = 300` - Cache duration in seconds
- `max_cache_size = 100` - Maximum cached responses

### Model Settings
Optimize for speed vs quality in `server.py`:
- `max_tokens=800` - Reduced for faster responses
- `temperature=0.7` - Balance creativity and consistency

## Notes
- The MCP server starts automatically when needed
- Server runs as a subprocess of VS Code
- Responses are cached per agent/message combination
- Cache is cleared when conversation context is reset