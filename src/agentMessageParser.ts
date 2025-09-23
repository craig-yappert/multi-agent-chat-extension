import { AgentCommunicationHub } from './agentCommunication';
import { AgentManager } from './agents';

export interface InterAgentCommand {
	type: 'message' | 'broadcast' | 'coordinate';
	targetAgent?: string;
	targetAgents?: string[];
	message: string;
	context?: any;
}

export class AgentMessageParser {
	// Pattern to detect inter-agent messages: @agent: message or [[agent: message]]
	private readonly MESSAGE_PATTERNS = [
		/@(\w+):\s*(.+?)(?=@\w+:|$)/gs,  // @agent: message format
		/\[\[(\w+):\s*(.+?)\]\]/gs,       // [[agent: message]] format
		/ASK\s+(\w+):\s*(.+?)(?=ASK\s+\w+:|$)/gs,  // ASK agent: message format
		/To:\s*(?:🏗️\s*)?(\w+)[\s\S]*?Message:\s*"?(.+?)"?(?:\n|$)/gsi,  // To: Agent format
		/^(\w+):\s*(.+?)(?=\n|$)/gm,  // Simple "Agent: message" at start of line
	];

	// Pattern to detect broadcast commands
	private readonly BROADCAST_PATTERNS = [
		/@all:\s*(.+?)$/gs,                // @all: message
		/\[\[broadcast:\s*(.+?)\]\]/gs,    // [[broadcast: message]]
		/BROADCAST:\s*(.+?)$/gs,           // BROADCAST: message
	];

	// Pattern to detect coordination requests
	private readonly COORDINATE_PATTERNS = [
		/COORDINATE:\s*(.+?)$/gs,          // COORDINATE: task
		/\[\[coordinate:\s*(.+?)\]\]/gs,   // [[coordinate: task]]
	];

	constructor(
		private agentManager: AgentManager,
		private communicationHub: AgentCommunicationHub
	) {}

	/**
	 * Parse agent response for inter-agent communication commands
	 */
	parseMessage(agentId: string, message: string): InterAgentCommand[] {
		const commands: InterAgentCommand[] = [];

		console.log(`[AgentMessageParser] Parsing message from ${agentId} for inter-agent commands`);
		console.log(`[AgentMessageParser] Message sample: ${message.substring(0, 200)}...`);

		// Check for individual agent messages
		for (const pattern of this.MESSAGE_PATTERNS) {
			let match;
			pattern.lastIndex = 0; // Reset regex state
			while ((match = pattern.exec(message)) !== null) {
				const targetAgent = match[1].toLowerCase();
				const content = match[2].trim();

				console.log(`[AgentMessageParser] Found potential command: @${targetAgent}: ${content.substring(0, 50)}...`);

				// Validate target agent exists
				if (this.agentManager.getAgent(targetAgent)) {
					console.log(`[AgentMessageParser] Valid agent ${targetAgent} - adding command`);
					commands.push({
						type: 'message',
						targetAgent,
						message: content
					});
				} else {
					console.log(`[AgentMessageParser] Agent ${targetAgent} not found in manager`);
				}
			}
		}

		// Check for broadcast messages
		for (const pattern of this.BROADCAST_PATTERNS) {
			let match;
			pattern.lastIndex = 0;
			while ((match = pattern.exec(message)) !== null) {
				const content = match[1].trim();
				commands.push({
					type: 'broadcast',
					message: content
				});
			}
		}

		// Check for coordination requests
		for (const pattern of this.COORDINATE_PATTERNS) {
			let match;
			pattern.lastIndex = 0;
			while ((match = pattern.exec(message)) !== null) {
				const task = match[1].trim();
				commands.push({
					type: 'coordinate',
					message: task
				});
			}
		}

		console.log(`[AgentMessageParser] Total commands found: ${commands.length}`);
		if (commands.length > 0) {
			console.log(`[AgentMessageParser] Commands:`, commands);
		}

		return commands;
	}

