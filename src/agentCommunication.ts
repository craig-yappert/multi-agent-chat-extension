import { AgentConfig, AgentManager } from './agents';
import { AIProvider, ProviderManager } from './providers';
import * as vscode from 'vscode';

export interface AgentMessage {
	id: string;
	from: string;
	to: string;
	content: string;
	timestamp: Date;
	context?: any;
	type: 'request' | 'response' | 'broadcast' | 'coordination';
	priority?: 'low' | 'normal' | 'high';
	workflow?: string;
}

export interface AgentConversation {
	id: string;
	participants: string[];
	messages: AgentMessage[];
	startTime: Date;
	endTime?: Date;
	topic: string;
	status: 'active' | 'completed' | 'paused';
}

export interface WorkflowStep {
	agent: string;
	task: string;
	dependencies?: string[];
	output?: any;
	status: 'pending' | 'in_progress' | 'completed' | 'failed';
}

export interface AgentWorkflow {
	id: string;
	name: string;
	steps: WorkflowStep[];
	currentStep: number;
	status: 'pending' | 'in_progress' | 'completed' | 'failed';
	context: any;
}

export class AgentCommunicationHub {
	private conversations: Map<string, AgentConversation> = new Map();
	private workflows: Map<string, AgentWorkflow> = new Map();
	private messageQueue: AgentMessage[] = [];
	private isProcessing: boolean = false;
	private maxConcurrentAgents: number = 3;
	private activeAgents: Set<string> = new Set();

	// Message loop prevention
	private maxMessagesPerConversation: number = 10;
	private maxConversationDepth: number = 5;
	private conversationMessageCount: Map<string, number> = new Map();
	private messageChainDepth: Map<string, number> = new Map();

	// Status update callback
	private statusCallback?: (status: string, fromAgent?: string, toAgent?: string) => void;

	constructor(
		private agentManager: AgentManager,
		private providerManager: ProviderManager,
		private outputChannel?: vscode.OutputChannel,
		statusCallback?: (status: string, fromAgent?: string, toAgent?: string) => void
	) {
		this.statusCallback = statusCallback;
		// Load configuration
		const config = vscode.workspace.getConfiguration('multiAgentChat');
		this.maxConcurrentAgents = config.get<number>('interAgentComm.maxConcurrent', 3);
		this.maxMessagesPerConversation = config.get<number>('interAgentComm.maxMessagesPerConversation', 10);
		this.maxConversationDepth = config.get<number>('interAgentComm.maxConversationDepth', 5);
	}

