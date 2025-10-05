# VS Code Permission I### Core Philosophy

Instead of implementing a custom permission system, integrate with VS Code's existing permission and security infrastructure while adding intelligent, agent-specific controls that prevent user consent fatigue.

**Key Insight:** Interactive consent works temporarily but leads to "approve everything" fatigue. The solution is graduated permissions based on operation risk and agent capabilities, combined with VS Code's security model.

**Multi-Perspective Approach:**

- **VS Code Layer**: Leverage workspace trust, extension manifest permissions, and authentication APIs
- **Agent Layer**: Define capability profiles based on agent roles and responsibilities
- **Operation Layer**: Classify operations by risk level (automatic, approved, consent, forbidden)
- **User Layer**: Minimal, targeted consent requests for high-risk operations onlyon for Agent Systems

**Proposal Author:** GitHub Copilot (AI Assistant)  
**Date:** October 1, 2025  
**Status:** Discussion Document  
**Related:** Agent Permissions, VS Code Extension Architecture

## Executive Summary

This proposal outlines an approach to implement agent permissions by leveraging VS Code's existing permission and security infrastructure, rather than building a custom permission system. This aligns with the extension's philosophy of "leveraging the big guys" to avoid reinventing security mechanisms.

## Current Challenges

The multi-agent-chat-extension currently lacks a comprehensive permission system for controlling agent capabilities. Key challenges include:

- **Security Risks**: Agents can potentially execute dangerous operations without user oversight
- **Cost Control**: No mechanism to prevent agents from running expensive operations
- **User Trust**: Lack of transparency and control over agent actions
- **Maintenance Burden**: Building a custom permission system from scratch

## Proposed Solution: VS Code Permission Integration

### Core Philosophy

Instead of implementing a custom permission system, integrate with VS Code's battle-tested security infrastructure:

1. **Workspace Trust** - Foundation for file and command permissions
2. **User Consent Prompts** - For dangerous operations requiring explicit approval
3. **Extension Manifest** - Declarative permission boundaries
4. **Authentication APIs** - For external service access

### Permission Architecture

#### Permission Levels

```typescript
enum OperationTrust {
  // Always allowed (low-risk operations)
  AUTOMATIC = 'automatic',

  // Allowed after initial agent setup (medium-risk)
  APPROVED = 'approved',

  // Always require explicit consent (high-risk)
  CONSENT = 'consent',

  // Never allowed for this agent type
  FORBIDDEN = 'forbidden'
}

enum OperationType {
  FILE_READ = 'file_read',
  FILE_WRITE = 'file_write',
  COMMAND_EXECUTION = 'command_execution',
  NETWORK_ACCESS = 'network_access',
  GIT_OPERATIONS = 'git_operations',
  PACKAGE_MANAGEMENT = 'package_management',
  EXTERNAL_API = 'external_api'
}
```

#### Agent-Specific Capability Profiles

```typescript
interface AgentCapabilities {
  // Core permissions based on agent role
  allowedOperations: OperationType[];

  // Trust levels per operation type
  operationTrust: Record<OperationType, OperationTrust>;

  // Scope restrictions
  allowedPaths: string[];        // Directories this agent can access
  forbiddenCommands: string[];   // Commands this agent cannot run

  // Behavioral controls
  requiresUserPresence: boolean; // Only operate when user is active
  maxAutonomyLevel: number;      // 1-10 scale of independence
  canDelegateTasks: boolean;     // Can coordinate with other agents
}
```

#### Example Agent Capability Profiles

**Documenter Agent (High Autonomy, Low Risk):**

```typescript
const documenterCapabilities: AgentCapabilities = {
  allowedOperations: [OperationType.FILE_READ, OperationType.FILE_WRITE],
  operationTrust: {
    [OperationType.FILE_READ]: OperationTrust.AUTOMATIC,
    [OperationType.FILE_WRITE]: OperationTrust.APPROVED, // Only docs files
    [OperationType.COMMAND_EXECUTION]: OperationTrust.FORBIDDEN,
    [OperationType.GIT_OPERATIONS]: OperationTrust.FORBIDDEN
  },
  allowedPaths: ['docs/', 'README.md', '*.md'],
  forbiddenCommands: ['git', 'npm install', 'rm -rf'],
  requiresUserPresence: false,
  maxAutonomyLevel: 8,
  canDelegateTasks: false
};
```

**Coder Agent (Medium Autonomy, High Impact):**

