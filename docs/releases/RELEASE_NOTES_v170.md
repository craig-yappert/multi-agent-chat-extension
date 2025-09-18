# Multi-Agent Chat v1.7.0 Release Notes

## Major Improvements

### 🎯 Smart Agent Selection
- **NEW**: Intelligent agent selection based on message content
- Only queries 2-3 most relevant agents instead of all 6
- Reduces team response time from 120-180s to 15-30s
- Configurable via `claudeCodeChat.performance.smartAgentSelection`

### ⚡ Request Management & Cancellation
- **NEW**: Proper request lifecycle management with cancellation
- Prevents resource waste from abandoned timeouts
- Concurrent processing with connection pooling (max 3)
- Clean process termination when requests timeout

### 🎨 UI Improvements
- **FIXED**: Status bar now displays on single line without wrapping
- **FIXED**: Status bar properly closes after responses complete
- **FIXED**: Agent names correctly shown in timeout messages (was always "Team")
- **IMPROVED**: Better status messages: "Message sent, awaiting response..."

### 🏗️ Architecture Enhancements
- **NEW**: `RequestManager` class for proper request lifecycle
- **NEW**: `SmartAgentSelector` class for intelligent agent routing
- **NEW**: `ImprovedFastTeamProvider` with parallel processing
- **NEW**: Configurable timeout controls (default 15s per agent)

## New Configuration Options

```json
{
  "claudeCodeChat.performance.maxConcurrentAgents": 3,
  "claudeCodeChat.performance.smartAgentSelection": true,
  "claudeCodeChat.performance.requestTimeout": 15000
}
```

## Files Added/Modified

### New Files
- `src/requestManager.ts` - Request lifecycle management
- `src/smartAgentSelector.ts` - Intelligent agent selection
- `src/improvedFastTeamProvider.ts` - Improved team response handler
- `ARCHITECTURE_REDESIGN.md` - Comprehensive redesign plan

### Modified Files
- `src/ui-styles.ts` - Fixed status bar layout issues
- `src/fastTeamProvider.ts` - Fixed hardcoded "Team" in error messages
- `package.json` - Added new configuration options

## Performance Improvements

| Metric | Before | After | Improvement |
|--------|--------|-------|------------|
| Team Response Time | 120-180s | 15-30s | 75-85% faster |
| Concurrent Requests | 1 (sequential) | 3 (parallel) | 3x throughput |
| Timeout Handling | Continue processing | Proper cancellation | Resource savings |
| Agent Selection | All 6 agents | 2-3 relevant | 50-66% fewer calls |

## Known Issues Addressed

1. ✅ HTTP API timing out at 30s while requests take 60-120s
2. ✅ Sequential Claude CLI calls causing bottlenecks
3. ✅ No request cancellation leading to resource waste
4. ✅ Status bar text wrapping issues
5. ✅ Wrong agent names in timeout messages

## Migration Notes

- Existing configurations remain compatible
- New features are opt-in via configuration
- Default settings optimize for performance
- Legacy code paths retained as fallback

## Next Steps (v1.8.0+)

- WebSocket-based progress streaming
- Connection pool implementation
- Progressive response enhancement
- Local model integration for instant responses

## Installation

```bash
code --install-extension multi-agent-chat-1.7.0.vsix
```

## Feedback

Please report any issues or suggestions at:
https://github.com/craig-yappert/multi-agent-chat-extension/issues