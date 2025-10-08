/**
 * Operation Parser - Extract operations from agent responses
 * Phase 2: Agent Permission System
 */

import {
	Operation,
	FileWriteOperation,
	FileReadOperation,
	FileDeleteOperation,
	FileAppendOperation,
	CommandOperation,
	ParsedOperations
} from './types';
import { OperationType } from '../logging/types';

/**
 * Parser for extracting operation markers from agent responses
 */
export class OperationParser {
	/**
	 * Parse agent response for all operation markers
	 */
	parseOperations(response: string): ParsedOperations {
		const operations: Operation[] = [];

		// Parse file write operations
		operations.push(...this.parseFileWrites(response));

		// Parse file read operations
		operations.push(...this.parseFileReads(response));

		// Parse file delete operations
		operations.push(...this.parseFileDeletes(response));

		// Parse file append operations
		operations.push(...this.parseFileAppends(response));

		// Parse command execution operations
		operations.push(...this.parseCommands(response));

		// Sort by start index (order they appear in response)
		operations.sort((a, b) => a.startIndex - b.startIndex);

		return {
			operations,
			originalResponse: response
		};
	}

	/**
	 * Parse file write operations
	 * Format: [FILE_WRITE: path/to/file.ts]
	 *         ```language
	 *         content
	 *         ```
	 *         [/FILE_WRITE]
	 */
	private parseFileWrites(response: string): FileWriteOperation[] {
		const operations: FileWriteOperation[] = [];
		const pattern = /\[FILE_WRITE:\s*([^\]]+)\]\s*(```[\s\S]*?```|\S[\s\S]*?)\s*\[\/FILE_WRITE\]/gi;

		let match;
		while ((match = pattern.exec(response)) !== null) {
			const path = match[1].trim();
			let content = match[2].trim();

			// Extract content from code block if present
			const codeBlockMatch = content.match(/```(?:\w+)?\s*([\s\S]*?)\s*```/);
			if (codeBlockMatch) {
				content = codeBlockMatch[1];
			}

			operations.push({
				type: OperationType.FILE_WRITE,
				target: path,
				content,
				originalText: match[0],
				startIndex: match.index,
				endIndex: match.index + match[0].length
			});
		}

		return operations;
	}

	/**
	 * Parse file read operations
	 * Format: [FILE_READ: path/to/file.ts]
	 */
	private parseFileReads(response: string): FileReadOperation[] {
		const operations: FileReadOperation[] = [];
		const pattern = /\[FILE_READ:\s*([^\]]+)\]/gi;

		let match;
		while ((match = pattern.exec(response)) !== null) {
			const path = match[1].trim();

			operations.push({
				type: OperationType.FILE_READ,
				target: path,
				originalText: match[0],
				startIndex: match.index,
				endIndex: match.index + match[0].length
			});
		}

		return operations;
	}

	/**
	 * Parse file delete operations
	 * Format: [FILE_DELETE: path/to/file.ts]
	 */
	private parseFileDeletes(response: string): FileDeleteOperation[] {
		const operations: FileDeleteOperation[] = [];
		const pattern = /\[FILE_DELETE:\s*([^\]]+)\]/gi;

		let match;
		while ((match = pattern.exec(response)) !== null) {
			const path = match[1].trim();

			operations.push({
				type: OperationType.FILE_DELETE,
				target: path,
				originalText: match[0],
				startIndex: match.index,
				endIndex: match.index + match[0].length
			});
		}

		return operations;
	}

	/**
	 * Parse file append operations
	 * Format: [FILE_APPEND: path/to/file.ts]
	 *         ```language
	 *         content
	 *         ```
	 *         [/FILE_APPEND]
	 */
	private parseFileAppends(response: string): FileAppendOperation[] {
		const operations: FileAppendOperation[] = [];
		const pattern = /\[FILE_APPEND:\s*([^\]]+)\]\s*(```[\s\S]*?```|\S[\s\S]*?)\s*\[\/FILE_APPEND\]/gi;

		let match;
		while ((match = pattern.exec(response)) !== null) {
			const path = match[1].trim();
			let content = match[2].trim();

			// Extract content from code block if present
			const codeBlockMatch = content.match(/```(?:\w+)?\s*([\s\S]*?)\s*```/);
			if (codeBlockMatch) {
				content = codeBlockMatch[1];
			}

			operations.push({
				type: OperationType.FILE_APPEND,
				target: path,
				content,
				originalText: match[0],
				startIndex: match.index,
				endIndex: match.index + match[0].length
			});
		}

		return operations;
	}

	/**
	 * Parse command execution operations
	 * Format: [EXECUTE: npm install]
	 *         [GIT: git commit -m "message"]
	 */
	private parseCommands(response: string): CommandOperation[] {
		const operations: CommandOperation[] = [];

		// Parse general EXECUTE commands
		const executePattern = /\[EXECUTE:\s*([^\]]+)\]/gi;
		let match;
		while ((match = executePattern.exec(response)) !== null) {
			const command = match[1].trim();

			operations.push({
				type: OperationType.COMMAND_EXECUTION,
				target: command,
				command,
				originalText: match[0],
				startIndex: match.index,
				endIndex: match.index + match[0].length,
				captureOutput: true
			});
		}

		// Parse GIT-specific commands
		const gitPattern = /\[GIT:\s*([^\]]+)\]/gi;
		while ((match = gitPattern.exec(response)) !== null) {
			const command = match[1].trim();

			operations.push({
				type: OperationType.GIT_OPERATION,
				target: command,
				command,
				originalText: match[0],
				startIndex: match.index,
				endIndex: match.index + match[0].length,
				captureOutput: true
			});
		}

		return operations;
	}

	/**
	 * Replace operation markers in response with result messages
	 */
	replaceOperationMarkers(
		response: string,
		operations: Operation[],
		results: Map<Operation, string>
	): string {
		let modifiedResponse = response;
		let offset = 0;

		// Sort operations by start index
		const sortedOps = [...operations].sort((a, b) => a.startIndex - b.startIndex);

		for (const op of sortedOps) {
			const result = results.get(op) || '⚠️ Operation result not found';
			const adjustedStart = op.startIndex + offset;
			const adjustedEnd = op.endIndex + offset;

			// Replace the marker with the result
			modifiedResponse =
				modifiedResponse.substring(0, adjustedStart) +
				result +
				modifiedResponse.substring(adjustedEnd);

			// Adjust offset for next replacement
			offset += result.length - (op.endIndex - op.startIndex);
		}

		return modifiedResponse;
	}
}
