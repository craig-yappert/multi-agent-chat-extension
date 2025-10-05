# Agent Permissions Model Proposal (v2): Pragmatic Layered Approach

**Status:** Proposal (v1.16.0)
**Created:** 2025-09-30
**Priority:** High
**Complexity:** Medium
**Estimated Effort:** 6-8 hours

---

## Executive Summary

This proposal outlines a **pragmatic, layered permissions system** for Multi Agent Chat that:

1. **Inherits from Claude Code** when used together (primary use case)
2. **Adopts Claude Agent SDK patterns** for standalone mode
3. **Provides sensible fallback defaults** when neither is available
4. **Avoids duplicate permission UX** - leverage what users already understand

**Key Insight:** Don't reinvent permissions. Leverage existing systems and patterns.

---

## Problem Statement

### Current State
- ❌ Multi Agent Chat has **no permission system**
- ❌ Unclear what agents can/cannot do
- ❌ No alignment with Claude Code (when used together)
- ❌ No guidance for standalone users

### Reality Check
- ✅ **Most users will run Multi Agent Chat + Claude Code together**
- ✅ Claude Code already handles file operations, tool permissions, etc.
- ✅ Claude Agent SDK has a proven permission model we can adopt
- ✅ Don't make users configure permissions twice

---

## Proposed Solution: Three-Tier Permission Strategy

### Tier 1: Inherit from Claude Code (Primary)

**When:** Claude Code extension is detected in VS Code

**How:** Read Claude Code's permission settings and apply them

**Example:**
```typescript
// Detect Claude Code extension
const claudeCode = vscode.extensions.getExtension('anthropic.claude-code');

if (claudeCode) {
    // Inherit permission settings from Claude Code
    const claudeCodeSettings = vscode.workspace.getConfiguration('claude');

    this.permissionMode = claudeCodeSettings.get('permissionMode', 'default');
    this.allowedTools = claudeCodeSettings.get('allowedTools', []);
    this.disallowedTools = claudeCodeSettings.get('disallowedTools', []);

    // Use Claude Code's permission flow
    this.useClaudeCodePermissions = true;
}
```

**Benefits:**
- ✅ No duplicate configuration
- ✅ Consistent UX across both extensions
- ✅ Users already understand Claude Code's permission model
- ✅ Automatic alignment with user's trust preferences

---

### Tier 2: Claude Agent SDK Pattern (Standalone)

**When:** Claude Code is NOT detected

**How:** Implement Claude Agent SDK's permission model

**Permission Modes** (from Claude Agent SDK):
```typescript
enum PermissionMode {
    DEFAULT = 'default',           // Standard permission checks
    ACCEPT_EDITS = 'acceptEdits',  // Auto-approve file edits
    BYPASS = 'bypassPermissions'   // Bypass all checks (YOLO mode)
}
```

**Permission Flow** (from Agent SDK):
1. **PreToolUse Hook** - Before tool execution
2. **Permission Rules** - Static allow/deny rules
3. **Permission Mode Check** - Apply mode (default, acceptEdits, bypass)
4. **`canUseTool` Callback** - Dynamic runtime permission logic
5. **PostToolUse Hook** - After tool execution (logging, audit)

**Configuration:**
```json
{
  "multiAgentChat.permissions.mode": "default",
  "multiAgentChat.permissions.allowedTools": ["read_file", "list_files"],
  "multiAgentChat.permissions.disallowedTools": ["exec_command"],
  "multiAgentChat.permissions.hooks.enabled": true
}
```

