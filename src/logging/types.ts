/**
 * Structured logging types for operation tracking and observability
 * Phase 2: Agent Permission System
 */

/**
 * Log levels for filtering and severity
 */
export enum LogLevel {
	DEBUG = 'debug',
	INFO = 'info',
	WARN = 'warn',
	ERROR = 'error'
}

/**
 * Operation types that can be logged
 */
export enum OperationType {
	FILE_WRITE = 'file_write',
	FILE_READ = 'file_read',
	FILE_DELETE = 'file_delete',
	FILE_APPEND = 'file_append',
	COMMAND_EXECUTION = 'command_execution',
	GIT_OPERATION = 'git_operation',
	VSCODE_ACTION = 'vscode_action'
}

/**
 * Result of an operation
 */
export enum OperationStatus {
	SUCCESS = 'success',
	FAILURE = 'failure',
	DENIED = 'denied',
	SKIPPED = 'skipped'
}

/**
 * Core log entry structure
 */
export interface LogEntry {
	/** Unique identifier for this log entry */
	id: string;

	/** Timestamp in ISO 8601 format */
	timestamp: string;

	/** Log level */
	level: LogLevel;

	/** Human-readable message */
	message: string;

	/** Session ID (conversation ID) */
	sessionId?: string;

	/** Additional context data */
	context?: Record<string, any>;
}

/**
 * Operation-specific log entry
 * Extends base LogEntry with operation details
 */
export interface OperationLogEntry extends LogEntry {
	/** Agent that initiated the operation */
	agentId: string;

	/** Type of operation */
	operationType: OperationType;

	/** Target of the operation (file path, command, etc.) */
	target: string;

	/** Operation status */
	status: OperationStatus;

	/** Duration in milliseconds */
	durationMs: number;

	/** Error message if operation failed */
	error?: string;

	/** Permission check result */
	permissionGranted: boolean;

	/** Denial reason if permission was denied */
	denialReason?: string;

	/** Operation metadata (sanitized, no full file content) */
	metadata?: {
		/** File size for file operations (bytes) */
		fileSize?: number;

		/** Exit code for command execution */
		exitCode?: number;

		/** Command output summary (first/last N lines) */
		outputSummary?: string;

		/** File type/extension */
		fileType?: string;

		/** Custom metadata */
		[key: string]: any;
	};
}

/**
 * Log query filters for reporting
 */
export interface LogQuery {
	/** Start time (ISO 8601) */
	startTime?: string;

	/** End time (ISO 8601) */
	endTime?: string;

	/** Filter by agent ID */
	agentId?: string;

	/** Filter by operation type */
	operationType?: OperationType;

	/** Filter by status */
	status?: OperationStatus;

	/** Filter by log level */
	level?: LogLevel;

	/** Filter by session ID */
	sessionId?: string;

	/** Maximum number of results */
	limit?: number;
}

/**
 * Log statistics for reporting
 */
export interface LogStatistics {
	/** Total operations logged */
	totalOperations: number;

	/** Operations by status */
	byStatus: Record<OperationStatus, number>;

	/** Operations by type */
	byType: Record<OperationType, number>;

	/** Operations by agent */
	byAgent: Record<string, number>;

	/** Average duration in ms */
	averageDurationMs: number;

	/** Permission denial rate (0-1) */
	denialRate: number;

	/** Time range covered */
	timeRange: {
		start: string;
		end: string;
	};
}
