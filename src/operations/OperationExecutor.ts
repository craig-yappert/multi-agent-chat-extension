/**
 * Operation Executor - Execute agent operations with permission checks
 * Phase 2: Agent Permission System
 */

import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as path from 'path';
import { promisify } from 'util';
import {
	Operation,
	OperationResult,
	FileWriteOperation,
	FileReadOperation,
	FileDeleteOperation,
	FileAppendOperation,
	CommandOperation
} from './types';
import { OperationType, OperationStatus } from '../logging/types';
import { PermissionEnforcer } from '../permissions/PermissionEnforcer';
import { OperationLogger } from '../logging/OperationLogger';

const execAsync = promisify(cp.exec);

/**
 * Executes operations with permission enforcement and logging
 */
export class OperationExecutor {
	constructor(
		private permissionEnforcer: PermissionEnforcer,
		private logger: OperationLogger,
		private context: vscode.ExtensionContext
	) {}

	/**
	 * Execute a single operation
	 */
	async executeOperation(operation: Operation, agentId: string, sessionId?: string): Promise<OperationResult> {
		const startTime = Date.now();

		try {
			// SECURITY: Resolve and validate paths BEFORE permission checks
			let resolvedTarget = operation.target;

			// For file operations, resolve path and validate workspace boundary
			if (operation.type !== OperationType.COMMAND_EXECUTION &&
			    operation.type !== OperationType.GIT_OPERATION) {

				const workspaceFolder = vscode.workspace.workspaceFolders?.[0];

				if (!workspaceFolder && !path.isAbsolute(operation.target)) {
					throw new Error('No workspace folder open for relative paths');
				}

				// Resolve to absolute path to prevent traversal attacks
				resolvedTarget = path.isAbsolute(operation.target)
					? path.resolve(operation.target)  // Normalize absolute paths
					: path.resolve(workspaceFolder!.uri.fsPath, operation.target);  // Resolve relative

				// SECURITY: Validate workspace boundary to prevent path traversal
				if (workspaceFolder) {
					const workspaceRoot = path.resolve(workspaceFolder.uri.fsPath);
					// Check if resolved path is within workspace (must start with workspace path + separator)
					const isWithinWorkspace = resolvedTarget === workspaceRoot ||
					                         resolvedTarget.startsWith(workspaceRoot + path.sep);

					if (!isWithinWorkspace) {
						const durationMs = Date.now() - startTime;
						this.logger.logOperation({
							agentId,
							operationType: operation.type,
							target: operation.target,
							status: OperationStatus.DENIED,
							durationMs,
							permissionGranted: false,
							denialReason: `Path traversal blocked: "${operation.target}" resolves to "${resolvedTarget}" (outside workspace)`,
							sessionId
						});

						return {
							success: false,
							message: `🚫 Security: Path outside workspace blocked: ${operation.target}`,
							error: 'Path resolves outside workspace boundary',
							durationMs,
							operation
						};
					}
				}
			}

			// Check permissions with RESOLVED path (not raw input)
			const permissionCheck = await this.permissionEnforcer.checkPermission(
				agentId,
				this.getPermissionTypeForOperation(operation.type),
				resolvedTarget  // Use resolved path for permission check
			);

			if (!permissionCheck.allowed) {
				// Log denied operation
				const durationMs = Date.now() - startTime;
				this.logger.logOperation({
					agentId,
					operationType: operation.type,
					target: operation.target,
					status: OperationStatus.DENIED,
					durationMs,
					permissionGranted: false,
					denialReason: permissionCheck.reason || 'Permission denied',
					sessionId
				});

				return {
					success: false,
					message: `🚫 Permission denied: ${permissionCheck.reason || 'No reason provided'}`,
					error: permissionCheck.reason || 'Permission denied',
					durationMs,
					operation
				};
			}

			// Update operation with resolved path for execution
			const executionOperation = { ...operation, target: resolvedTarget };

			// Execute based on operation type (using resolved paths)
			let result: OperationResult;
			switch (executionOperation.type) {
				case OperationType.FILE_WRITE:
					result = await this.executeFileWrite(executionOperation as FileWriteOperation, agentId);
					break;

				case OperationType.FILE_READ:
					result = await this.executeFileRead(executionOperation as FileReadOperation, agentId);
					break;

				case OperationType.FILE_DELETE:
					result = await this.executeFileDelete(executionOperation as FileDeleteOperation, agentId);
					break;

				case OperationType.FILE_APPEND:
					result = await this.executeFileAppend(executionOperation as FileAppendOperation, agentId);
					break;

				case OperationType.COMMAND_EXECUTION:
				case OperationType.GIT_OPERATION:
					result = await this.executeCommand(executionOperation as CommandOperation, agentId);
					break;

				default:
					throw new Error(`Unsupported operation type: ${executionOperation.type}`);
			}

			// Log successful operation
			const durationMs = Date.now() - startTime;
			this.logger.logOperation({
				agentId,
				operationType: operation.type,
				target: operation.target,
				status: result.success ? OperationStatus.SUCCESS : OperationStatus.FAILURE,
				durationMs,
				permissionGranted: true,
				error: result.error,
				sessionId,
				metadata: {
					...result.output ? { outputSummary: this.summarizeOutput(result.output) } : {}
				}
			});

			return { ...result, durationMs };

		} catch (error: any) {
			const durationMs = Date.now() - startTime;

			// Log failed operation
			this.logger.logOperation({
				agentId,
				operationType: operation.type,
				target: operation.target,
				status: OperationStatus.FAILURE,
				durationMs,
				permissionGranted: true,
				error: error.message,
				sessionId
			});

			return {
				success: false,
				message: `❌ Operation failed: ${error.message}`,
				error: error.message,
				durationMs,
				operation
			};
		}
	}

