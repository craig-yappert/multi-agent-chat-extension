export interface AgentConfig {
	id: string;
	name: string;
	role: string;
	description: string;
	icon: string;
	color: string;
	capabilities: string[];
	provider: 'claude' | 'openai' | 'local' | 'mcp';
	model?: string;
	mcpServer?: string;
	specializations: string[];
}

export const defaultAgents: AgentConfig[] = [
	{
		id: 'architect',
		name: 'Architect',
		role: 'System Design & Architecture',
		description: 'Plans system architecture, designs APIs, and makes high-level technical decisions',
		icon: '🏗️',
		color: '#4A90E2',
		capabilities: ['system-design', 'api-design', 'architecture-review', 'tech-strategy'],
		provider: 'claude',
		model: 'opus',
		specializations: ['microservices', 'distributed-systems', 'database-design', 'scalability']
	},
	{
		id: 'coder',
		name: 'Coder',
		role: 'Implementation & Development',
		description: 'Writes code, implements features, and handles complex programming tasks',
		icon: '💻',
		color: '#50C878',
		capabilities: ['code-generation', 'refactoring', 'debugging', 'optimization'],
		provider: 'claude',
		model: 'sonnet',
		specializations: ['algorithms', 'data-structures', 'performance', 'clean-code']
	},
	{
		id: 'executor',
		name: 'Executor',
		role: 'File Operations & Command Execution',
		description: 'Executes commands, manages files, runs tests, and handles system operations',
		icon: '⚡',
		color: '#FF6B35',
		capabilities: ['file-operations', 'command-execution', 'testing', 'deployment'],
		provider: 'mcp',
		mcpServer: 'claude-code',
		specializations: ['bash', 'git', 'npm', 'docker', 'ci-cd']
	},
	{
		id: 'reviewer',
		name: 'Reviewer',
		role: 'Code Review & Quality Assurance',
		description: 'Reviews code quality, suggests improvements, and ensures best practices',
		icon: '🔍',
		color: '#9B59B6',
		capabilities: ['code-review', 'quality-assurance', 'best-practices', 'security-audit'],
		provider: 'openai',
		model: 'gpt-4',
		specializations: ['security', 'performance', 'maintainability', 'testing-strategy']
	},
	{
		id: 'documenter',
		name: 'Documenter',
		role: 'Documentation & Communication',
		description: 'Creates documentation, writes comments, and explains complex concepts',
		icon: '📝',
		color: '#F39C12',
		capabilities: ['documentation', 'explanation', 'comments', 'tutorials'],
		provider: 'openai',
		model: 'gpt-4',
		specializations: ['technical-writing', 'api-docs', 'user-guides', 'readme']
	},
	{
		id: 'coordinator',
		name: 'Coordinator',
		role: 'Multi-Agent Orchestration',
		description: 'Coordinates between agents, manages workflows, and delegates tasks',
		icon: '🤝',
		color: '#E67E22',
		capabilities: ['task-delegation', 'workflow-management', 'agent-coordination', 'conflict-resolution'],
		provider: 'claude',
		model: 'opus',
		specializations: ['project-management', 'task-planning', 'team-coordination', 'decision-making']
	}
];

export class AgentManager {
	private agents: AgentConfig[] = [...defaultAgents];

	getAgent(id: string): AgentConfig | undefined {
		return this.agents.find(agent => agent.id === id);
	}

	getAllAgents(): AgentConfig[] {
		return [...this.agents];
	}

	getAgentsByCapability(capability: string): AgentConfig[] {
		return this.agents.filter(agent => agent.capabilities.includes(capability));
	}

	getAgentsByProvider(provider: string): AgentConfig[] {
		return this.agents.filter(agent => agent.provider === provider);
	}

	addAgent(agent: AgentConfig): void {
		this.agents.push(agent);
	}

	updateAgent(id: string, updates: Partial<AgentConfig>): boolean {
		const index = this.agents.findIndex(agent => agent.id === id);
		if (index !== -1) {
			this.agents[index] = { ...this.agents[index], ...updates };
			return true;
		}
		return false;
	}

	removeAgent(id: string): boolean {
		const index = this.agents.findIndex(agent => agent.id === id);
		if (index !== -1) {
			this.agents.splice(index, 1);
			return true;
		}
		return false;
	}

	// Task routing logic
	selectBestAgent(task: string, context?: any): AgentConfig {
		// Simple keyword-based routing for now
		const taskLower = task.toLowerCase();

		if (taskLower.includes('architecture') || taskLower.includes('design') || taskLower.includes('plan')) {
			return this.getAgent('architect')!;
		}

		if (taskLower.includes('execute') || taskLower.includes('run') || taskLower.includes('file') || taskLower.includes('command')) {
			return this.getAgent('executor')!;
		}

		if (taskLower.includes('review') || taskLower.includes('audit') || taskLower.includes('check')) {
			return this.getAgent('reviewer')!;
		}

		if (taskLower.includes('document') || taskLower.includes('explain') || taskLower.includes('comment')) {
			return this.getAgent('documenter')!;
		}

		if (taskLower.includes('coordinate') || taskLower.includes('manage') || taskLower.includes('delegate')) {
			return this.getAgent('coordinator')!;
		}

		// Default to coder for implementation tasks
		return this.getAgent('coder')!;
	}
}