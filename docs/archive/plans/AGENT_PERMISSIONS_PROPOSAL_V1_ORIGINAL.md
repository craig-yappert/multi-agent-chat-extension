# Agent Permissions Model Proposal: Pragmatic Permission System

**Status:** Proposal (v1.16.0)
**Updated:** 2025-09-30
**Priority:** High
**Complexity:** Medium

---

## Executive Summary

This proposal outlines a pragmatic permissions system for Multi Agent Chat that:
1. **Leverages Claude Code settings** when used together (primary use case)
2. **Provides sensible standalone defaults** for users who don't use Claude Code
3. **Borrows patterns from Claude Agent SDK** for consistency with Anthropic's design
4. **Implements trust-with-verification** rather than restrictive prevention

## Problem Statement

### Current Issues
1. **No Permission System**: Multi Agent Chat currently has no permission controls
2. **Unclear Security Model**: Users don't know what agents can/can't do
3. **Duplicate Configuration**: When used with Claude Code, settings should align
4. **Standalone Ambiguity**: Without Claude Code, unclear what permissions should be

### Reality Check
- **Primary Use Case**: Most users will run Multi Agent Chat alongside Claude Code
- **Claude Code Has Permissions**: Already handles file operations, tool usage, etc.
- **Don't Reinvent**: Should leverage existing Claude Code permission infrastructure
- **But Provide Fallback**: Need sensible defaults for standalone usage

## Proposed Solution: Layered Permission Strategy

### Three-Tier Approach

#### Tier 1: Inherit from Claude Code (Preferred)
When Claude Code is detected, inherit its permission settings automatically.

#### Tier 2: Claude Agent SDK Patterns (Standalone)
When standalone, use Claude Agent SDK permission model as our default.

#### Tier 3: Fallback Defaults (Minimal)
If neither available, use sensible minimal permissions.

---

## Architecture Design

### 1. Permission Detection & Inheritance

#### 1. Domain-Based Default Permissions
Each agent gets automatic access within their natural domain:

```typescript
interface AgentDomain {
  agent: string;
  allowedPaths: string[];      // Paths they can write without permission
  allowedPatterns: string[];    // File patterns they own
  warningPaths: string[];       // Paths that trigger warnings but not blocks
  blockedPaths: string[];       // System/critical paths always blocked
}

const agentDomains: AgentDomain[] = [
  {
    agent: 'documenter',
    allowedPaths: ['/docs', '/README.md', '/.machat/docs'],
    allowedPatterns: ['*.md', '*.txt', '*.rst'],
    warningPaths: ['/src'],  // Can write but logged prominently
    blockedPaths: ['/.git', '/node_modules']
  },
  {
    agent: 'coder',
    allowedPaths: ['/src', '/lib', '/test'],
    allowedPatterns: ['*.ts', '*.js', '*.jsx', '*.tsx', '*.py', '*.java'],
    warningPaths: ['/docs'],
    blockedPaths: ['/.git', '/node_modules', '/.env*']
  },
  // ... etc
];
```

#### 2. Comprehensive Audit System

Replace permission requests with detailed logging:

```typescript
interface AuditEntry {
  timestamp: Date;
  agent: string;
  action: 'create' | 'modify' | 'delete' | 'rename';
  filepath: string;
  contentHash?: string;
  contentPreview?: string;  // First 200 chars
  gitDiff?: string;         // For modifications
  context: {
    userRequest: string;    // Original user message
    agentPlan?: string;     // What agent said it would do
    interAgentChain?: string[]; // Who asked this agent to do this
  };
}
```

#### 3. Automatic Safety Mechanisms

##### Backup Points
- Auto-commit before agent operations begin
- Snapshot after significant changes
- Easy rollback command: "undo last agent changes"

##### Smart Warnings (not blocks)
- Writing outside typical domain
- Modifying files not recently discussed
- Deleting non-empty directories
- Overwriting without reading first

