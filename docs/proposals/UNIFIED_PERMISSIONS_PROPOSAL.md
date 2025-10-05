# Unified Agent Permission System Proposal

**Status:** Draft (Coalesced from Agent Permissions + VS Code Integration proposals)
**Created:** 2025-10-04
**Priority:** High
**Target Version:** v1.17.0

---

## Executive Summary

A **practical, graduated permission system** that:

1. **Prevents disasters** without overwhelming users with prompts
2. **Leverages VS Code's security model** (workspace trust, authentication)
3. **Enforces agent-specific capabilities** in code, not prompts
4. **Remembers decisions** to avoid consent fatigue
5. **Degrades gracefully** from auto-approve → selective consent → full control

**Key Principle:** Security through architecture, not through user annoyance.

---

## The Consent Fatigue Problem

**Current Reality:**

- Prompt for every operation → Users click "Allow All" → Security theater
- Complex permission rules → Users don't configure → Defaults too restrictive or too permissive

**Our Solution:**

- Risk-based automatic approvals (90% of operations need no prompt)
- Agent capability enforcement in code (documenter physically cannot run git)
- One-time decisions with memory (prompt once, apply forever)
- Workspace trust as foundation (VS Code already asked)

---

## Architecture: Four-Layer Permission Model

### Layer 1: Workspace Trust (Foundation)

**VS Code already asks once:** "Do you trust this workspace?"

```typescript
// If workspace is trusted, expand automatic permissions
if (vscode.workspace.isTrusted) {
    // Agents can write files, run safe commands
    autoApproveOperations.add('file_write', 'safe_commands');
} else {
    // Restricted mode - read-only, require consent for writes
    requireConsentOperations.add('file_write', 'command_execution');
}
```

**Benefit:** Users have already made the trust decision. We inherit it.

---

### Layer 2: Agent Capability Profiles (Architectural Enforcement)

**Each agent has a capability profile that's enforced in code:**

```typescript
interface AgentCapabilities {
    // What this agent can physically do (enforced before LLM call)
    allowedOperations: OperationType[];

    // Risk level per operation (automatic/approved/consent/forbidden)
    trustLevels: Record<OperationType, TrustLevel>;

    // Path restrictions
    allowedPaths: string[];

    // Hard blocks
    forbiddenCommands: string[];
}
```

**Example: Documenter Agent**

```typescript
const documenterCapabilities: AgentCapabilities = {
    allowedOperations: [
        OperationType.FILE_READ,      // Automatic
        OperationType.FILE_WRITE       // Approved (docs only)
    ],
    trustLevels: {
        [OperationType.FILE_READ]: TrustLevel.AUTOMATIC,
        [OperationType.FILE_WRITE]: TrustLevel.APPROVED,
        [OperationType.COMMAND_EXECUTION]: TrustLevel.FORBIDDEN,  // ← Physically blocked
        [OperationType.GIT_OPERATIONS]: TrustLevel.FORBIDDEN
    },
    allowedPaths: ['docs/', '*.md', 'README.md'],
    forbiddenCommands: ['git', 'npm', 'rm']
};
```

**Example: Executor Agent**

```typescript
const executorCapabilities: AgentCapabilities = {
    allowedOperations: [
        OperationType.FILE_READ,
        OperationType.FILE_WRITE,
        OperationType.COMMAND_EXECUTION,
        OperationType.GIT_OPERATIONS
    ],
    trustLevels: {
        [OperationType.FILE_READ]: TrustLevel.AUTOMATIC,
        [OperationType.FILE_WRITE]: TrustLevel.APPROVED,
        [OperationType.COMMAND_EXECUTION]: TrustLevel.CONSENT,  // ← Always ask
        [OperationType.GIT_OPERATIONS]: TrustLevel.APPROVED
    },
    allowedPaths: ['src/', 'test/', 'scripts/'],
    forbiddenCommands: ['rm -rf /', 'git push --force', 'sudo']
};
```

**Critical:** The code checks capabilities BEFORE calling the LLM provider. Forbidden operations return an error, not a prompt.

---

### Layer 3: Operation Risk Levels (Smart Escalation)

#### 3.1 Trust Levels

