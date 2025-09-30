# Cleanup and Prioritization Plan

**Created:** 2025-09-30
**Status:** Ready for Execution

---

## Executive Summary

After two highly productive days implementing inter-agent communication polish and external resources refactor, the codebase needs systematic cleanup and feature prioritization. This plan organizes proposals, identifies dead code, and establishes a clear roadmap forward.

---

## Part 1: Proposal Status Analysis

### ✅ COMPLETED Proposals (Archive)

#### 1. **EXTERNAL_RESOURCES_REFACTOR_PROPOSAL.md**

- **Status:** ✅ FULLY IMPLEMENTED (2025-09-30 Morning)
- **What was done:**
  - Extracted all webview resources to `resources/webview/`
  - Deleted legacy template literal files (script.ts, ui.ts, uiStyles.ts)
  - Removed 7,964 lines of template literal code
  - Simplified resource loading in extension.ts
- **Action:** Move to `docs/archive/implemented/`

#### 2. **INTER_AGENT_UX_PROPOSAL.md**

- **Status:** ✅ FULLY IMPLEMENTED (2025-09-30 Afternoon)
- **What was done:**
  - Transparent inter-agent messages displayed live in UI
  - Fixed message display order (ack → execution → summary)
  - Timestamp persistence and formatting
  - Loop prevention for acknowledgments
  - Nested command prevention
  - Disabled redundant summary by default
- **Action:** Move to `docs/archive/implemented/`

#### 3. **FLOATING_CHAT_UI_PROPOSAL.md**

- **Status:** ✅ IMPLEMENTED (Previous session)
- **What was done:**
  - Float button (🪟) to detach chat to new window
  - File attachment button (📎)
  - Conversation persistence after floating
- **Action:** Move to `docs/archive/implemented/`

#### 4. **STATUS_UPDATES_FEATURE.md**

- **Status:** ✅ IMPLEMENTED (Previous session)
- **What was done:**
  - Real-time status updates for agent communication
  - Visual indicators in status bar
  - Console messages for agent-to-agent communication
- **Action:** Move to `docs/archive/implemented/`

---

### 🔮 ACTIVE Proposals (Consider Next)

#### 5. **CLAUDE_CODE_PARITY_FEATURES.md** ⭐ HIGH PRIORITY

- **Status:** NOT IMPLEMENTED
- **Priority:** HIGH
- **What it proposes:**
  1. Real-time inline diff viewer
  2. Checkpoint/rollback system
  3. Workflow hooks for automation
- **Value:** Would significantly improve trust and usability
- **Complexity:** High (requires VS Code API deep dive)
- **Recommendation:** Break into phases, start with diff viewer
- **Action:** Keep in `docs/proposals/`, add to roadmap

#### 6. **AGENT_PERMISSIONS_PROPOSAL.md** ⭐ MEDIUM-HIGH PRIORITY

- **Status:** NOT IMPLEMENTED
- **Priority:** MEDIUM-HIGH
- **What it proposes:**
  - Trust-with-verification model
  - Domain-based default permissions
  - Rollback capability instead of prevention
- **Value:** Would eliminate permission friction
- **Complexity:** Medium (requires permission system redesign)
- **Recommendation:** Consider after diff viewer is in place
- **Action:** Keep in `docs/proposals/`, add to roadmap

#### 7. **DYNAMIC_MODEL_DISCOVERY_PROPOSAL.md** ⭐ LOW PRIORITY

- **Status:** NOT IMPLEMENTED
- **Priority:** LOW
- **What it proposes:**
  - Auto-discover available models from providers
  - Dynamic model selection UI
- **Value:** Nice-to-have, not critical for core functionality
- **Complexity:** Medium
- **Recommendation:** Defer until core features are solid
- **Action:** Keep in `docs/proposals/`, mark as "future enhancement"

---

### 📝 META Documents (Keep for Reference)

#### 8. **IMPLEMENTATION_PLAN_2025_09_30_ENHANCED.md**

- **Status:** Historical planning document
- **Action:** Move to `docs/archive/plans/`

---

## Part 2: Dead Code Cleanup

### 🧹 MCP Server References (REMOVE)

**Problem:** MCP server infrastructure was removed in v1.11.0, but references remain throughout codebase.

**Files to clean:**

#### `src/extension.ts`

- Line 12: Remove commented import `// import { MCPServerManager } from './mcp-server/serverManager';`
- Line 35-37: Remove commented MCP initialization
- Line 63: Remove comment about MCP commands
- Line 187: Remove `_mcpServerManager` parameter
- Line 264: Remove `this._initializeMCPConfig();` call
- Lines 491-498: Remove MCP message handlers (`loadMCPServers`, `saveMCPServer`, `deleteMCPServer`)
- Lines 1369: Remove MCP config reinit comment
- Lines 1592-1594: Remove `_initializeMCPConfig()` stub method
- Lines 2012-2026: Remove `_loadMCPServers()`, `_saveMCPServer()`, `_deleteMCPServer()` stub methods

#### `src/providers.ts`

- Lines 6, 15, 45, 54, 319, 328, 458, 467, 472, 477, 491: Remove all MCP comments and stubs

#### `src/agents.ts`

- Line 11: Remove `// mcpServer removed;` comment

#### `src/ui/SettingsPanel.ts`

- Line 7: Remove `'mcp'` from provider union type
- Line 182: Remove MCP option from provider dropdown
- Lines 404-406: Remove MCP models from model configuration

#### `src/config/models.ts`

- Check and remove any MCP-related model definitions

**Estimated impact:** ~50 lines removed, cleaner codebase

