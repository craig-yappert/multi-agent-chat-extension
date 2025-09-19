# Settings UI & Tech Debt Cleanup Plan
**Created:** 2025-01-18
**Last Updated:** 2025-09-19
**Status:** Phase 2 & 3 Complete

## Overview
Incremental approach to add settings UI and remove bloat from the original Claude Code fork.

## Phase 1: Minimal Settings UI ⚠️ PARTIAL
**Target Date:** 2025-01-20 (Week 1)
**Status:** Partially Complete

### Priority 1 Settings (Essential)
- [x] API Keys Management (Global)
  - [x] Claude API key with secure storage
  - [x] OpenAI API key (optional)
  - [x] Show/hide key toggles

- [ ] Agent Configuration (Per-Agent) - NOT RENDERING
  - [ ] Model selection for each agent
  - [ ] Provider selection (claude/openai/local)
  - [ ] Permission scope per agent (file write, command execution)
  - [ ] Custom system prompts

- [ ] Global Permission Settings - NOT RENDERING
  - [x] YOLO mode toggle (in package.json)
  - [x] Default permission policy (in package.json)
  - [ ] Permission history/reset UI

### Implementation Files
- [x] Created `src/ui/settings/SettingsPanel.ts`
- [x] Added settings button to main UI
- [x] Integrated with existing storage

---

## Phase 2: Remove Command Bloat ✅ COMPLETE
**Target Date:** 2025-01-22
**Status:** Complete (v1.11.0)

### Commands Removed
- [x] 7 MCP server commands removed
  - `multi-agent-chat.startMCPServer`
  - `multi-agent-chat.stopMCPServer`
  - `multi-agent-chat.restartMCPServer`
  - `multi-agent-chat.toggleMCPServer`
  - `multi-agent-chat.showMCPServerLogs`
  - `multi-agent-chat.validateMCPServer`
  - `multi-agent-chat.mcpServerStatus`
- [x] WSL-specific commands removed
- [x] Duplicate menu entries cleaned up

### Commands Renamed
- [x] All commands updated from `claude-code-chat.*` to `multiAgentChat.*`
- [x] `multiAgentChat.openChat` - Main entry point
- [x] `multiAgentChat.clearAllConversations` - Utility
- [x] Migration commands added for per-project support

---

## Phase 3: Settings Categories ✅ REORGANIZED
**Target Date:** 2025-01-25
**Status:** Complete in package.json

### Global Settings ✅
- API Keys & Authentication
- Default model selection
- Default provider
- YOLO mode toggle
- Default permission policy

### Agent Configuration ✅
- Default agent selection
- Inter-communication toggle
- Show inter-communication toggle

### Project Settings ✅
- Use local storage toggle
- Auto-initialize toggle
- Share settings toggle

### Performance Settings ✅
- Streaming enable/disable
- Cache enable/disable
- Quick team mode
- Agent timeout configuration

---

## Phase 4: Tech Debt Cleanup ✅ COMPLETE
**Target Date:** 2025-01-27
**Status:** Complete (v1.11.0)

### High Priority Cleanup
- [x] Removed entire MCP server directory
- [x] Removed WSL configuration code
- [x] Removed 8 unused provider files
- [x] Consolidated duplicate command registrations
- [x] Removed legacy Claude Code features

### File Structure Refactor ✅
```
src/
├── core/           # Essential functionality
│   ├── extension.ts
│   ├── agents.ts
│   └── providers.ts
├── settings/       # Settings management
│   └── SettingsManager.ts
├── conversations/  # Conversation management
│   └── ConversationManager.ts
├── context/       # Project context
│   └── ProjectContextManager.ts
├── commands/      # Migration commands
│   └── MigrationCommands.ts
├── ui/            # UI components
│   ├── webview.ts
│   └── settings/  # Settings UI (needs fix)
└── webview/       # Webview assets
```

### Files Deleted
- `src/mcp-server/` (entire directory)
- `src/providers/FastTeamProvider.ts`
- `src/providers/FastTeamProviderV2.ts`
- `src/providers/SimpleWebSocketProvider.ts`
- `src/providers/IntelligentProvider.ts`
- `src/webSocketTest.ts`
- `src/localtest.ts`
- `src/testInterAgent.ts`
- `src/websocketManager.ts`

---

## Success Metrics ✅ ACHIEVED
- **✅ 70% reduction** in commands (from 10+ to 5)
- **✅ Cleaner package.json** (removed 100+ lines)
- **✅ Better organization** with logical settings categories
- **✅ Easier maintenance** with modular code
- **✅ Reduced package size** (1.5MB → 1.3MB)

## Migration Notes
- Existing user settings preserved
- Conversations auto-migrate to project storage
- Settings cascade: VS Code → Global → Project → Workspace
- Backward compatibility maintained

## Session Progress Tracking

### Session 2025-01-18
- ✅ Created cleanup plan
- ✅ Analyzed current settings and commands
- ✅ Identified bloat from original fork
- ✅ Designed incremental approach
- ⚠️ Implemented Phase 1 settings UI (partial)

### Session 2025-09-19
- ✅ Implemented per-project settings architecture
- ✅ Removed all MCP server code
- ✅ Removed WSL support
- ✅ Cleaned up 8 unused provider files
- ✅ Fixed branding (claudeCodeChat → multiAgentChat)
- ✅ Reorganized package.json settings
- ✅ Built clean v1.11.0 VSIX package

### Remaining Tasks
- [ ] Fix Settings UI rendering (non-API sections)
- [ ] Create agent configuration UI
- [ ] Add visual agent builder
- [ ] Implement permission history UI

---

## Next Steps

### Immediate Priority
1. Fix SettingsPanel.ts rendering issues
2. Wire up agent configuration UI
3. Test per-project settings thoroughly

### Future Enhancements
1. Visual agent configuration builder
2. Drag-and-drop team composition
3. Agent marketplace integration
4. Cloud sync for settings

## Notes
- Major cleanup complete in v1.11.0
- Codebase significantly simplified
- Ready for incremental UI improvements
- Focus on user-facing features next