**Implementation:**
```typescript
class PermissionManager {
    private mode: PermissionMode = PermissionMode.DEFAULT;
    private allowedTools: Set<string> = new Set();
    private disallowedTools: Set<string> = new Set();
    private hooks: PermissionHooks = {};

    async canUseTool(
        toolName: string,
        input: any,
        context: ToolContext
    ): Promise<PermissionResult> {
        // 1. PreToolUse hooks
        await this.runPreToolUseHooks(toolName, input);

        // 2. Check explicit deny rules
        if (this.disallowedTools.has(toolName)) {
            return { allowed: false, reason: 'Tool explicitly disallowed' };
        }

        // 3. Check permission mode
        if (this.mode === PermissionMode.BYPASS) {
            return { allowed: true };
        }

        // 4. Check explicit allow rules
        if (this.allowedTools.has(toolName)) {
            return { allowed: true };
        }

        // 5. Default mode - ask user
        if (this.mode === PermissionMode.DEFAULT) {
            return await this.askUser(toolName, input, context);
        }

        // 6. AcceptEdits mode - auto-approve file edits
        if (this.mode === PermissionMode.ACCEPT_EDITS && this.isFileEdit(toolName)) {
            return { allowed: true };
        }

        // 7. Fall through to deny
        return { allowed: false, reason: 'No permission rule matched' };
    }

    private async askUser(
        toolName: string,
        input: any,
        context: ToolContext
    ): Promise<PermissionResult> {
        // Show VS Code prompt
        const choice = await vscode.window.showWarningMessage(
            `Agent wants to ${toolName}`,
            { modal: true, detail: JSON.stringify(input, null, 2) },
            'Allow Once',
            'Always Allow',
            'Deny'
        );

        if (choice === 'Always Allow') {
            this.allowedTools.add(toolName);
        }

        return { allowed: choice !== 'Deny' };
    }

    private isFileEdit(toolName: string): boolean {
        return ['write_file', 'edit_file', 'create_file'].includes(toolName);
    }

    private async runPreToolUseHooks(toolName: string, input: any): Promise<void> {
        // Run registered hooks for logging, auditing, etc.
        for (const hook of this.hooks.preToolUse || []) {
            await hook({ toolName, input });
        }
    }
}
```

**Benefits:**
- ✅ Follows proven Agent SDK patterns
- ✅ Familiar to Claude developers
- ✅ Granular control (modes, rules, hooks, callbacks)
- ✅ Extensible for future needs

---

### Tier 3: Fallback Defaults (Safety)

**When:** Neither Claude Code nor explicit configuration is available

**How:** Use conservative defaults

**Default Settings:**
```typescript
const FALLBACK_DEFAULTS = {
    permissionMode: PermissionMode.DEFAULT,  // Always ask
    allowedTools: [
        'read_file',      // Safe - read only
        'list_files',     // Safe - read only
        'search_files'    // Safe - read only
    ],
    disallowedTools: [
        'exec_command',   // Dangerous
        'delete_file',    // Requires confirmation
        'shell_exec'      // Dangerous
    ],
    requireConfirmation: [
        'write_file',     // Ask before writing
        'edit_file',      // Ask before editing
        'create_file'     // Ask before creating
    ]
};
```

**User Notification:**
```
⚠️ Multi Agent Chat is using default permission settings.
   Consider configuring permissions or installing Claude Code for better control.

   [Configure Permissions] [Install Claude Code] [Dismiss]
```

**Benefits:**
- ✅ Safe defaults - nothing dangerous without asking
- ✅ Clear user notification
- ✅ Encourages proper configuration

---

## Implementation Plan

### Phase 1: Detection & Inheritance (2 hours)

**Tasks:**
1. Detect Claude Code extension
2. Read Claude Code permission settings
3. Inherit and apply to Multi Agent Chat
4. Test compatibility

**Files:**
- New: `src/permissions/PermissionDetector.ts`
- Update: `src/extension.ts` (initialization)

---

### Phase 2: Agent SDK Pattern Implementation (3 hours)

**Tasks:**
1. Create `PermissionManager` class
2. Implement permission modes (default, acceptEdits, bypass)
3. Implement tool allow/deny rules
4. Add `canUseTool` callback support
5. Add hook system (PreToolUse, PostToolUse)

**Files:**
- New: `src/permissions/PermissionManager.ts`
- New: `src/permissions/PermissionHooks.ts`
- New: `src/permissions/types.ts`

---

### Phase 3: UI & Configuration (2 hours)

**Tasks:**
1. Add permission settings to `multiAgentChat.*` config
2. Create permission prompt UI (VS Code modals)
3. Add "Always Allow" / "Always Deny" persistence
4. Show current permission mode in status bar

**Files:**
- Update: `package.json` (contribution points)
- Update: `src/ui/SettingsPanel.ts`
- New: `src/permissions/PermissionUI.ts`

---

### Phase 4: Testing & Documentation (1 hour)

**Tasks:**
1. Test with Claude Code installed
2. Test without Claude Code
3. Test permission flows (allow, deny, modes)
4. Document permission configuration
5. Update README.md

---

## Configuration Examples

