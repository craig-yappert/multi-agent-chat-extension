/**
 * PermissionEnforcer - Enforces agent permissions before operations execute
 *
 * Phase 1: Foundation - Block forbidden operations, no prompts yet
 */

import * as vscode from 'vscode';
import { CommandClassifier } from './CommandClassifier';
import {
    AgentPermissions,
    OperationType,
    PermissionCheckResult,
    PermissionEnforcerConfig,
    TrustLevel,
    RiskLevel
} from './types';

export class PermissionEnforcer {
    private classifier: CommandClassifier;
    private agentPermissions: Map<string, AgentPermissions> = new Map();
    private config: PermissionEnforcerConfig;

    constructor(config?: Partial<PermissionEnforcerConfig>) {
        this.classifier = new CommandClassifier();
        this.config = {
            checkWorkspaceTrust: true,
            blockDangerousCommands: true,
            logViolations: true,
            ...config
        };
    }

    /**
     * Register agent permissions from configuration
     */
    registerAgentPermissions(agentId: string, permissions: AgentPermissions): void {
        this.agentPermissions.set(agentId, permissions);
    }

    /**
     * Check if an agent can perform a specific operation
     */
    async checkPermission(
        agentId: string,
        operation: OperationType,
        resource?: string
    ): Promise<PermissionCheckResult> {
        const permissions = this.agentPermissions.get(agentId);

        if (!permissions) {
            return {
                allowed: false,
                reason: `No permissions configured for agent: ${agentId}`,
                agentId,
                operationType: operation
            };
        }

        // 1. Check if operation is allowed for this agent type
        if (!permissions.allowedOperations.includes(operation)) {
            return {
                allowed: false,
                reason: `${agentId} is not allowed to perform ${operation}`,
                agentId,
                operationType: operation,
                resource
            };
        }

        // 2. Check trust level for this operation
        const trustLevel = permissions.trustLevels[operation] as TrustLevel;
        if (trustLevel === TrustLevel.FORBIDDEN) {
            return {
                allowed: false,
                reason: `${operation} is forbidden for ${agentId}`,
                agentId,
                operationType: operation,
                resource
            };
        }

        // 3. For command execution, do additional checks
        if (operation === OperationType.COMMAND_EXECUTION && resource) {
            const commandCheck = this.checkCommandPermission(agentId, resource, permissions);
            if (!commandCheck.allowed) {
                return commandCheck;
            }
        }

        // 4. For file operations, check path restrictions
        if ((operation === OperationType.FILE_WRITE || operation === OperationType.FILE_READ) && resource) {
            const isWriteOp = operation === OperationType.FILE_WRITE;
            const pathCheck = this.checkPathPermission(agentId, resource, permissions, isWriteOp);
            if (!pathCheck.allowed) {
                return pathCheck;
            }
        }

        // 5. Check workspace trust (if enabled)
        if (this.config.checkWorkspaceTrust) {
            const trustCheck = await this.checkWorkspaceTrust(operation);
            if (!trustCheck.allowed) {
                return {
                    ...trustCheck,
                    agentId,
                    operationType: operation,
                    resource
                };
            }
        }

        // All checks passed
        return {
            allowed: true,
            agentId,
            operationType: operation,
            resource
        };
    }

    /**
     * Check command-specific permissions
     */
    private checkCommandPermission(
        agentId: string,
        command: string,
        permissions: AgentPermissions
    ): PermissionCheckResult {
        // Check forbidden commands list
        for (const forbidden of permissions.forbiddenCommands) {
            if (forbidden === '*' || command.includes(forbidden)) {
                return {
                    allowed: false,
                    reason: `Command contains forbidden pattern: "${forbidden}"`,
                    agentId,
                    operationType: OperationType.COMMAND_EXECUTION,
                    resource: command
                };
            }
        }

        // Check for dangerous commands (if enabled)
        if (this.config.blockDangerousCommands) {
            if (this.classifier.isDangerous(command)) {
                return {
                    allowed: false,
                    reason: 'Command matches dangerous pattern and is blocked for safety',
                    agentId,
                    operationType: OperationType.COMMAND_EXECUTION,
                    resource: command
                };
            }
        }

        // Classify command and check risk
        const classification = this.classifier.classify(command);
        if (classification.riskLevel === RiskLevel.CRITICAL) {
            return {
                allowed: false,
                reason: `Critical risk command detected: ${this.classifier.getRiskDescription(classification)}`,
                agentId,
                operationType: OperationType.COMMAND_EXECUTION,
                resource: command
            };
        }

        return { allowed: true, agentId, resource: command };
    }