```typescript
enum TrustLevel {
    AUTOMATIC = 'automatic',   // No prompt (read files, search, lint)
    APPROVED = 'approved',      // Prompt once per session, remember
    CONSENT = 'consent',        // Always prompt (destructive operations)
    FORBIDDEN = 'forbidden'     // Hard block, no prompt possible
}
```

#### 3.2 Execution Vectors (How commands run)

```typescript
enum ExecutionVector {
    SHELL_COMMAND = 'shell',           // bash/powershell/cmd
    FILE_OPERATION = 'file',           // read/write/delete
    NETWORK_REQUEST = 'network',       // HTTP/API calls
    MCP_TOOL = 'mcp',                  // MCP server tool calls
    VSCODE_API = 'vscode_api',         // Extension-to-extension
    DATABASE_QUERY = 'database'        // Direct SQL/NoSQL (if exposed)
}
```

#### 3.3 Command Categories (What commands do)

```typescript
enum CommandCategory {
    // Package management
    NPM = 'npm',
    YARN = 'yarn',
    PNPM = 'pnpm',

    // Container/VM
    DOCKER = 'docker',
    PODMAN = 'podman',

    // Database
    PSQL = 'psql',
    MYSQL = 'mysql',
    MONGO_SHELL = 'mongosh',
    REDIS_CLI = 'redis-cli',

    // Version control
    GIT = 'git',

    // Build/Test tools
    BUILD_TOOL = 'build',      // make, cmake, gradle, etc.
    TEST_RUNNER = 'test',      // jest, mocha, pytest, etc.
    LINTER = 'lint',           // eslint, pylint, etc.

    // Generic/Unknown
    SYSTEM_COMMAND = 'system', // ls, cd, mkdir, etc.
    UNKNOWN = 'unknown'        // Anything unrecognized
}
```

#### 3.4 Command Classification

```typescript
interface CommandClassification {
    vector: ExecutionVector;
    category: CommandCategory;
    riskLevel: RiskLevel;
}

enum RiskLevel {
    LOW = 'low',           // Read-only, safe operations
    MEDIUM = 'medium',     // Modifications, low impact
    HIGH = 'high',         // Significant changes, reversible
    CRITICAL = 'critical'  // Destructive, hard to undo
}
```

**Pattern Matching Examples:**

| Command | Vector | Category | Risk | Why |
|---------|--------|----------|------|-----|
| `npm test` | SHELL | NPM | LOW | Read-only test execution |
| `npm install express` | SHELL | NPM | HIGH | Can install malicious packages |
| `docker ps` | SHELL | DOCKER | LOW | Read-only container list |
| `docker run --privileged` | SHELL | DOCKER | CRITICAL | Container escape risk |
| `psql -c "SELECT *"` | SHELL | PSQL | MEDIUM | Read database |
| `psql -c "DROP TABLE"` | SHELL | PSQL | CRITICAL | Destructive database op |
| `git status` | SHELL | GIT | LOW | Read-only status |
| `git push --force` | SHELL | GIT | CRITICAL | Overwrites remote history |
| `eslint .` (via API) | VSCODE_API | LINTER | LOW | Sandboxed by VS Code |

**Risk Classification:**

**AUTOMATIC (No prompt):**

- Reading files in workspace
- Searching/grepping code
- Running linters/formatters
- Generating code (not executing)

**APPROVED (Prompt once, remember):**

- Writing to existing files (in allowed paths)
- Creating new files (in allowed paths)
- Running whitelisted scripts (npm test, npm build)
- Git add/commit

**CONSENT (Always prompt):**

- Installing/uninstalling packages
- Running arbitrary shell commands
- Deleting files
- Git push/force push
- Network requests to new domains

**FORBIDDEN (Blocked in code):**

