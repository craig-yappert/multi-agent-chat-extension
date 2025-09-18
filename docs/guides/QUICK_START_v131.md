# Quick Start - Version 1.3.1 Performance Update

## 🚀 Critical Performance Fix

Version 1.3.1 addresses the 30-second per-agent delays that were causing team responses to take 3+ minutes.

## Immediate Fix - Enable These Settings

Open VS Code settings (Ctrl+,) and search for "claudeCodeChat.performance" then enable:

```json
{
  // CRITICAL - Fixes 30-second delays
  "claudeCodeChat.performance.useFirstResponders": true,
  "claudeCodeChat.performance.agentTimeout": 8000,
  "claudeCodeChat.performance.minAgentsRequired": 2,

  // Additional speed improvements
  "claudeCodeChat.performance.enableCache": true,
  "claudeCodeChat.performance.localSynthesis": true
}
```

## What This Fixes

### Before v1.3.1:
- Each agent could take up to 30 seconds
- Team responses waited for ALL 6 agents
- Total time: 3+ minutes for team responses
- No timeout controls
- Sequential processing

### After v1.3.1:
- 8-second timeout per agent (configurable)
- Responds after first 2 agents complete
- Total time: 8-15 seconds for team responses
- Smart agent prioritization
- Parallel processing with timeouts

## Ultra-Fast Mode (Optional)

For maximum speed, enable ultra-fast mode:

```json
{
  "claudeCodeChat.performance.ultraFastMode": true
}
```

This enables:
- ✅ 8-second agent timeout
- ✅ Only waits for 2 agents
- ✅ Minimal context
- ✅ First-responder strategy
- ✅ Local synthesis

## Performance Settings Explained

### Essential Settings (Recommended)

**`agentTimeout`** (default: 8000ms)
- Maximum time to wait for each agent
- Prevents 30-second hangs
- Range: 3000-30000ms

**`minAgentsRequired`** (default: 2)
- Minimum agents needed for team response
- Don't wait for slow agents
- Range: 1-6 agents

**`useFirstResponders`** (default: true)
- Use fastest agents that respond
- Don't wait for all 6 agents
- Much faster team responses

### Additional Optimizations

**`maxTeamWaitTime`** (default: 15000ms)
- Absolute maximum wait for team
- Guarantees response within this time
- Range: 5000-60000ms

**`enableCache`** (default: true)
- Caches identical queries
- 5-minute cache TTL
- Instant repeated responses

**`localSynthesis`** (default: true)
- No extra API call for synthesis
- Faster team responses
- Smart local aggregation

## Testing Your Setup

1. Install v1.3.1 extension
2. Enable the critical settings above
3. Try: "@team test the performance improvements"
4. Should respond in 8-15 seconds (not 3 minutes!)

## Monitoring Performance

View timing information:
1. Open Output panel (Ctrl+Shift+U)
2. Select "Multi-Agent Performance"
3. Watch real-time agent response times

## Troubleshooting

If still slow after v1.3.1:

1. **Verify settings are enabled**
   - Check `performance.useFirstResponders` is true
   - Check `performance.agentTimeout` is 8000 or less

2. **Check console for timing logs**
   - Look for "[FastTeam]" entries
   - Should show 8-second timeouts, not 30

3. **Try Ultra-Fast Mode**
   - Set `performance.ultraFastMode` to true

4. **Clear extension cache**
   - Reload VS Code window
   - Settings should take effect immediately

## What's New in v1.3.1

- **FastTeamProvider**: New provider with aggressive timeouts
- **First-responder strategy**: Don't wait for slow agents
- **Agent prioritization**: Query most relevant agents first
- **Timeout controls**: Configurable per-agent timeouts
- **Early response**: Respond after minimum agents (default 2)
- **Smart synthesis**: Local processing when possible

## Default Behavior Change

By default, v1.3.1 now:
- Uses 8-second agent timeout (was unlimited)
- Responds after 2 agents (was waiting for all 6)
- Uses first-responder strategy (was sequential)
- Maximum 15-second wait (was unlimited)

These defaults fix the 30-second delay issue immediately upon upgrade.