##### Project-Aware Behaviors
- Respect `.gitignore` patterns
- Understand build vs source directories
- Follow project conventions (detected or configured)

#### 4. Progressive Trust Levels

Users can configure their comfort level:

```typescript
enum TrustLevel {
  PARANOID = 0,    // Current behavior - ask for everything
  CAUTIOUS = 1,    // Ask for cross-domain operations only
  BALANCED = 2,    // Default - domain-based auto-approval
  TRUSTING = 3,    // Ask only for deletions
  YOLO = 4         // Full auto - audit only
}
```

## Implementation Approach

### Phase 1: Foundation (Week 1-2)
1. Implement audit logging system
2. Create domain configuration structure
3. Add backup point creation

### Phase 2: Domain Permissions (Week 2-3)
1. Define default domains per agent
2. Implement path/pattern matching
3. Add warning system (non-blocking)

### Phase 3: Safety Features (Week 3-4)
1. Git integration for diffs
2. Rollback mechanism
3. Project convention detection

### Phase 4: User Control (Week 4-5)
1. Trust level configuration
2. Audit log viewer UI
3. Undo/rollback commands

## Benefits

### Efficiency Gains
- **50-70% reduction** in token usage for file operations
- **Faster task completion** - no permission round-trips
- **Better context preservation** - agents complete their own tasks

### User Experience
- **Fewer interruptions** - work flows naturally
- **Better visibility** - see what was done, not what might be done
- **Easy recovery** - undo is simpler than prevention

### Development Benefits
- **Simpler agent prompts** - no need to explain file operations
- **More realistic testing** - agents behave like real tools
- **Clearer responsibilities** - each agent owns their domain

## Risk Mitigation

### Potential Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Accidental file deletion | Automatic backups, easy rollback |
| Writing to wrong location | Domain warnings, audit trail |
| Overwriting important files | Git diff before changes, snapshot points |
| Security credential exposure | Blocked paths include .env*, keys, etc |
| Build artifact corruption | Separate source vs build detection |

## Success Metrics

1. **Token Usage**: Measure reduction in tokens spent on permission negotiation
2. **Task Completion Time**: Track end-to-end time for common operations
3. **User Interruptions**: Count permission prompts per session
4. **Recovery Events**: Track how often rollback is needed (expect < 1%)
5. **User Satisfaction**: Survey on workflow improvements

## Migration Path

### For Existing Users
1. Default to CAUTIOUS trust level initially
2. Show audit log prominently in first sessions
3. Provide easy toggle to revert to old behavior
4. Gradual education through tooltips/suggestions

### Configuration Migration
```json
{
  "multiAgentChat.permissions.trustLevel": "BALANCED",
  "multiAgentChat.permissions.auditLog": true,
  "multiAgentChat.permissions.autoBackup": true,
  "multiAgentChat.permissions.domainWarnings": true,
  "multiAgentChat.permissions.customDomains": {
    "coder": {
      "additionalPaths": ["/scripts", "/tools"]
    }
  }
}
```

## Open Questions

1. Should domain permissions be project-configurable via `.machat/permissions.json`?
2. How long should audit logs be retained? (Suggest: 30 days or 1000 entries)
3. Should there be a "sudo mode" for temporary elevation?
4. How do we handle multi-workspace scenarios?
5. Should certain operations always require confirmation regardless of trust level?

## Next Steps

1. **Gather Feedback**: Review proposal with team
2. **Prototype**: Build minimal audit system to test concept
3. **User Research**: Survey users on current pain points
4. **Design Review**: Create UI mockups for audit viewer
5. **Implementation**: Follow phased approach above

## Conclusion

This shift from prevention to verification aligns the agent system with how real development teams work. By trusting agents within their domains while maintaining comprehensive audit trails and easy recovery mechanisms, we can dramatically improve efficiency without sacrificing safety. The key insight is that we're building tools, not adversaries, and our permission model should reflect that reality.

---

*Proposal prepared for post-inter-agent communication implementation review*