	async sendMessageBetweenAgents(
		fromAgent: string,
		toAgent: string,
		message: string,
		context?: any,
		type: 'request' | 'response' | 'broadcast' | 'coordination' = 'request'
	): Promise<string> {
		// Enhanced debug logging
		console.log(`\n[Send Message] ${fromAgent} >> ${toAgent} (${type})`);
		console.log(`[Send Message] Content: "${message.substring(0, 100)}${message.length > 100 ? '...' : ''}"`);
		// Check conversation limits
		const conversationId = context?.conversationId || this.generateConversationId();

		// Check message count limit
		const messageCount = this.conversationMessageCount.get(conversationId) || 0;
		if (messageCount >= this.maxMessagesPerConversation) {
			this.log(`Conversation ${conversationId} reached max message limit (${this.maxMessagesPerConversation})`);
			return `[System: Maximum message limit reached for this conversation (${this.maxMessagesPerConversation} messages)]`;
		}

		// Check conversation depth
		const depth = this.messageChainDepth.get(conversationId) || 0;
		if (depth >= this.maxConversationDepth) {
			this.log(`Conversation ${conversationId} reached max depth (${this.maxConversationDepth})`);
			return `[System: Maximum conversation depth reached (${this.maxConversationDepth} levels)]`;
		}

		// Update counters
		this.conversationMessageCount.set(conversationId, messageCount + 1);
		if (type === 'response') {
			this.messageChainDepth.set(conversationId, depth + 1);
		}

		const agentMessage: AgentMessage = {
			id: this.generateMessageId(),
			from: fromAgent,
			to: toAgent,
			content: message,
			timestamp: new Date(),
			context: { ...context, conversationId },
			type
		};

		this.messageQueue.push(agentMessage);
		this.log(`Message queued from ${fromAgent} to ${toAgent} (Conv: ${conversationId}, Count: ${messageCount + 1})`);
		console.log(`[Message Queue] Added message to queue. Queue size: ${this.messageQueue.length}`);

		// Send status update if callback is available
		if (this.statusCallback) {
			const fromAgentConfig = this.agentManager.getAgent(fromAgent);
			const toAgentConfig = this.agentManager.getAgent(toAgent);
			const fromName = fromAgentConfig ? fromAgentConfig.name : fromAgent;
			const toName = toAgentConfig ? toAgentConfig.name : toAgent;
			const fromIcon = fromAgentConfig ? fromAgentConfig.icon : '🤖';
			const toIcon = toAgentConfig ? toAgentConfig.icon : '🤖';

			this.statusCallback(
				`${fromName} sending message to ${toName}...`,
				fromAgent,
				toAgent
			);
		}

		if (!this.isProcessing) {
			this.processMessageQueue();
		}

		return await this.waitForResponse(agentMessage.id);
	}

	async broadcastToAgents(
		fromAgent: string,
		message: string,
		targetAgents?: string[],
		context?: any
	): Promise<Map<string, string>> {
		const agents = targetAgents || this.agentManager.getAllAgents()
			.filter(a => a.id !== fromAgent && a.id !== 'team')
			.map(a => a.id);

		const responses = new Map<string, string>();

		const promises = agents.map(async (agentId) => {
			try {
				const response = await this.sendMessageBetweenAgents(
					fromAgent,
					agentId,
					message,
					context,
					'broadcast'
				);
				responses.set(agentId, response);
			} catch (error) {
				responses.set(agentId, `Error: ${error}`);
			}
		});

		await Promise.all(promises);
		return responses;
	}

	async executeWorkflow(workflow: AgentWorkflow): Promise<void> {
		workflow.status = 'in_progress';
		this.workflows.set(workflow.id, workflow);

		this.log(`Starting workflow: ${workflow.name}`);

		try {
			for (let i = 0; i < workflow.steps.length; i++) {
				const step = workflow.steps[i];
				workflow.currentStep = i;

				if (step.dependencies && step.dependencies.length > 0) {
					const allDependenciesMet = step.dependencies.every(depId => {
						const depStep = workflow.steps.find(s => s.agent === depId);
						return depStep?.status === 'completed';
					});

					if (!allDependenciesMet) {
						step.status = 'failed';
						throw new Error(`Dependencies not met for step ${i}`);
					}
				}

				step.status = 'in_progress';

				const agent = this.agentManager.getAgent(step.agent);
				if (!agent) {
					throw new Error(`Agent ${step.agent} not found`);
				}

				const provider = this.providerManager.getProvider(agent);
				const response = await provider.sendMessage(
					step.task,
					agent,
					{ ...workflow.context, previousSteps: workflow.steps.slice(0, i) }
				);

				step.output = response;
				step.status = 'completed';

				this.log(`Workflow step ${i} completed by ${step.agent}`);
			}

			workflow.status = 'completed';
			this.log(`Workflow ${workflow.name} completed successfully`);

		} catch (error) {
			workflow.status = 'failed';
			this.log(`Workflow ${workflow.name} failed: ${error}`);
			throw error;
		}
	}

	createConversation(topic: string, participants: string[]): string {
		const conversation: AgentConversation = {
			id: this.generateConversationId(),
			participants,
			messages: [],
			startTime: new Date(),
			topic,
			status: 'active'
		};

		this.conversations.set(conversation.id, conversation);
		return conversation.id;
	}

