# Settings UI & Tech Debt Cleanup Plan
**Created:** 2025-01-18
**Last Updated:** 2025-01-18
**Status:** In Progress - Phase 1

## Overview
Incremental approach to add settings UI and remove bloat from the original Claude Code fork.

## Phase 1: Minimal Settings UI ✅ CURRENT
**Target Date:** 2025-01-20 (Week 1)
**Status:** Planning Complete

### Priority 1 Settings (Essential)
- [ ] API Keys Management (Global)
  - [ ] Claude API key with secure storage
  - [ ] OpenAI API key (optional)
  - [ ] Show/hide key toggles

- [ ] Agent Configuration (Per-Agent)
  - [ ] Model selection for each agent
  - [ ] Provider selection (claude/openai/local)
  - [ ] Permission scope per agent (file write, command execution)
  - [ ] Custom system prompts

- [ ] Global Permission Settings
  - [ ] YOLO mode toggle (bypass all permissions)
  - [ ] Default permission policy
  - [ ] Permission history/reset

### Implementation Files
- [ ] Create `src/ui/settings/SettingsPanel.ts`
- [ ] Add settings button to main UI
- [ ] Integrate with existing storage

### Settings UI Example Structure
```
Settings
├── 🔑 API Keys (Global)
│   ├── Claude API Key: [******] [Show]
│   └── OpenAI API Key: [******] [Show]
│
├── 🤖 Agents
│   ├── Executor ⚡
│   │   ├── Model: [Sonnet v]
│   │   ├── Provider: [Claude v]
│   │   └── Permissions: [✓ File Write] [✓ Commands]
│   │
│   ├── Architect 🏗️
│   │   ├── Model: [Opus v]
│   │   ├── Provider: [Claude v]
│   │   └── Permissions: [□ File Write] [□ Commands]
│   │
│   └── Coder 💻
│       ├── Model: [GPT-4 v]
│       ├── Provider: [OpenAI v]
│       └── Permissions: [□ File Write] [□ Commands]
│
└── ⚙️ Global Options
    ├── [✓] YOLO Mode (auto-approve all)
    └── Default Permission: [Ask v]
```

---

## Phase 2: Remove Command Bloat
**Target Date:** 2025-01-22
**Status:** Planned

### Commands to Remove
- [ ] 8 MCP server commands (move to settings)
  - `multi-agent-chat.startMCPServer`
  - `multi-agent-chat.stopMCPServer`
  - `multi-agent-chat.restartMCPServer`
  - `multi-agent-chat.toggleMCPServer`
  - `multi-agent-chat.showMCPServerLogs`
  - `multi-agent-chat.validateMCPServer`
  - `multi-agent-chat.mcpServerStatus`
- [ ] Duplicate menu entries for `openChat`
- [ ] WSL-specific commands

### Commands to Keep
- `claude-code-chat.openChat` - Main entry point
- `claude-code-chat.clearAllConversations` - Utility

---

## Phase 3: Settings Categories
**Target Date:** 2025-01-25
**Status:** Planned

### Global Settings
- API Keys & Authentication
- Default permission policy
- YOLO mode toggle

### Per-Agent Settings
- Model selection (sonnet/opus/gpt-4/etc.)
- Provider (claude/openai/local/mcp)
- Permission scope (what each agent can do)
- Custom system prompts
- Temperature & parameters

### Advanced Settings
- MCP Configuration
- WSL Settings (if on Windows)
- Telemetry preferences

### UI Settings
- Theme preferences
- Layout options
- Notification settings

---

## Phase 4: Tech Debt Cleanup
**Target Date:** 2025-01-27
**Status:** Planned

### High Priority Cleanup
- [ ] Remove unused MCP server management code
- [ ] Consolidate duplicate command registrations
- [ ] Remove WSL configuration complexity
- [ ] Clean up unused provider integrations
- [ ] Remove legacy Claude Code features

### File Structure Refactor
```
src/
├── core/           # Essential functionality
│   ├── extension.ts
│   ├── agents.ts
│   └── providers.ts
├── ui/             # UI components
│   ├── webview.ts
│   ├── settings/   # New settings UI
│   └── styles.ts
├── utils/          # Utilities
└── legacy/         # Deprecated (to remove)
```

---

## Success Metrics
- **50% reduction** in commands (from 10+ to 2-3)
- **Cleaner package.json** (remove 100+ lines)
- **Better UX** with organized settings UI
- **Easier maintenance** with modular code

## Migration Notes
- Existing user settings will be migrated automatically
- Old command shortcuts will show deprecation notice
- Settings UI will be default, command palette as fallback

## Session Progress Tracking

### Session 2025-01-18
- ✅ Created cleanup plan
- ✅ Analyzed current settings and commands
- ✅ Identified bloat from original fork
- ✅ Designed incremental approach
- 🔄 Next: Implement Phase 1 settings UI

### Next Session Goals
- [ ] Create SettingsPanel.ts
- [ ] Add settings button to UI
- [ ] Implement API key management
- [ ] Test secure storage

---

## Notes
- Keep changes incremental and testable
- Each phase should be independently deployable
- Document breaking changes in CHANGELOG
- Maintain backward compatibility where possible