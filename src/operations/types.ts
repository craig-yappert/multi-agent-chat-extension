/**
 * Operation types for agent actions
 * Phase 2: Agent Permission System
 */

import { OperationType } from '../logging/types';

/**
 * Base operation interface
 */
export interface Operation {
	/** Type of operation */
	type: OperationType;

	/** Target of operation (file path, command, etc.) */
	target: string;

	/** Original marker text from response */
	originalText: string;

	/** Start index in response */
	startIndex: number;

	/** End index in response */
	endIndex: number;
}

/**
 * File write operation
 */
export interface FileWriteOperation extends Operation {
	type: OperationType.FILE_WRITE;

	/** Content to write */
	content: string;

	/** File encoding (default: utf8) */
	encoding?: string;
}

/**
 * File read operation
 */
export interface FileReadOperation extends Operation {
	type: OperationType.FILE_READ;
}

/**
 * File delete operation
 */
export interface FileDeleteOperation extends Operation {
	type: OperationType.FILE_DELETE;
}

/**
 * File append operation
 */
export interface FileAppendOperation extends Operation {
	type: OperationType.FILE_APPEND;

	/** Content to append */
	content: string;

	/** File encoding (default: utf8) */
	encoding?: string;
}

/**
 * Command execution operation
 */
export interface CommandOperation extends Operation {
	type: OperationType.COMMAND_EXECUTION | OperationType.GIT_OPERATION;

	/** Command to execute */
	command: string;

	/** Working directory (optional) */
	cwd?: string;

	/** Capture output */
	captureOutput?: boolean;
}

/**
 * VS Code action operation
 */
export interface VSCodeOperation extends Operation {
	type: OperationType.VSCODE_ACTION;

	/** Action to perform */
	action: 'open' | 'goto' | 'terminal';

	/** Additional parameters */
	params?: Record<string, any>;
}

/**
 * Result of an operation execution
 */
export interface OperationResult {
	/** Whether operation succeeded */
	success: boolean;

	/** Result message */
	message: string;

	/** Error if operation failed */
	error?: string;

	/** Output from command execution */
	output?: string;

	/** Duration in milliseconds */
	durationMs: number;

	/** Operation that was executed */
	operation: Operation;
}

/**
 * Parsed operations from agent response
 */
export interface ParsedOperations {
	/** List of operations found */
	operations: Operation[];

	/** Original response text */
	originalResponse: string;

	/** Modified response with markers replaced */
	modifiedResponse?: string;
}