- Agent-specific restrictions (documenter can't run git)
- Operations outside allowed paths
- Hardcoded dangerous commands (rm -rf /, sudo, etc.)

---

#### 3.5 CommandClassifier Implementation

**Pattern-based classification with context-aware risk assessment:**

```typescript
class CommandClassifier {
    private patterns: Map<CommandCategory, RegExp[]> = new Map([
        [CommandCategory.NPM, [/^npm\s/, /^npx\s/]],
        [CommandCategory.DOCKER, [/^docker\s/, /^docker-compose\s/]],
        [CommandCategory.PSQL, [/^psql\s/, /^pg_dump\s/, /^pg_restore\s/]],
        [CommandCategory.MYSQL, [/^mysql\s/, /^mysqldump\s/]],
        [CommandCategory.MONGO_SHELL, [/^mongosh\s/, /^mongo\s/]],
        [CommandCategory.GIT, [/^git\s/]],
        [CommandCategory.TEST_RUNNER, [
            /^jest\s/, /^mocha\s/, /^pytest\s/,
            /^npm\s+(test|run\s+test)/
        ]],
        [CommandCategory.LINTER, [
            /^eslint\s/, /^pylint\s/,
            /^npm\s+run\s+lint/
        ]],
        [CommandCategory.BUILD_TOOL, [
            /^make\s/, /^cmake\s/, /^gradle\s/,
            /^npm\s+(run\s+)?build/
        ]]
    ]);

    classify(command: string): CommandClassification {
        // Try to match known categories
        for (const [category, patterns] of this.patterns) {
            if (patterns.some(pattern => pattern.test(command))) {
                return {
                    vector: ExecutionVector.SHELL_COMMAND,
                    category: category,
                    riskLevel: this.assessRisk(category, command)
                };
            }
        }

        // Unknown command - treat as high risk
        return {
            vector: ExecutionVector.SHELL_COMMAND,
            category: CommandCategory.UNKNOWN,
            riskLevel: RiskLevel.HIGH
        };
    }

    private assessRisk(category: CommandCategory, command: string): RiskLevel {
        // Context-aware risk assessment
        switch (category) {
            case CommandCategory.DOCKER:
                if (command.includes('--privileged')) return RiskLevel.CRITICAL;
                if (/docker\s+run/.test(command)) return RiskLevel.HIGH;
                if (/docker\s+(ps|logs|images)/.test(command)) return RiskLevel.LOW;
                return RiskLevel.MEDIUM;

            case CommandCategory.PSQL:
            case CommandCategory.MYSQL:
                if (/DROP|DELETE|TRUNCATE/i.test(command)) return RiskLevel.CRITICAL;
                if (/INSERT|UPDATE/i.test(command)) return RiskLevel.HIGH;
                if (/SELECT|SHOW/i.test(command)) return RiskLevel.MEDIUM;
                return RiskLevel.HIGH;

            case CommandCategory.NPM:
                if (/npm\s+(test|run\s+test)/.test(command)) return RiskLevel.LOW;
                if (/npm\s+(install|uninstall|ci)/.test(command)) return RiskLevel.HIGH;
                return RiskLevel.MEDIUM;

            case CommandCategory.GIT:
                if (/git\s+(status|log|diff|show)/.test(command)) return RiskLevel.LOW;
                if (/git\s+push.*--force/.test(command)) return RiskLevel.CRITICAL;
                if (/git\s+(push|pull)/.test(command)) return RiskLevel.HIGH;
                if (/git\s+(add|commit)/.test(command)) return RiskLevel.MEDIUM;
                return RiskLevel.MEDIUM;

            case CommandCategory.TEST_RUNNER:
            case CommandCategory.LINTER:
                return RiskLevel.LOW;

            case CommandCategory.UNKNOWN:
                return RiskLevel.HIGH;

            default:
                return RiskLevel.MEDIUM;
        }
    }

    // Check for universally dangerous patterns
    isDangerous(command: string): boolean {
        const dangerousPatterns = [
            /rm\s+-rf\s*\/(?!\w)/,           // rm -rf / (not followed by path)
            /sudo\s/,                         // Any sudo command
            /del\s+\/[sq]/i,                  // Windows: del /s /q (recursive delete)
            /format\s+[c-z]:/i,               // Windows: format drives
            />\s*\/dev\/(null|zero|random)/,  // Redirect to system devices
            /:\(\)\s*\{\s*:\|\:&\s*\}\s*;/    // Fork bomb
        ];

        return dangerousPatterns.some(pattern => pattern.test(command));
    }
}
```

**Extensible via Configuration:**

Users can add custom categories in `.machat/permissions.json`:

```json
{
  "customCommandCategories": {
    "playwright": {
      "patterns": ["^playwright\\s", "^npx playwright\\s"],
      "defaultRiskLevel": "medium",
      "allowedAgents": ["executor", "coder"]
    },
    "terraform": {
      "patterns": ["^terraform\\s"],
      "defaultRiskLevel": "high",
      "riskOverrides": {
        "terraform plan": "low",
        "terraform apply": "critical",
        "terraform destroy": "critical"
      }
    }
  }
}
```

---

### Layer 4: Permission Memory (Reduce Prompts)

**Store decisions per agent + operation + resource:**

```typescript
// .machat/permissions.json
{
    "approvedOperations": {
        "coder:file_write:src/*.ts": {
            "timestamp": "2025-10-04T10:30:00Z",
            "expiresAt": null  // Never expires unless revoked
        },
        "executor:command_execution:npm test": {
            "timestamp": "2025-10-04T10:35:00Z",
            "expiresAt": null
        }
    },
    "deniedOperations": {
        "documenter:command_execution:*": {
            "timestamp": "2025-10-04T10:40:00Z",
            "permanent": true
        }
    }
}
```

**Prompt UI with Memory:**

```
⚠️ Coder wants to run: npm install express

Details:
- Agent: 🔨 Coder
- Operation: Package Management
- Command: npm install express

☑️ Remember this decision for Coder
☐ Apply to all agents

[Allow Once] [Allow & Remember] [Deny] [Always Deny]
```

**After "Allow & Remember":** Never prompt again for `coder:package_management:npm install *`

---

## Implementation: Graduated Rollout Plan

### Phase 1: Foundation (Week 1) - Zero Prompts, Maximum Safety

**Goal:** Prevent disasters with zero user prompts

**What Gets Built:**

1. Agent capability profiles (JSON config)
2. Operation blocker (checks capabilities before LLM call)
3. Workspace trust integration
4. Hardcoded danger blocks (rm -rf, sudo, etc.)

**User Impact:**

- No prompts yet
- Dangerous operations blocked with error message
- Agents can only do what their role allows

**Example:**

```
❌ Documenter cannot execute commands
   Suggested action: Use Executor agent for command execution
```

**Files:**

- `src/permissions/AgentCapabilities.ts` - Capability definitions
- `src/permissions/OperationBlocker.ts` - Pre-execution checks
- Update `defaults/agents.json` - Add capabilities to each agent

**Effort:** 4-6 hours

---

### Phase 2: Smart Approvals (Week 2) - Prompt Once, Remember Forever

**Goal:** Add permission memory for approved operations

**What Gets Built:**

1. Permission storage (`.machat/permissions.json`)
2. Permission prompt UI (VS Code modals)
3. "Remember this decision" checkbox
4. Approved operation cache

**User Impact:**

- First time Coder writes a file → Prompt with "Remember" option
- Click "Allow & Remember" → Never prompted again for that pattern
- 90% of operations auto-approved after initial setup

**Prompt Flow:**

```
First npm install:
  ⚠️ Coder wants to: npm install express
  ☑️ Remember this decision for Coder
  [Allow & Remember] [Deny]

Second npm install:
  ✓ Auto-approved (remembered decision)
  (No prompt)
```

**Files:**

- `src/permissions/PermissionStorage.ts` - Persist decisions
- `src/permissions/PermissionUI.ts` - Prompt dialogs
- `src/permissions/PermissionManager.ts` - Check memory before prompting

**Effort:** 6-8 hours

---

### Phase 3: Risk-Based Escalation (Week 3) - Trust Levels

**Goal:** Differentiate between low/medium/high risk operations

**What Gets Built:**

1. Trust level enforcement (AUTOMATIC/APPROVED/CONSENT/FORBIDDEN)
2. Workspace trust inheritance
3. Batch approval UI (team mode)
4. Permission audit log

**User Impact:**

- Trusted workspace → More automatic approvals
- Untrusted workspace → More consent required
- Team mode → Batch approve all operations at once

**Batch Approval UI:**

```
Team Mode wants to perform 8 operations:

✓ AUTOMATIC (no prompt needed):
  - Read 5 files

⚠️ APPROVED (remembered decisions):
  - Write 3 files (src/*.ts)

🔴 CONSENT REQUIRED:
  - Run: npm install express

[Approve All] [Review Each] [Deny All]
```

**Files:**

- `src/permissions/TrustLevelManager.ts` - Risk assessment
- `src/permissions/BatchApproval.ts` - Multi-operation prompts
- `src/permissions/AuditLog.ts` - Permission history

**Effort:** 6-8 hours

---

### Phase 4: Advanced Features (Week 4+) - Polish

**Goal:** Power user features and edge cases

**What Gets Built:**

1. Per-project permission overrides (`.machat/permissions.json`)
2. Permission profiles (strict/balanced/permissive)
3. Revocation UI (review and revoke permissions)
4. Permission sync across projects (optional)

**User Impact:**

- Set project-specific rules
- Switch between permission profiles
- Review what agents can do
- Revoke specific permissions

**Settings UI:**

```
Permission Profile: [Balanced ▼]
  - Strict: Always prompt, minimal auto-approve
  - Balanced: Smart auto-approve, prompt for risky ops
  - Permissive: YOLO mode, trust all agents

Review Permissions:
  ✓ Coder can write to src/*.ts
  ✓ Executor can run npm commands
  ✗ Documenter cannot run git

[Revoke Selected] [Reset to Defaults]
```

**Files:**

- `src/permissions/PermissionProfiles.ts` - Preset profiles
- `src/permissions/PermissionReviewer.ts` - Review UI
- `package.json` - Command: "Review Agent Permissions"

**Effort:** 8-10 hours

---

## Permission Enforcement Flow

```typescript
class PermissionEnforcer {
    async checkPermission(
        agentId: string,
        operation: OperationType,
        resource: string
    ): Promise<PermissionResult> {

        // 1. Get agent capabilities
        const capabilities = this.getCapabilities(agentId);

        // 2. Check if operation is allowed for this agent type
        if (!capabilities.allowedOperations.includes(operation)) {
            return {
                allowed: false,
                reason: `${agentId} cannot perform ${operation}`
            };
        }

        // 3. Check if operation is forbidden (hard block)
        if (capabilities.trustLevels[operation] === TrustLevel.FORBIDDEN) {
            return {
                allowed: false,
                reason: `${operation} is forbidden for ${agentId}`
            };
        }

        // 4. Check path restrictions
        if (!this.isPathAllowed(resource, capabilities.allowedPaths)) {
            return {
                allowed: false,
                reason: `Path ${resource} not allowed for ${agentId}`
            };
        }

        // 5. Check for dangerous commands
        if (this.isDangerousCommand(resource, capabilities.forbiddenCommands)) {
            return {
                allowed: false,
                reason: `Dangerous command blocked: ${resource}`
            };
        }

        // 6. Check trust level
        const trustLevel = capabilities.trustLevels[operation];

        switch (trustLevel) {
            case TrustLevel.AUTOMATIC:
                return { allowed: true };

            case TrustLevel.APPROVED:
                // Check if already approved (memory)
                if (this.isApproved(agentId, operation, resource)) {
                    return { allowed: true };
                }
                // Prompt once, remember decision
                return await this.promptAndRemember(agentId, operation, resource);

            case TrustLevel.CONSENT:
                // Always prompt, never remember
                return await this.promptUser(agentId, operation, resource);
        }
    }

    private async promptAndRemember(
        agentId: string,
        operation: OperationType,
        resource: string
    ): Promise<PermissionResult> {
        const agent = this.agentManager.getAgent(agentId);

        const result = await vscode.window.showWarningMessage(
            `${agent.icon} ${agent.name} wants to ${this.formatOperation(operation)}`,
            {
                modal: true,
                detail: `Resource: ${resource}\n\n☑️ This decision will be remembered`
            },
            'Allow & Remember',
            'Allow Once',
            'Deny'
        );

        if (result === 'Allow & Remember') {
            this.rememberDecision(agentId, operation, resource, true);
            return { allowed: true };
        }

        return { allowed: result === 'Allow Once' };
    }
}
```

---

## Configuration Examples

### Default (Balanced)

```json
{
  "multiAgentChat.permissions.profile": "balanced",
  "multiAgentChat.permissions.inheritWorkspaceTrust": true,
  "multiAgentChat.permissions.rememberDecisions": true
}
```

### Strict (Paranoid)

```json
{
  "multiAgentChat.permissions.profile": "strict",
  "multiAgentChat.permissions.alwaysPrompt": true,
  "multiAgentChat.permissions.autoApprove": []
}
```

### Permissive (YOLO)

```json
{
  "multiAgentChat.permissions.profile": "permissive",
  "multiAgentChat.permissions.trustAllAgents": true,
  "multiAgentChat.permissions.autoApprove": ["*"]
}
```

### Per-Project Override

```json
// .machat/permissions.json
{
  "profile": "balanced",
  "customRules": {
    "documenter": {
      "allowedPaths": ["docs/", "README.md", "wiki/"],
      "trustLevels": {
        "file_write": "automatic"  // No prompt for docs
      }
    },
    "coder": {
      "allowedPaths": ["src/", "test/"],
      "forbiddenCommands": ["git push"]  // Can code, can't push
    }
  }
}
```

---

## Benefits Summary

### For Users

- ✅ **Zero prompts for 90% of operations** (after initial setup)
- ✅ **Clear understanding** of what agents can/cannot do
- ✅ **One-time decisions** with memory
- ✅ **Inherits VS Code trust** (no duplicate decisions)
- ✅ **Batch approvals** for team mode

### For Developers

- ✅ **Enforced in code**, not prompts
- ✅ **Agent capabilities** clearly defined
- ✅ **Follows VS Code patterns**
- ✅ **Extensible** (add new operation types easily)

### For Security

- ✅ **Architectural enforcement** (not LLM-dependent)
- ✅ **Defense in depth** (4 layers of checks)
- ✅ **Audit trail** of all decisions
- ✅ **Graceful degradation** (untrusted → restricted)

---

## Claude Code Sub-Agent Permission Model

**Answer to your question:** Claude Code does NOT differentiate between sub-agent permissions.

**How it works:**

1. Top-level agent (me, Claude Code) has permissions based on user pre-approvals
2. When I launch a sub-agent (Task tool), **the sub-agent inherits my permission context**
3. Sub-agents don't get separate permission prompts
4. All tool calls from sub-agents count against the same approval rules

**Example:**

```
You pre-approve: Bash(npm run compile:*)

I launch a sub-agent for a complex task
↓
Sub-agent runs: Bash(npm run compile:watch)
↓
Auto-approved (inherits your pre-approval to me)
```

**Potential Issue:**

- If a sub-agent misbehaves, it has full access to my permissions
- No isolation or sandboxing of sub-agents
- This is why Claude Code relies on alignment (LLM training) rather than strict permission boundaries for sub-agents

**For our extension:**
We could do better by:

1. Limiting sub-agent capabilities below parent agent
2. Requiring re-approval for sub-agent operations (optional)
3. Logging sub-agent operations separately

But this adds complexity. Phase 1-3 should handle 95% of security needs.

---

## Success Metrics

**Phase 1 (Foundation):**

- Zero permission bypasses
- Zero dangerous operations executed

**Phase 2 (Approvals):**

- <5 prompts per user session (after initial setup)
- >80% of operations auto-approved via memory

**Phase 3 (Trust Levels):**

- Workspace trust reduces prompts by 50%
- Batch approvals handle 90% of team mode operations

**Phase 4 (Advanced):**
>
- >90% user satisfaction with permission UX
- <1% of users disable permissions (YOLO mode)

---

## Next Steps

1. **Review this unified proposal** - Does it balance security vs usability?
2. **Start with Phase 1** - Get agent capabilities defined
3. **Test with real workflows** - Measure prompt frequency
4. **Iterate based on feedback** - Adjust trust levels if too restrictive

**Estimated Total Effort:** 24-32 hours across 4 phases

---

*Coalesced by: Craig Yappert + Claude Code*
*From: Agent Permissions Proposal + VS Code Integration Proposal*
*Date: 2025-10-04*