---

### 🗂️ Unused Files Analysis

**Core files (KEEP):**

- ✅ `src/extension.ts` - Main extension logic
- ✅ `src/agents.ts` - Agent definitions
- ✅ `src/providers.ts` - AI provider implementations
- ✅ `src/agentCommunication.ts` - Inter-agent messaging
- ✅ `src/agentMessageParser.ts` - Message parsing
- ✅ `src/performanceOptimizer.ts` - Caching and optimization
- ✅ `src/requestManager.ts` - Request queue management

**Support files (KEEP):**

- ✅ `src/settings/SettingsManager.ts` - Settings hierarchy
- ✅ `src/conversations/ConversationManager.ts` - Conversation storage
- ✅ `src/context/ProjectContextManager.ts` - Project context
- ✅ `src/commands/MigrationCommands.ts` - Migration utilities
- ✅ `src/ui/SettingsPanel.ts` - Settings UI (needs MCP cleanup)
- ✅ `src/config/models.ts` - Model configurations

**Test files (REVIEW):**

- ⚠️ `src/test/extension.test.ts` - Check if tests are up to date

**Verdict:** No files to delete, but need MCP cleanup in several

---

### 🧩 Unused Functions/Features (REVIEW)

**Functions to verify usage:**

1. `requestManager.ts` - Is request queuing actually being used?
2. `performanceOptimizer.ts` - Is caching active and effective?
3. Settings UI sections - Which panels are actually rendering?

**Action:** Add verification tasks to cleanup checklist

---

## Part 3: Prioritized Roadmap

### 🎯 Immediate (This Session or Next)

1. **✅ DONE:** Remove all MCP references from codebase
2. **✅ DONE:** Archive implemented proposals
3. Update CLAUDE.md to reflect current state (v1.13.0+)
4. Verify requestManager and performanceOptimizer are wired up
5. Update package.json version to 1.14.0 (cleanup release)

### 🔥 Short Term (Next 1-2 weeks)

1. **Diff Viewer (Phase 1)** - CLAUDE_CODE_PARITY_FEATURES.md
   - Implement basic file change preview
   - Show before/after diffs
   - Accept/reject individual changes
2. **Settings UI Completion** - Fix non-rendering sections
3. **Agent Personality Documentation** - Document distinct agent voices

### 🚀 Medium Term (Next month)

1. **Checkpoint System** - CLAUDE_CODE_PARITY_FEATURES.md
   - Save snapshots before agent changes
   - Rollback capability
2. **Agent Permissions Redesign** - AGENT_PERMISSIONS_PROPOSAL.md
   - Trust-with-verification model
   - Domain-based defaults

### 🌟 Long Term (Future)

1. **Workflow Hooks** - CLAUDE_CODE_PARITY_FEATURES.md
2. **Dynamic Model Discovery** - DYNAMIC_MODEL_DISCOVERY_PROPOSAL.md
3. **Advanced multi-agent workflows** - From TODO_NEXT_SESSION.md

---

## Part 4: Cleanup Execution Checklist

### Phase 1: MCP References Removal

- [ ] Clean `src/extension.ts` (remove ~20 lines)
- [ ] Clean `src/providers.ts` (remove ~15 lines)
- [ ] Clean `src/agents.ts` (remove 1 line)
- [ ] Clean `src/ui/SettingsPanel.ts` (remove MCP provider option)
- [ ] Clean `src/config/models.ts` (check for MCP models)
- [ ] Test extension loads without errors
- [ ] Test all agents work correctly
- [ ] Commit: "refactor: Remove all MCP server references"

### Phase 2: Proposal Organization

- [ ] Create `docs/archive/implemented/` directory
- [ ] Move EXTERNAL_RESOURCES_REFACTOR_PROPOSAL.md
- [ ] Move INTER_AGENT_UX_PROPOSAL.md
- [ ] Move FLOATING_CHAT_UI_PROPOSAL.md
- [ ] Move STATUS_UPDATES_FEATURE.md
- [ ] Create `docs/archive/plans/` directory
- [ ] Move IMPLEMENTATION_PLAN_2025_09_30_ENHANCED.md
- [ ] Update proposal README to reflect status
- [ ] Commit: "docs: Archive implemented proposals"

### Phase 3: Documentation Update

- [ ] Update CLAUDE.md with v1.13.0+ changes
- [ ] Update README.md if needed
- [ ] Update CHANGELOG.md with recent changes
- [ ] Commit: "docs: Update documentation for v1.13.0"

### Phase 4: Version Bump

- [ ] Update version in package.json to 1.14.0
- [ ] Build and test: `npm run compile`
- [ ] Package: `npx vsce package --no-dependencies`
- [ ] Test installation
- [ ] Commit: "chore: Bump version to 1.14.0 (cleanup release)"
- [ ] Push to main

---

## Success Metrics

**Cleanup complete when:**

- ✅ Zero MCP references in active code
- ✅ Implemented proposals archived
- ✅ Documentation reflects current state
- ✅ Version 1.14.0 packaged and tested
- ✅ Codebase is ~100 lines lighter

**Ready for next features when:**

- ✅ All cleanup tasks completed
- ✅ Roadmap clearly prioritized
- ✅ Next feature (Diff Viewer) has implementation plan

---

## Estimated Timeline

- **MCP Cleanup:** 30 minutes
- **Proposal Organization:** 15 minutes
- **Documentation Update:** 30 minutes
- **Version Bump & Test:** 15 minutes

**Total:** ~1.5 hours for complete cleanup

---

*Last Updated: 2025-09-30*
*Next Review: After cleanup completion*