```typescript
const coderCapabilities: AgentCapabilities = {
  allowedOperations: [
    OperationType.FILE_READ,
    OperationType.FILE_WRITE,
    OperationType.COMMAND_EXECUTION,
    OperationType.GIT_OPERATIONS
  ],
  operationTrust: {
    [OperationType.FILE_READ]: OperationTrust.AUTOMATIC,
    [OperationType.FILE_WRITE]: OperationTrust.APPROVED,
    [OperationType.COMMAND_EXECUTION]: OperationTrust.CONSENT, // Safe commands only
    [OperationType.GIT_OPERATIONS]: OperationTrust.APPROVED
  },
  allowedPaths: ['src/', 'test/', 'scripts/', 'package.json'],
  forbiddenCommands: ['rm -rf /', 'git push --force', 'npm uninstall'],
  requiresUserPresence: true, // Major changes need oversight
  maxAutonomyLevel: 5,
  canDelegateTasks: true
};
```#### Permission Enforcement Layer

```typescript
interface PermissionResult {
  allowed: boolean;
  reason?: string;
}

class PermissionEnforcer {
    private agentCapabilities: Map<string, AgentCapabilities> = new Map();

    async checkPermission(
        agentId: string,
        operation: OperationType,
        resource?: string
    ): Promise<PermissionResult> {
        const agent = this.agentManager.getAgent(agentId);
        const capabilities = this.agentCapabilities.get(agentId);

        if (!capabilities) {
            return { allowed: false, reason: 'No capabilities defined for agent' };
        }

        // Check if operation is allowed for this agent type
        if (!capabilities.allowedOperations.includes(operation)) {
            return { allowed: false, reason: 'Operation not allowed for this agent type' };
        }

        // Check trust level for this operation
        const trustLevel = capabilities.operationTrust[operation];

        switch (trustLevel) {
            case OperationTrust.AUTOMATIC:
                return { allowed: true };

            case OperationTrust.APPROVED:
                return await this.checkApprovedOperation(agentId, operation, resource);

            case OperationTrust.CONSENT:
                return await this.requestUserConsent(agentId, operation, resource);

            case OperationTrust.FORBIDDEN:
                return { allowed: false, reason: 'Operation forbidden for this agent type' };
        }
    }

    private async checkApprovedOperation(
        agentId: string,
        operation: OperationType,
        resource?: string
    ): Promise<PermissionResult> {
        const capabilities = this.agentCapabilities.get(agentId)!;

        // Check path restrictions
        if (resource && !this.isPathAllowed(resource, capabilities.allowedPaths)) {
            return { allowed: false, reason: 'Path not allowed for this agent' };
        }

        // Check command restrictions
        if (operation === OperationType.COMMAND_EXECUTION && resource) {
            if (capabilities.forbiddenCommands.some(cmd => resource.includes(cmd))) {
                return { allowed: false, reason: 'Command forbidden for this agent' };
            }
        }

        // Check workspace trust for file operations
        if (operation === OperationType.FILE_WRITE && !vscode.workspace.isTrusted) {
            return { allowed: false, reason: 'Workspace not trusted for file modifications' };
        }

        return { allowed: true };
    }

    private async requestUserConsent(
        agentId: string,
        operation: OperationType,
        resource?: string
    ): Promise<PermissionResult> {
        const agent = this.agentManager.getAgent(agentId);
        const message = `${agent.icon} ${agent.name} wants to ${operation.replace('_', ' ')}`;

        if (resource) {
            message += `: \`${resource}\``;
        }

        const result = await vscode.window.showWarningMessage(message, { modal: true },
            'Allow Once', 'Allow for Session', 'Deny'
        );

        return {
            allowed: result?.startsWith('Allow') || false,
            reason: result ? undefined : 'User denied permission'
        };
    }

    private isPathAllowed(resourcePath: string, allowedPaths: string[]): boolean {
        return allowedPaths.some(allowedPath => {
            // Simple glob matching - could be enhanced with proper glob library
            return resourcePath.startsWith(allowedPath) ||
                   resourcePath.includes(allowedPath);
        });
    }
}
```

### Integration Points

#### 1. Workspace Trust Integration

```typescript
// Automatic permission adjustment based on workspace trust
vscode.workspace.onDidGrantWorkspaceTrust(() => {
    this.updateAllAgentPermissions();
    vscode.window.showInformationMessage('Workspace trusted - agent capabilities expanded');
});
```

#### 2. User Consent for Dangerous Operations

```typescript
async requestUserConsent(agentId: string, action: string, resource?: string): Promise<boolean> {
    const agent = this.agentManager.getAgent(agentId);
    const message = `${agent.icon} ${agent.name} wants to ${action}` +
                   (resource ? `: \`${resource}\`` : '');

    const result = await vscode.window.showWarningMessage(message, { modal: true },
        'Allow Once', 'Allow for Session', 'Deny'
    );

    if (result === 'Allow for Session') {
        this.sessionPermissions.add(`${agentId}:${action}`);
    }

    return result?.startsWith('Allow') || false;
}
```

#### 3. Extension Manifest Configuration

```json
{
    "capabilities": {
        "untrustedWorkspaces": {
            "supported": "limited",
            "description": "Agents have restricted capabilities in untrusted workspaces",
            "restrictedConfigurations": [
                "multiAgentChat.agents.*.permissions.commandExecution",
                "multiAgentChat.agents.*.permissions.fileWrite"
            ]
        }
    }
}
```

#### 4. Authentication Integration

```typescript
async authenticateForService(agentId: string, service: string): Promise<boolean> {
    try {
        const session = await vscode.authentication.getSession(service, ['read:user'], {
            createIfNone: true
        });
        this.agentSessions.set(`${agentId}:${service}`, session);
        return true;
    } catch {
        return false;
    }
}
```

## Operation Risk Assessment

**Automatic Operations (No User Interaction):**

- Reading files in allowed directories
- Running pre-approved safe commands (lint, format, test)
- Internal agent coordination
- Documentation generation

**Approved Operations (Setup Once):**

- Writing to specific file types in allowed directories
- Running whitelisted scripts
- Making API calls to pre-approved services
- Creating/modifying configuration files

**Consent Operations (Always Ask):**

- Writing to critical system files (package.json, tsconfig.json)
- Running potentially destructive commands (rm, git reset --hard)
- Installing/uninstalling packages
- Making external network requests to new domains

**Forbidden Operations (Never Allowed):**

- Agent-specific restrictions (documenter can't run git commands)
- Directory access violations
- Commands that could compromise system security

## Implementation Phases

### Phase 1: Foundation (High Priority)

- [ ] Integrate workspace trust checking
- [ ] Add basic permission enforcement for file operations
- [ ] Implement user consent prompts for command execution

### Phase 2: Advanced Permissions (Medium Priority)

- [ ] Add network access controls
- [ ] Implement external API whitelisting
- [ ] Add session-based permission grants

### Phase 3: Agent-Specific Controls (Lower Priority)

- [ ] Per-agent permission profiles
- [ ] Permission inheritance from agent roles
- [ ] Advanced consent workflows

## Benefits

### Security Benefits

- **Battle-tested**: Uses VS Code's proven security infrastructure
- **User Control**: Familiar VS Code permission prompts
- **Workspace-aware**: Automatically adjusts based on trust levels
- **Audit Trail**: VS Code logs permission decisions

### Development Benefits

- **Reduced Complexity**: No custom permission system to maintain
- **Consistency**: Same UX patterns as other VS Code extensions
- **Future-proof**: Automatically inherits VS Code security improvements

### User Experience Benefits

- **Transparency**: Clear visibility into agent capabilities
- **Control**: Granular permission management
- **Trust**: Familiar VS Code security model
- **Safety**: Protection against malicious or runaway agent behavior## Integration with Existing Architecture

This proposal integrates seamlessly with the current three-tier model system:

1. **VS Code LM Tier**: Inherits VS Code's permission model
2. **Direct API Tier**: Adds authentication-based permissions
3. **Fallback Tier**: Respects workspace trust boundaries

## Risk Assessment

### Low Risk

- Using established VS Code APIs
- Backward compatible with existing configurations
- Graceful degradation in untrusted workspaces

### Mitigation Strategies

- **Fallback Behavior**: Agents maintain basic functionality even with restricted permissions
- **User Communication**: Clear messaging about permission requirements
- **Progressive Enhancement**: Permissions enhance security without breaking existing workflows

## Success Metrics

- **Security**: Zero permission bypass incidents
- **Usability**: <5% of operations require user consent
- **Performance**: <1% overhead on agent operations
- **User Satisfaction**: >90% user approval of permission model

## Conclusion

This approach leverages VS Code's mature security infrastructure to provide robust agent permissions without the complexity and maintenance burden of a custom system. It aligns with the extension's architectural philosophy of building on proven platforms rather than reinventing core capabilities.

The implementation provides a solid foundation for secure multi-agent collaboration while maintaining the flexibility and performance characteristics that make the extension valuable for development workflows.

---

**Discussion Points for AI Team:**

1. **Tiered Permission Model**: Does the graduated trust approach (automatic/approved/consent/forbidden) effectively balance security with usability while avoiding consent fatigue?

2. **Agent-Specific Capabilities**: How should we implement the AgentCapabilities interface to define role-based permissions without creating maintenance overhead?

3. **Operation Risk Assessment**: Should we expand the risk categorization beyond the current three levels (low/medium/high) to include more granular controls?

4. **VS Code API Integration**: Are there additional VS Code APIs (beyond workspace trust and authentication) that could enhance our permission model?

5. **Fallback Behavior**: How should agents behave when operations are denied - should they request human intervention, attempt alternative approaches, or gracefully fail?

6. **Permission Evolution**: How do we handle permission updates as agents gain trust or as new operation types emerge?

7. **User Experience**: How can we make permission decisions more transparent to users without overwhelming them with technical details?

8. **Testing Strategy**: What automated tests should we implement to validate permission enforcement across different agent types and operation scenarios?