	/**
	 * Execute file write operation
	 * Note: operation.target is already resolved and validated by executeOperation()
	 */
	private async executeFileWrite(operation: FileWriteOperation, agentId: string): Promise<OperationResult> {
		try {
			// operation.target is now already an absolute, validated path
			const uri = vscode.Uri.file(operation.target);

			// Ensure directory exists
			const dirPath = path.dirname(operation.target);
			const dirUri = vscode.Uri.file(dirPath);
			try {
				await vscode.workspace.fs.stat(dirUri);
			} catch {
				await vscode.workspace.fs.createDirectory(dirUri);
			}

			// Write file
			const content = Buffer.from(operation.content, (operation.encoding as BufferEncoding) || 'utf8');
			await vscode.workspace.fs.writeFile(uri, content);

			const fileSize = content.length;

			return {
				success: true,
				message: `✅ File created: ${operation.target} (${fileSize} bytes)`,
				durationMs: 0, // Will be set by caller
				operation
			};

		} catch (error: any) {
			throw new Error(`Failed to write file: ${error.message}`);
		}
	}

	/**
	 * Execute file read operation
	 * Note: operation.target is already resolved and validated by executeOperation()
	 */
	private async executeFileRead(operation: FileReadOperation, agentId: string): Promise<OperationResult> {
		try {
			// operation.target is now already an absolute, validated path
			const uri = vscode.Uri.file(operation.target);
			const content = await vscode.workspace.fs.readFile(uri);
			const textContent = Buffer.from(content).toString('utf8');

			return {
				success: true,
				message: `✅ File read: ${operation.target} (${content.length} bytes)`,
				output: textContent,
				durationMs: 0,
				operation
			};

		} catch (error: any) {
			throw new Error(`Failed to read file: ${error.message}`);
		}
	}

	/**
	 * Execute file delete operation
	 * Note: operation.target is already resolved and validated by executeOperation()
	 */
	private async executeFileDelete(operation: FileDeleteOperation, agentId: string): Promise<OperationResult> {
		try {
			// operation.target is now already an absolute, validated path
			const uri = vscode.Uri.file(operation.target);
			await vscode.workspace.fs.delete(uri);

			return {
				success: true,
				message: `✅ File deleted: ${operation.target}`,
				durationMs: 0,
				operation
			};

		} catch (error: any) {
			throw new Error(`Failed to delete file: ${error.message}`);
		}
	}

	/**
	 * Execute file append operation
	 * Note: operation.target is already resolved and validated by executeOperation()
	 */
	private async executeFileAppend(operation: FileAppendOperation, agentId: string): Promise<OperationResult> {
		try {
			// operation.target is now already an absolute, validated path
			const uri = vscode.Uri.file(operation.target);

			// Read existing content
			let existingContent = '';
			try {
				const buffer = await vscode.workspace.fs.readFile(uri);
				existingContent = buffer.toString();
			} catch {
				// File doesn't exist, that's okay
			}

			// Append new content
			const newContent = existingContent + operation.content;
			const buffer = Buffer.from(newContent, (operation.encoding as BufferEncoding) || 'utf8');
			await vscode.workspace.fs.writeFile(uri, buffer);

			return {
				success: true,
				message: `✅ Content appended to: ${operation.target}`,
				durationMs: 0,
				operation
			};

		} catch (error: any) {
			throw new Error(`Failed to append to file: ${error.message}`);
		}
	}

	/**
	 * Execute command operation
	 */
	private async executeCommand(operation: CommandOperation, agentId: string): Promise<OperationResult> {
		try {
			const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
			const cwd = operation.cwd || (workspaceFolder ? workspaceFolder.uri.fsPath : process.cwd());

			// Execute command
			const { stdout, stderr } = await execAsync(operation.command, {
				cwd,
				maxBuffer: 10 * 1024 * 1024, // 10MB buffer
				timeout: 5 * 60 * 1000 // 5 minute timeout
			});

			const output = stdout + (stderr ? `\n[stderr]\n${stderr}` : '');

			return {
				success: true,
				message: `✅ Command executed: ${operation.command}`,
				output: operation.captureOutput ? output : undefined,
				durationMs: 0,
				operation
			};

		} catch (error: any) {
			// Command failed but was executed
			const output = (error.stdout || '') + (error.stderr ? `\n[stderr]\n${error.stderr}` : '');

			throw new Error(
				`Command failed with exit code ${error.code}:\n${output || error.message}`
			);
		}
	}

	/**
	 * Get permission type for operation type
	 * Convert logging OperationType to permissions OperationType
	 */
	private getPermissionTypeForOperation(opType: OperationType): import('../permissions/types').OperationType {
		// Import the permissions OperationType
		const PermOp = require('../permissions/types').OperationType;

		switch (opType) {
			case OperationType.FILE_WRITE:
			case OperationType.FILE_APPEND:
			case OperationType.FILE_DELETE:
				return PermOp.FILE_WRITE;

			case OperationType.FILE_READ:
				return PermOp.FILE_READ;

			case OperationType.COMMAND_EXECUTION:
				return PermOp.COMMAND_EXECUTION;

			case OperationType.GIT_OPERATION:
				return PermOp.GIT_OPERATIONS;

			default:
				return PermOp.FILE_READ; // Safe default
		}
	}

	/**
	 * Summarize command output for logging (not full content)
	 */
	private summarizeOutput(output: string): string {
		const lines = output.split('\n');

		if (lines.length <= 10) {
			return output;
		}

		// Return first 5 and last 5 lines
		const first5 = lines.slice(0, 5).join('\n');
		const last5 = lines.slice(-5).join('\n');
		const omitted = lines.length - 10;

		return `${first5}\n... (${omitted} lines omitted) ...\n${last5}`;
	}
}
