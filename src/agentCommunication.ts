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

	constructor(
		private agentManager: AgentManager,
		private providerManager: ProviderManager,
		private outputChannel?: vscode.OutputChannel
	) {
		// Load max concurrent agents from configuration
		const config = vscode.workspace.getConfiguration('multiAgentChat');
		this.maxConcurrentAgents = config.get<number>('interAgentComm.maxConcurrent', 3);
	}

	async sendMessageBetweenAgents(
		fromAgent: string,
		toAgent: string,
		message: string,
		context?: any,
		type: 'request' | 'response' | 'broadcast' | 'coordination' = 'request'
	): Promise<string> {
		const agentMessage: AgentMessage = {
			id: this.generateMessageId(),
			from: fromAgent,
			to: toAgent,
			content: message,
			timestamp: new Date(),
			context,
			type
		};

		this.messageQueue.push(agentMessage);
		this.log(`Message queued from ${fromAgent} to ${toAgent}`);

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
		try {
			const toAgent = this.agentManager.getAgent(message.to);
			if (!toAgent) {
				throw new Error(`Agent ${message.to} not found`);
			}

			const provider = this.providerManager.getProvider(toAgent);

			const interAgentPrompt = `
You are receiving a message from another agent.
From: ${message.from}
Type: ${message.type}
Priority: ${message.priority || 'normal'}

Message: ${message.content}

Please provide your response based on your role and capabilities.
`;

			const response = await provider.sendMessage(
				interAgentPrompt,
				toAgent,
				message.context
			);

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
}