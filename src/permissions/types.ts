/**
 * Permission System Types
 *
 * Phase 1: Foundation - Basic types for permission enforcement
 */

export enum TrustLevel {
    AUTOMATIC = 'automatic',   // No prompt (read files, search, lint)
    APPROVED = 'approved',      // Prompt once per session, remember
    CONSENT = 'consent',        // Always prompt (destructive operations)
    FORBIDDEN = 'forbidden'     // Hard block, no prompt possible
}

export enum OperationType {
    FILE_READ = 'file_read',
    FILE_WRITE = 'file_write',
    COMMAND_EXECUTION = 'command_execution',
    GIT_OPERATIONS = 'git_operations',
    PACKAGE_MANAGEMENT = 'package_management',
    NETWORK_ACCESS = 'network_access'
}

export enum ExecutionVector {
    SHELL_COMMAND = 'shell',           // bash/powershell/cmd
    FILE_OPERATION = 'file',           // read/write/delete
    NETWORK_REQUEST = 'network',       // HTTP/API calls
    MCP_TOOL = 'mcp',                  // MCP server tool calls
    VSCODE_API = 'vscode_api',         // Extension-to-extension
    DATABASE_QUERY = 'database'        // Direct SQL/NoSQL (if exposed)
}

export enum CommandCategory {
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
    BUILD_TOOL = 'build',
    TEST_RUNNER = 'test',
    LINTER = 'lint',

    // Generic/Unknown
    SYSTEM_COMMAND = 'system',
    UNKNOWN = 'unknown'
}

export enum RiskLevel {
    LOW = 'low',           // Read-only, safe operations
    MEDIUM = 'medium',     // Modifications, low impact
    HIGH = 'high',         // Significant changes, reversible
    CRITICAL = 'critical'  // Destructive, hard to undo
}

export interface CommandClassification {
    vector: ExecutionVector;
    category: CommandCategory;
    riskLevel: RiskLevel;
    command?: string;  // Original command for reference
}

export interface AgentPermissions {
    allowedOperations: OperationType[];
    trustLevels: Record<string, TrustLevel>;  // Key is OperationType as string
    allowedPaths: string[];                   // Paths for read operations (or all operations if no allowedWritePaths)
    allowedWritePaths?: string[];             // Optional: Separate paths for write operations
    forbiddenCommands: string[];
    description?: string;
}

export interface PermissionCheckResult {
    allowed: boolean;
    reason?: string;
    agentId?: string;
    operationType?: OperationType;
    resource?: string;
}

export interface PermissionEnforcerConfig {
    checkWorkspaceTrust: boolean;
    blockDangerousCommands: boolean;
    logViolations: boolean;
}
