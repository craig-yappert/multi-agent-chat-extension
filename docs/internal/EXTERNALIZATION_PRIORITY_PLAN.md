# Externalization Priority Plan

**Created:** 2025-10-01
**Status:** ✅ PHASE 1 & 2 COMPLETED (v1.15.0)
**Context:** Review of configuration externalization vs Claude Code parity features
**Decision:** Externalization First ✅ - Features Later ⏸️

---

## Implementation Update (2025-10-01)

### ✅ COMPLETED in v1.15.0:
- **External Model Configuration** (Phase 1) - 4-5 hours
- **External Agent Configuration** (Phase 2) - 5-6 hours
- **Total:** ~10 hours (matched estimates!)

### 📋 NEXT (v1.16.0):
- **Permission System** - 6-8 hours (as planned)

### ⏸️ DEFERRED (v1.18.0+):
- **Claude Code Parity Features** - 15-20 hours
- Re-evaluate after permissions system is complete

---

## Current State Analysis

### Hardcoded Configurations in TypeScript

1. **`src/config/models.ts`** (36 lines)
   - Model definitions for Claude, OpenAI, Local
   - Default model selections
   - Requires rebuild to add new models (e.g., Claude Sonnet 4.5)

2. **`src/agents.ts`** (98 lines of agent config)
   - 7 agent definitions (Architect, Coder, Executor, Reviewer, Documenter, Coordinator, Team)
   - Icons, colors, capabilities, specializations
   - Provider and model assignments
   - Requires rebuild to modify agent behavior

3. **Other Potential Externalizations**
   - Permission rules (currently in VS Code settings)
   - UI themes/colors
   - Command shortcuts
   - Prompt templates

---

## What We COULD Do (All Options)

### Option A: Claude Code Parity Features (from proposals)
**Time Estimate:** 15-20 hours total

1. **Real-time Inline Diff Viewer** (8-10 hours)
   - Intercept file operations
   - Show VS Code native diff viewer
   - Approve/reject workflow
   - Multi-file change grouping

2. **Checkpoint/Rollback System** (4-5 hours)
   - Auto-commit before agent actions
   - Git-based snapshots
   - Easy rollback UI
   - Conversation-linked commits

3. **Workflow Hooks** (3-4 hours)
   - Pre/post agent execution hooks
   - Custom automation scripts
   - Event-driven workflows

**Pros:**
- ✅ Feature parity with Claude Code
- ✅ Better user trust and visibility
- ✅ Professional-grade tooling

**Cons:**
- ❌ High complexity
- ❌ Long implementation time
- ❌ Doesn't solve immediate pain points (outdated models, rigid config)
- ❌ More code to maintain

---

### Option B: Full Configuration Externalization
**Time Estimate:** 12-15 hours total

1. **External Model Configuration** (4-5 hours)
   - `defaults/models.json` + `.machat/models.json`
   - User-editable model lists
   - No rebuild needed for new models

2. **External Agent Configuration** (5-6 hours)
   - `defaults/agents.json` + `.machat/agents.json`
   - Custom agent creation
   - Per-project agent customization

3. **External Permissions** (6-8 hours)
   - 3-tier permission system (Claude Code → Agent SDK → Defaults)
   - `.machat/permissions.json`
   - Per-agent permission rules

**Pros:**
- ✅ Maximum flexibility
- ✅ No rebuilds for config changes
- ✅ Foundation for future features
- ✅ Easier maintenance

**Cons:**
- ❌ Still significant time investment
- ❌ User learning curve for JSON editing
- ❌ Need validation and error handling

---

### Option C: Minimal Focused Externalization
**Time Estimate:** 4-6 hours total

1. **Models Only** (4-5 hours)
   - External model configuration (as proposed in v1.15.0)
   - Solves immediate pain: Claude Sonnet 4.5 availability
   - Simple JSON editing
   - Quick wins