    /**
     * Check path restrictions for file operations
     */
    private checkPathPermission(
        agentId: string,
        filePath: string,
        permissions: AgentPermissions,
        isWriteOperation: boolean = false
    ): PermissionCheckResult {
        // Determine which path list to check
        const pathsToCheck = (isWriteOperation && permissions.allowedWritePaths)
            ? permissions.allowedWritePaths
            : permissions.allowedPaths;

        // If allowedPaths includes '*', allow all paths
        if (pathsToCheck.includes('*')) {
            return { allowed: true, agentId, resource: filePath };
        }

        // Check if path matches any allowed pattern
        const normalizedPath = filePath.replace(/\\/g, '/');
        const isAllowed = pathsToCheck.some(allowedPath => {
            const normalizedAllowedPath = allowedPath.replace(/\\/g, '/');

            // Exact match
            if (normalizedPath === normalizedAllowedPath) {
                return true;
            }

            // Directory prefix match (e.g., 'src/' matches 'src/file.ts')
            if (normalizedAllowedPath.endsWith('/') && normalizedPath.startsWith(normalizedAllowedPath)) {
                return true;
            }

            // Glob pattern match (simple *.ext pattern)
            if (normalizedAllowedPath.startsWith('*.')) {
                const ext = normalizedAllowedPath.substring(1); // e.g., '.md'
                if (normalizedPath.endsWith(ext)) {
                    return true;
                }
            }

            // Glob pattern match (ADR*.md style)
            if (normalizedAllowedPath.includes('*')) {
                const pattern = normalizedAllowedPath.replace(/\*/g, '.*');
                const regex = new RegExp(`^${pattern}$`);
                if (regex.test(normalizedPath)) {
                    return true;
                }
            }

            // File name match (e.g., 'README.md')
            if (normalizedPath.endsWith('/' + normalizedAllowedPath) || normalizedPath === normalizedAllowedPath) {
                return true;
            }

            return false;
        });

        if (!isAllowed) {
            const pathType = isWriteOperation ? 'write' : 'access';
            return {
                allowed: false,
                reason: `Path "${filePath}" is not in allowed ${pathType} paths for ${agentId}`,
                agentId,
                resource: filePath
            };
        }

        return { allowed: true, agentId, resource: filePath };
    }

    /**
     * Check workspace trust
     */
    private async checkWorkspaceTrust(operation: OperationType): Promise<PermissionCheckResult> {
        // Only check for write/execute operations
        if (operation === OperationType.FILE_READ) {
            return { allowed: true };
        }

        const isTrusted = vscode.workspace.isTrusted;
        if (!isTrusted) {
            return {
                allowed: false,
                reason: 'Workspace is not trusted. Trust the workspace to allow write/execute operations.',
                operationType: operation
            };
        }

        return { allowed: true };
    }

    /**
     * Log permission violation (Phase 1: console only)
     */
    private logViolation(result: PermissionCheckResult): void {
        if (this.config.logViolations && !result.allowed) {
            console.warn('[PermissionEnforcer] Violation:', {
                agent: result.agentId,
                operation: result.operationType,
                resource: result.resource,
                reason: result.reason
            });
        }
    }

    /**
     * Get agent permissions (for debugging/UI)
     */
    getAgentPermissions(agentId: string): AgentPermissions | undefined {
        return this.agentPermissions.get(agentId);
    }

    /**
     * Check if agent has any permission for an operation type
     */
    hasPermissionFor(agentId: string, operation: OperationType): boolean {
        const permissions = this.agentPermissions.get(agentId);
        if (!permissions) {
            return false;
        }

        return permissions.allowedOperations.includes(operation) &&
               permissions.trustLevels[operation] !== TrustLevel.FORBIDDEN;
    }
}