	addMessageToConversation(conversationId: string, message: AgentMessage): void {
		const conversation = this.conversations.get(conversationId);
		if (conversation) {
			conversation.messages.push(message);
		}
	}

	getConversation(conversationId: string): AgentConversation | undefined {
		return this.conversations.get(conversationId);
	}

	async coordinateAgents(
		task: string,
		requiredCapabilities: string[]
	): Promise<Map<string, string>> {
		const coordinator = this.agentManager.getAgent('coordinator');
		if (!coordinator) {
			throw new Error('Coordinator agent not found');
		}

		const selectedAgents = this.agentManager.getAllAgents().filter(agent =>
			requiredCapabilities.some(cap => agent.capabilities.includes(cap))
		);

		if (selectedAgents.length === 0) {
			throw new Error('No agents found with required capabilities');
		}

		const conversationId = this.createConversation(task, selectedAgents.map(a => a.id));

		const coordinationPrompt = `
As the Coordinator, please manage the following task: "${task}"

Available agents for this task:
${selectedAgents.map(a => `- ${a.name} (${a.id}): ${a.capabilities.join(', ')}`).join('\n')}

Please coordinate their efforts and provide a cohesive solution.
`;

		const responses = await this.broadcastToAgents(
			'coordinator',
			coordinationPrompt,
			selectedAgents.map(a => a.id),
			{ conversationId, task }
		);

		const conversation = this.getConversation(conversationId);
		if (conversation) {
			conversation.status = 'completed';
			conversation.endTime = new Date();
		}

		return responses;
	}

	private async processMessageQueue(): Promise<void> {
		if (this.isProcessing || this.messageQueue.length === 0) {
			return;
		}

		console.log(`[Queue Processing] Starting to process ${this.messageQueue.length} messages`);
		this.isProcessing = true;

		while (this.messageQueue.length > 0) {
			while (this.activeAgents.size >= this.maxConcurrentAgents) {
				await this.delay(100);
			}

			const message = this.messageQueue.shift();
			if (!message) continue;

			this.activeAgents.add(message.to);

			this.processMessage(message).finally(() => {
				this.activeAgents.delete(message.to);
			});
		}

		this.isProcessing = false;
	}

	private async processMessage(message: AgentMessage): Promise<void> {
		console.log(`\n[Received Message] ${message.from} >> ${message.to} (${message.type})`);
		console.log(`[Received Message] Content: "${message.content.substring(0, 100)}${message.content.length > 100 ? '...' : ''}"`);
		try {
			const toAgent = this.agentManager.getAgent(message.to);
			if (!toAgent) {
				console.error(`[Process Error] Agent ${message.to} not found in AgentManager!`);
				console.error(`[Process Error] Available agents:`, this.agentManager.getAllAgents().map(a => a.id));
				throw new Error(`Agent ${message.to} not found`);
			}

			console.log(`[Process Message] Target agent found: ${toAgent.name} (${toAgent.id})`);

			// Send status update that agent is processing
			if (this.statusCallback) {
				const fromAgentConfig = this.agentManager.getAgent(message.from);
				const fromName = fromAgentConfig ? fromAgentConfig.name : message.from;
				const fromIcon = fromAgentConfig ? fromAgentConfig.icon : '🤖';

				this.statusCallback(
					`${toAgent.name} is processing message from ${fromName}...`,
					message.from,
					message.to
				);
			}

			const provider = this.providerManager.getProvider(toAgent);
			console.log(`[Process Message] Got provider for ${toAgent.id}:`, provider.constructor.name);

			// Check if this is part of a user-initiated request chain
			const userContext = message.context?.userRequest ?
				`\nOriginal User Request: "${message.context.userRequest}"
Note: The user asked ${message.from} to contact you with this request.\n` : '';

			const interAgentPrompt = `
You are receiving a message from another agent.
From: ${message.from}
Type: ${message.type}
Priority: ${message.priority || 'normal'}
${userContext}
Message: ${message.content}

IMPORTANT: If this is a user-initiated request (see above), prioritize fulfilling the user's intent even if it seems unusual for your role.
Please provide your response based on the request above.
`;

			console.log(`[Process Message] Sending to provider with prompt...`);
			const response = await provider.sendMessage(
				interAgentPrompt,
				toAgent,
				message.context
			);
			console.log(`[Process Response] Got response from ${message.to}: "${response.substring(0, 100)}${response.length > 100 ? '...' : ''}"`);

			const responseMessage: AgentMessage = {
				id: this.generateMessageId(),
				from: message.to,
				to: message.from,
				content: response,
				timestamp: new Date(),
				context: message.context,
				type: 'response'
			};

			this.storeResponse(message.id, response);

		} catch (error) {
			console.error(`[Process Error] Failed to process message from ${message.from} to ${message.to}:`, error);
			this.log(`Error processing message from ${message.from} to ${message.to}: ${error}`);
			this.storeResponse(message.id, `Error: ${error}`);
		}
	}