### For Users WITH Claude Code

**No configuration needed!** Inherits from Claude Code automatically.

Optional override:
```json
{
  "multiAgentChat.permissions.inheritFromClaudeCode": true  // default
}
```

---

### For Users WITHOUT Claude Code

**Basic Setup:**
```json
{
  "multiAgentChat.permissions.mode": "acceptEdits",
  "multiAgentChat.permissions.allowedTools": [
    "read_file",
    "write_file",
    "list_files"
  ],
  "multiAgentChat.permissions.disallowedTools": [
    "exec_command",
    "shell_exec"
  ]
}
```

**Power User (YOLO Mode):**
```json
{
  "multiAgentChat.permissions.mode": "bypassPermissions"
}
```

**Paranoid Mode:**
```json
{
  "multiAgentChat.permissions.mode": "default",  // Ask for everything
  "multiAgentChat.permissions.allowedTools": [],
  "multiAgentChat.permissions.requireConfirmation": ["*"]
}
```

---

### Per-Project Permissions

**File:** `.machat/permissions.json`

```json
{
  "mode": "acceptEdits",
  "allowedPaths": [
    "/src",
    "/docs"
  ],
  "blockedPaths": [
    "/.env",
    "/secrets",
    "/.git"
  ],
  "customRules": {
    "documenter": {
      "allowedTools": ["write_file", "read_file"],
      "allowedPatterns": ["*.md", "*.txt"],
      "blockedPaths": ["/src"]
    },
    "coder": {
      "allowedTools": ["write_file", "read_file", "edit_file"],
      "allowedPatterns": ["*.ts", "*.js", "*.tsx"],
      "blockedPaths": ["/docs"]
    }
  }
}
```

---

## Benefits Summary

### For Users
- ✅ **With Claude Code:** Zero configuration, inherits settings
- ✅ **Without Claude Code:** Proven Agent SDK patterns
- ✅ **Flexibility:** Global, project, or agent-specific permissions
- ✅ **Safety:** Conservative defaults, clear prompts

### For Developers
- ✅ **Don't Reinvent:** Leverage existing patterns
- ✅ **Consistency:** Aligns with Anthropic's Agent SDK
- ✅ **Extensible:** Hooks and callbacks for custom logic
- ✅ **Simple:** 3-tier fallback is easy to understand

### For Extension
- ✅ **Better UX:** No duplicate permission prompts
- ✅ **Safer:** Clear permission model
- ✅ **Maintainable:** Follows standard patterns
- ✅ **Future-Proof:** Based on Agent SDK

---

## Risks & Mitigations

### Risk 1: Claude Code Changes Permission Schema
**Mitigation:** Version detection, fallback to Agent SDK pattern

### Risk 2: Users Confused by Three Tiers
**Mitigation:** Auto-detect and apply best tier, show clear status

### Risk 3: Permission Prompts Annoy Users
**Mitigation:** "Always Allow" option, preset modes (acceptEdits, bypass)

---

## Success Metrics

1. **Adoption:** % of users with Claude Code who inherit settings (target: >90%)
2. **Configuration:** % of standalone users who configure permissions (target: >50%)
3. **User Satisfaction:** Survey on permission UX (target: 4/5 stars)
4. **Security:** Zero reports of unwanted file operations

---

## Open Questions

1. Should we support importing/exporting permission profiles?
2. Should certain dangerous operations always ask, even in YOLO mode?
3. How to handle multi-workspace scenarios?
4. Should we build a permission audit log viewer?

---

## Recommendation

**Implement for v1.16.0 after Model Configuration (v1.15.0)**

**Why This Order:**
1. Models are more foundational (affects every request)
2. Permissions can leverage model config patterns
3. Models easier to implement (4-5 hours vs 6-8 hours)
4. Both use similar JSON config patterns

**Roadmap:**
- ✅ v1.14.0 - Documentation Cleanup
- 🔄 v1.15.0 - External Model Configuration
- 📋 v1.16.0 - Permission System (this proposal)
- 📋 v1.17.0 - Settings UI Improvements
- 📋 v1.18.0 - Diff Viewer (nice-to-have)

---

*Proposal by: Craig Yappert (with Claude Code assistance)*
*Informed by: Claude Agent SDK permission patterns*
*Target Version: 1.16.0*
*Estimated Effort: 6-8 hours*