	/**
	 * Execute parsed inter-agent commands
	 */
	async executeCommands(
		fromAgent: string,
		commands: InterAgentCommand[],
		context?: any
	): Promise<Map<string, string>> {
		const responses = new Map<string, string>();

		console.log(`[AgentMessageParser] Executing ${commands.length} commands from ${fromAgent}`);

		for (const command of commands) {
			console.log(`[AgentMessageParser] Executing command:`, command);
			try {
				switch (command.type) {
					case 'message':
						if (command.targetAgent) {
							console.log(`[AgentMessageParser] Sending message from ${fromAgent} to ${command.targetAgent}: ${command.message.substring(0, 100)}...`);
							const response = await this.communicationHub.sendMessageBetweenAgents(
								fromAgent,
								command.targetAgent,
								command.message,
								context
							);
							console.log(`[AgentMessageParser] Got response from ${command.targetAgent}: ${response.substring(0, 100)}...`);
							responses.set(`${command.targetAgent}_message`, response);
						}
						break;

					case 'broadcast':
						const broadcastResponses = await this.communicationHub.broadcastToAgents(
							fromAgent,
							command.message,
							command.targetAgents,
							context
						);
						for (const [agent, response] of broadcastResponses.entries()) {
							responses.set(`${agent}_broadcast`, response);
						}
						break;

					case 'coordinate':
						// Extract required capabilities from the task description
						const capabilities = this.extractCapabilities(command.message);
						const coordResponses = await this.communicationHub.coordinateAgents(
							command.message,
							capabilities
						);
						for (const [agent, response] of coordResponses.entries()) {
							responses.set(`${agent}_coordinate`, response);
						}
						break;
				}
			} catch (error) {
				responses.set(`error_${command.type}`, `Failed to execute command: ${error}`);
			}
		}

		return responses;
	}

	/**
	 * Extract required capabilities from task description
	 */
	private extractCapabilities(task: string): string[] {
		const capabilities: string[] = [];
		const taskLower = task.toLowerCase();

		// Map keywords to capabilities
		const capabilityKeywords = {
			'code': ['implementation', 'development'],
			'design': ['system_design', 'architecture'],
			'review': ['code_review', 'quality_assurance'],
			'document': ['documentation'],
			'file': ['file_operations'],
			'test': ['testing', 'quality_assurance'],
			'coordinate': ['orchestration'],
			'execute': ['command_execution', 'file_operations']
		};

		for (const [keyword, caps] of Object.entries(capabilityKeywords)) {
			if (taskLower.includes(keyword)) {
				capabilities.push(...caps);
			}
		}

		// Default to all capabilities if none identified
		if (capabilities.length === 0) {
			capabilities.push('all');
		}

		return [...new Set(capabilities)]; // Remove duplicates
	}

	/**
	 * Clean inter-agent commands from the message before displaying to user
	 */
	cleanMessage(message: string): string {
		let cleaned = message;

		// Remove all command patterns
		for (const patterns of [this.MESSAGE_PATTERNS, this.BROADCAST_PATTERNS, this.COORDINATE_PATTERNS]) {
			for (const pattern of patterns) {
				pattern.lastIndex = 0;
				cleaned = cleaned.replace(pattern, '');
			}
		}

		// Clean up extra whitespace and newlines
		cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();

		return cleaned;
	}

	/**
	 * Format inter-agent responses for display
	 */
	formatResponses(responses: Map<string, string>, showInterCommunication: boolean = true): string {
		if (!showInterCommunication || responses.size === 0) {
			return '';
		}

		const formatted: string[] = [];
		formatted.push('\n---\n**Inter-Agent Communication:**\n');

		for (const [key, response] of responses.entries()) {
			const [agent, type] = key.split('_');
			const agentConfig = this.agentManager.getAgent(agent);

			if (agentConfig) {
				formatted.push(`\n${agentConfig.icon} **${agentConfig.name}** (${type}):`);
				formatted.push(response);
			}
		}

		return formatted.join('\n');
	}
}