	private responseStore: Map<string, string> = new Map();
	private responseWaiters: Map<string, (value: string) => void> = new Map();

	private storeResponse(messageId: string, response: string): void {
		this.responseStore.set(messageId, response);
		const waiter = this.responseWaiters.get(messageId);
		if (waiter) {
			waiter(response);
			this.responseWaiters.delete(messageId);
		}
	}

	private async waitForResponse(messageId: string, timeout: number = 30000): Promise<string> {
		const existingResponse = this.responseStore.get(messageId);
		if (existingResponse) {
			return existingResponse;
		}

		return new Promise((resolve, reject) => {
			const timer = setTimeout(() => {
				this.responseWaiters.delete(messageId);
				reject(new Error(`Timeout waiting for response to message ${messageId}`));
			}, timeout);

			this.responseWaiters.set(messageId, (response: string) => {
				clearTimeout(timer);
				resolve(response);
			});
		});
	}

	private generateMessageId(): string {
		return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	}

	private generateConversationId(): string {
		return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	}

	private delay(ms: number): Promise<void> {
		return new Promise(resolve => setTimeout(resolve, ms));
	}

	clearMessageQueue(): void {
		console.log('Clearing message queue - Emergency stop');
		this.messageQueue = [];
		this.isProcessing = false;
		this.activeAgents.clear();
		this.conversationMessageCount.clear();
		this.messageChainDepth.clear();
		this.conversations.clear();
		this.workflows.clear();
	}

	private log(message: string): void {
		if (this.outputChannel) {
			this.outputChannel.appendLine(`[AgentComm] ${new Date().toISOString()} - ${message}`);
		}
		console.log(`[AgentComm] ${message}`);
	}

	getActiveWorkflows(): AgentWorkflow[] {
		return Array.from(this.workflows.values()).filter(w =>
			w.status === 'in_progress' || w.status === 'pending'
		);
	}

	getCompletedWorkflows(): AgentWorkflow[] {
		return Array.from(this.workflows.values()).filter(w =>
			w.status === 'completed'
		);
	}

	clearCompletedWorkflows(): void {
		for (const [id, workflow] of this.workflows.entries()) {
			if (workflow.status === 'completed' || workflow.status === 'failed') {
				this.workflows.delete(id);
			}
		}
	}

	resetConversationLimits(conversationId: string): void {
		this.conversationMessageCount.delete(conversationId);
		this.messageChainDepth.delete(conversationId);
		this.log(`Reset conversation limits for ${conversationId}`);
	}

	getConversationStats(conversationId: string): { messageCount: number; depth: number } {
		return {
			messageCount: this.conversationMessageCount.get(conversationId) || 0,
			depth: this.messageChainDepth.get(conversationId) || 0
		};
	}
}