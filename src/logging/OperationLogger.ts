/**
 * Operation Logger - Structured logging for agent operations
 * Phase 2: Agent Permission System
 */

import * as vscode from 'vscode';
import {
	LogEntry,
	OperationLogEntry,
	LogLevel,
	OperationType,
	OperationStatus,
	LogQuery,
	LogStatistics
} from './types';

/**
 * Configuration for operation logger
 */
export interface OperationLoggerConfig {
	/** Enable console output */
	enableConsole: boolean;

	/** Enable persistent storage */
	enableStorage: boolean;

	/** Minimum log level to capture */
	minLevel: LogLevel;

	/** Maximum log entries to keep in memory */
	maxMemoryEntries: number;
}

/**
 * Structured logger for agent operations with observability support
 */
export class OperationLogger {
	private logs: OperationLogEntry[] = [];
	private config: OperationLoggerConfig;

	constructor(
		private context: vscode.ExtensionContext,
		config?: Partial<OperationLoggerConfig>
	) {
		// Default configuration
		this.config = {
			enableConsole: true,
			enableStorage: true,
			minLevel: LogLevel.INFO,
			maxMemoryEntries: 1000,
			...config
		};

		// Load existing logs from storage if enabled
		if (this.config.enableStorage) {
			this.loadLogs();
		}
	}

	/**
	 * Log an operation with structured data
	 */
	logOperation(entry: Omit<OperationLogEntry, 'id' | 'timestamp' | 'level' | 'message'>): void {
		// Generate ID and timestamp
		const id = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
		const timestamp = new Date().toISOString();

		// Determine log level based on status
		const level = this.getLogLevelForStatus(entry.status);

		// Generate human-readable message
		const message = this.formatOperationMessage(entry);

		// Create full log entry
		const logEntry: OperationLogEntry = {
			id,
			timestamp,
			level,
			message,
			...entry
		};

		// Add to memory (with circular buffer)
		this.logs.push(logEntry);
		if (this.logs.length > this.config.maxMemoryEntries) {
			this.logs.shift(); // Remove oldest
		}

		// Console output if enabled
		if (this.config.enableConsole) {
			this.logToConsole(logEntry);
		}

		// Persist if enabled
		if (this.config.enableStorage) {
			this.persistLog(logEntry);
		}
	}

	/**
	 * Get log level based on operation status
	 */
	private getLogLevelForStatus(status: OperationStatus): LogLevel {
		switch (status) {
			case OperationStatus.SUCCESS:
				return LogLevel.INFO;
			case OperationStatus.DENIED:
				return LogLevel.WARN;
			case OperationStatus.FAILURE:
				return LogLevel.ERROR;
			case OperationStatus.SKIPPED:
				return LogLevel.DEBUG;
			default:
				return LogLevel.INFO;
		}
	}

	/**
	 * Format operation into human-readable message
	 */
	private formatOperationMessage(entry: Omit<OperationLogEntry, 'id' | 'timestamp' | 'level' | 'message'>): string {
		const statusEmoji = {
			[OperationStatus.SUCCESS]: '✅',
			[OperationStatus.FAILURE]: '❌',
			[OperationStatus.DENIED]: '🚫',
			[OperationStatus.SKIPPED]: '⏭️'
		};

		const emoji = statusEmoji[entry.status] || '•';
		const duration = entry.durationMs < 1000
			? `${entry.durationMs}ms`
			: `${(entry.durationMs / 1000).toFixed(2)}s`;

		let msg = `${emoji} [${entry.agentId}] ${entry.operationType}: ${entry.target} (${duration})`;

		if (entry.status === OperationStatus.DENIED && entry.denialReason) {
			msg += ` - ${entry.denialReason}`;
		} else if (entry.status === OperationStatus.FAILURE && entry.error) {
			msg += ` - ${entry.error}`;
		}

		return msg;
	}

	/**
	 * Log to console with appropriate formatting
	 */
	private logToConsole(entry: OperationLogEntry): void {
		const prefix = `[OperationLog:${entry.level.toUpperCase()}]`;
		const timestamp = new Date(entry.timestamp).toLocaleTimeString();
		const fullMessage = `${prefix} ${timestamp} ${entry.message}`;

		switch (entry.level) {
			case LogLevel.DEBUG:
				console.debug(fullMessage);
				break;
			case LogLevel.INFO:
				console.log(fullMessage);
				break;
			case LogLevel.WARN:
				console.warn(fullMessage);
				break;
			case LogLevel.ERROR:
				console.error(fullMessage);
				break;
		}
	}