2. **Defer Everything Else**
   - Agents stay in TypeScript (rarely change)
   - Permissions can wait (v1.16.0)
   - Claude Code parity features nice-to-have

**Pros:**
- ✅ Solves actual user pain point
- ✅ Quick implementation
- ✅ Low risk
- ✅ Foundation for future externalization

**Cons:**
- ❌ Doesn't address agent customization
- ❌ Permissions still missing

---

## What We SHOULD Do (Recommended Path)

### Phased Approach: Externalization First, Features Later

**Rationale:**
1. **Foundation > Features**: External configs enable user customization without code changes
2. **Pain Point Priority**: Users need latest models NOW (Claude 4.5), not necessarily diff viewers
3. **Maintenance Efficiency**: JSON configs = less code, easier updates, no rebuilds
4. **Incremental Value**: Each phase delivers immediate user value

---

## Recommended Roadmap

### ✅ v1.14.0 (Completed - 2025-09-30)
- Documentation cleanup
- Bug fixes (session ID, inter-agent UI)

### 🎯 v1.15.0 - External Model Configuration (NEXT - 4-5 hours)
**Priority:** HIGH
**Impact:** HIGH
**Complexity:** LOW

**What:**
- Move model definitions from `src/config/models.ts` to JSON
- Bundled `defaults/models.json` with latest models (including Claude Sonnet 4.5)
- Project-editable `.machat/models.json`
- Users can add custom models without rebuild

**Why NOW:**
- ✅ Actual user pain point (outdated models)
- ✅ Quick win (4-5 hours)
- ✅ Foundation for other externalizations
- ✅ Matches existing `.machat/` pattern

**Deliverables:**
- [ ] Create `defaults/models.json` with current + Claude 4.5
- [ ] Build `ModelRegistryManager` class
- [ ] Update Settings UI to load from registry
- [ ] Add command: "Open Models Configuration"
- [ ] Documentation: How to customize models

---

### 📋 v1.16.0 - Permission System (6-8 hours)
**Priority:** HIGH
**Impact:** MEDIUM
**Complexity:** MEDIUM

**What:**
- 3-tier permission strategy (as proposed)
- Tier 1: Inherit from Claude Code (when installed)
- Tier 2: Agent SDK patterns (standalone)
- Tier 3: Fallback defaults
- `.machat/permissions.json` for per-project rules

**Why SECOND:**
- ✅ Builds on externalization pattern from v1.15.0
- ✅ Aligns with Claude Code (when used together)
- ✅ Safety and trust improvements
- ⚠️ More complex than models (hooks, validation)

**Dependencies:**
- Requires v1.15.0 externalization patterns

---

### 📋 v1.17.0 - External Agent Configuration (5-6 hours)
**Priority:** MEDIUM
**Impact:** MEDIUM
**Complexity:** MEDIUM

**What:**
- Move agent definitions from `src/agents.ts` to JSON
- `defaults/agents.json` + `.machat/agents.json`
- Users can create custom agents
- Modify icons, colors, prompts, capabilities

**Why THIRD:**
- ✅ Completes externalization trilogy (models, permissions, agents)
- ⚠️ Lower priority - agents rarely change
- ⚠️ Most users won't customize agents initially
- ✅ Enables advanced users to experiment

**Dependencies:**
- Best after models and permissions are stable

---

### 📋 v1.18.0+ - Claude Code Parity Features (DEFERRED)
**Priority:** LOW-MEDIUM
**Impact:** MEDIUM
**Complexity:** HIGH

**What:**
- Diff viewer
- Checkpoint/rollback
- Workflow hooks

**Why LATER:**
- ⚠️ High complexity (15-20 hours total)
- ⚠️ Nice-to-have, not critical
- ⚠️ External configs solve more immediate pain
- ✅ Can implement after stable foundation

**Re-evaluate:** After v1.17.0, assess user feedback on:
1. Are users asking for diff viewers?
2. Are rollback features requested?
3. Do we have bandwidth for 15-20 hour features?

