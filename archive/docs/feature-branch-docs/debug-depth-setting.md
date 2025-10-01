# How to Verify Your Inter-Agent Depth Setting

## Quick Test Method

1. **Open the VS Code Command Palette** (Ctrl+Shift+P)
2. **Type**: "Preferences: Open Settings (JSON)"
3. **Add this setting** (if not already there):
```json
{
    "claudeCodeChat.interAgent.maxDepth": 3
}
```

## Debug Through the Extension

Add this temporary debug code to see what value is actually being used:

### Option 1: Check in Developer Console
1. Open VS Code Developer Tools: **Help → Toggle Developer Tools** (or Ctrl+Shift+I)
2. Go to Console tab
3. Send a message to any agent
4. Look for console output showing the depth value

### Option 2: Add Debug Output
The agents should show the depth limit message when they hit it. Currently set to show:
```
"🚫 **Inter-agent communication depth limit reached (X)**"
```
Where X is your actual limit.

## Test The Setting

Send this message to trigger multi-agent communication:
```
@team can everyone discuss the current configuration depth setting?
```

If depth is 1: Only team will respond
If depth is 3: Team → other agents → their responses → potentially more

## Where Settings Are Stored

The setting can be in multiple places (in priority order):
1. **Workspace Settings**: `.vscode/settings.json` in your project
2. **User Settings**: `%APPDATA%\Code\User\settings.json`
3. **Default**: Falls back to 1 if not set anywhere

## Current Code References

The setting is read in these locations:
- `extension.ts:305` - For inter-agent communication
- `extension.ts:563` - For handling inter-agent mentions
- `extension.ts:35` - For the configuration command

Each time it reads the CURRENT value, so changes should be immediate.

## Verify It's Working

Look for this in the output when agents communicate:
1. First agent responds
2. If depth > 1, mentioned agents respond
3. If depth is reached, you'll see the limit message

## Manual Override Test

You can also temporarily set it via command:
1. **Ctrl+Shift+P**
2. **Type**: "Claude Code Chat: Configure Inter-Agent Depth"
3. **Enter**: 3
4. **Check**: Should show "Inter-agent communication depth set to 3"

This updates the workspace setting directly.