	/**
	 * Persist log entry to storage
	 */
	private async persistLog(entry: OperationLogEntry): Promise<void> {
		try {
			// Get existing logs from workspace state
			const storedLogs = this.context.workspaceState.get<OperationLogEntry[]>('operationLogs', []);

			// Add new entry
			storedLogs.push(entry);

			// Keep only last N entries to prevent unbounded growth
			const maxStoredLogs = 5000;
			if (storedLogs.length > maxStoredLogs) {
				storedLogs.splice(0, storedLogs.length - maxStoredLogs);
			}

			// Save back to storage
			await this.context.workspaceState.update('operationLogs', storedLogs);
		} catch (error) {
			console.error('[OperationLogger] Failed to persist log:', error);
		}
	}

	/**
	 * Load logs from storage
	 */
	private loadLogs(): void {
		try {
			const storedLogs = this.context.workspaceState.get<OperationLogEntry[]>('operationLogs', []);

			// Load last N entries into memory
			this.logs = storedLogs.slice(-this.config.maxMemoryEntries);

			console.log(`[OperationLogger] Loaded ${this.logs.length} logs from storage`);
		} catch (error) {
			console.error('[OperationLogger] Failed to load logs:', error);
		}
	}

	/**
	 * Query logs with filters
	 */
	query(filters: LogQuery = {}): OperationLogEntry[] {
		let results = [...this.logs];

		// Apply filters
		if (filters.agentId) {
			results = results.filter(log => log.agentId === filters.agentId);
		}

		if (filters.operationType) {
			results = results.filter(log => log.operationType === filters.operationType);
		}

		if (filters.status) {
			results = results.filter(log => log.status === filters.status);
		}

		if (filters.level) {
			results = results.filter(log => log.level === filters.level);
		}

		if (filters.sessionId) {
			results = results.filter(log => log.sessionId === filters.sessionId);
		}

		if (filters.startTime) {
			results = results.filter(log => log.timestamp >= filters.startTime!);
		}

		if (filters.endTime) {
			results = results.filter(log => log.timestamp <= filters.endTime!);
		}

		// Sort by timestamp (newest first)
		results.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

		// Apply limit
		if (filters.limit) {
			results = results.slice(0, filters.limit);
		}

		return results;
	}

	/**
	 * Get statistics for reporting
	 */
	getStatistics(filters: LogQuery = {}): LogStatistics {
		const logs = this.query(filters);

		if (logs.length === 0) {
			return {
				totalOperations: 0,
				byStatus: {} as Record<OperationStatus, number>,
				byType: {} as Record<OperationType, number>,
				byAgent: {},
				averageDurationMs: 0,
				denialRate: 0,
				timeRange: { start: '', end: '' }
			};
		}

		// Calculate statistics
		const byStatus: Record<OperationStatus, number> = {} as any;
		const byType: Record<OperationType, number> = {} as any;
		const byAgent: Record<string, number> = {};
		let totalDuration = 0;
		let deniedCount = 0;

		logs.forEach(log => {
			// Count by status
			byStatus[log.status] = (byStatus[log.status] || 0) + 1;

			// Count by type
			byType[log.operationType] = (byType[log.operationType] || 0) + 1;

			// Count by agent
			byAgent[log.agentId] = (byAgent[log.agentId] || 0) + 1;

			// Sum duration
			totalDuration += log.durationMs;

			// Count denials
			if (log.status === OperationStatus.DENIED) {
				deniedCount++;
			}
		});

		return {
			totalOperations: logs.length,
			byStatus,
			byType,
			byAgent,
			averageDurationMs: totalDuration / logs.length,
			denialRate: deniedCount / logs.length,
			timeRange: {
				start: logs[logs.length - 1].timestamp,
				end: logs[0].timestamp
			}
		};
	}

	/**
	 * Clear all logs
	 */
	async clearLogs(): Promise<void> {
		this.logs = [];
		await this.context.workspaceState.update('operationLogs', []);
		console.log('[OperationLogger] All logs cleared');
	}

	/**
	 * Export logs to JSON file
	 */
	async exportLogs(filters: LogQuery = {}): Promise<string> {
		const logs = this.query(filters);
		return JSON.stringify(logs, null, 2);
	}
}