---

## Decision Matrix

| Feature | Priority | Impact | Complexity | Time | Should Do? |
|---------|----------|--------|------------|------|------------|
| **External Models** | HIGH | HIGH | LOW | 4-5h | ✅ YES (v1.15.0) |
| **Permission System** | HIGH | MEDIUM | MEDIUM | 6-8h | ✅ YES (v1.16.0) |
| **External Agents** | MEDIUM | MEDIUM | MEDIUM | 5-6h | ✅ YES (v1.17.0) |
| **Diff Viewer** | MEDIUM | MEDIUM | HIGH | 8-10h | ⏸️ DEFER (v1.18.0+) |
| **Checkpoint/Rollback** | LOW | MEDIUM | MEDIUM | 4-5h | ⏸️ DEFER (v1.18.0+) |
| **Workflow Hooks** | LOW | LOW | MEDIUM | 3-4h | ⏸️ DEFER (v1.18.0+) |

---

## Key Insights

### Why Externalization > Claude Code Parity (For Now)

1. **User Pain Points:**
   - ✅ "I need Claude Sonnet 4.5" → External models solve this
   - ✅ "Extension is too rigid" → External configs solve this
   - ⚠️ "I need to see diffs" → Not frequently requested (yet)

2. **Maintenance Benefits:**
   - ✅ External configs = no code changes for updates
   - ✅ Users can self-service (add models, tweak agents)
   - ✅ Less VSIX rebuilds needed

3. **Foundation for Future:**
   - ✅ External configs enable dynamic loading
   - ✅ Patterns reusable for other features
   - ✅ JSON validation and schemas once, reuse everywhere

4. **Development Efficiency:**
   - ✅ 4-5 hours for models vs 8-10 hours for diff viewer
   - ✅ Quick wins build momentum
   - ✅ Incremental value delivery

---

## Recommendation Summary

**START WITH:** External Model Configuration (v1.15.0)
- 4-5 hours, high impact, solves real user pain
- Foundation for permission system and agent configs
- No rebuild needed for new models

**THEN:** Permission System (v1.16.0)
- Builds on externalization patterns
- Aligns with Claude Code (when used together)
- Safety and trust improvements

**THEN:** External Agent Configuration (v1.17.0)
- Completes externalization strategy
- Enables advanced user customization
- Stable foundation for future features

**DEFER:** Claude Code Parity Features (v1.18.0+)
- Re-evaluate after external configs are stable
- Assess user demand and feedback
- Higher complexity, lower immediate value

---

## Success Criteria

### v1.15.0 Success:
- ✅ Users can add Claude Sonnet 4.5 without waiting for extension update
- ✅ `.machat/models.json` editable and well-documented
- ✅ No TypeScript rebuild needed for model changes

### v1.16.0 Success:
- ✅ Permission system works seamlessly with Claude Code
- ✅ Standalone users have clear permission controls
- ✅ Per-project permission overrides functional

### v1.17.0 Success:
- ✅ Users can create custom agents via JSON
- ✅ Agent behavior modifiable without code
- ✅ All three externalization patterns (models, permissions, agents) stable

---

## Open Questions for User

1. **Do you agree with the prioritization?**
   - Models → Permissions → Agents → Features?

2. **Should we start v1.15.0 (External Models) immediately?**
   - 4-5 hours implementation time
   - Solves Claude 4.5 availability

3. **Any Claude Code parity features you need urgently?**
   - Diff viewer?
   - Rollback system?
   - Or can they wait until after externalizations?

4. **Timeline preference:**
   - Aggressive: v1.15.0 this week, v1.16.0 next week?
   - Moderate: One version per week?
   - Relaxed: Implement as time allows?

---

*Decision Point: External Configuration Foundation vs Advanced Features*
*Recommendation: Externalize first, features later*
