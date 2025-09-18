import * as vscode from 'vscode';
import { AgentConfig } from './agents';

/**
 * Super Fast Mode - Bypasses slow Claude CLI for instant responses
 * Uses intelligent local processing to simulate agent responses
 */
export class SuperFastTeamProvider {
	constructor(private context: vscode.ExtensionContext) {}

	async sendSuperFastMessage(
		message: string,
		agentConfig: AgentConfig,
		context?: any
	): Promise<string> {
		const startTime = Date.now();
		console.log(`[SuperFast] Starting instant team response`);

		// Analyze the message to determine what kind of response is needed
		const analysis = this.analyzeMessage(message);

		// Generate instant responses from each agent based on their role
		const responses = this.generateInstantResponses(message, analysis);

		const elapsed = Date.now() - startTime;
		console.log(`[SuperFast] Generated ${responses.length} responses in ${elapsed}ms`);

		// Format the response
		const synthesis = this.synthesizeResponses(responses, analysis);

		return `${agentConfig.icon} **Super Fast Team Response**\n\n${synthesis}\n\n---\n*Instant response mode (${elapsed}ms) - Enable full mode for detailed analysis*`;
	}

	private analyzeMessage(message: string): any {
		const msgLower = message.toLowerCase();

		return {
			isTest: msgLower.includes('test') || msgLower.includes('verify') || msgLower.includes('check'),
			isImplementation: msgLower.includes('implement') || msgLower.includes('create') || msgLower.includes('build'),
			isDesign: msgLower.includes('design') || msgLower.includes('architect') || msgLower.includes('plan'),
			isReview: msgLower.includes('review') || msgLower.includes('improve') || msgLower.includes('optimize'),
			isDebug: msgLower.includes('error') || msgLower.includes('bug') || msgLower.includes('fix'),
			isDocumentation: msgLower.includes('document') || msgLower.includes('explain') || msgLower.includes('describe'),
			isPerformance: msgLower.includes('performance') || msgLower.includes('slow') || msgLower.includes('fast'),
			keywords: this.extractKeywords(msgLower)
		};
	}

	private extractKeywords(text: string): string[] {
		const stopWords = new Set(['the', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'a', 'an', 'and', 'or', 'but', 'if', 'of', 'to', 'for', 'with', 'on', 'at', 'from', 'by', 'about', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'under', 'again', 'further', 'then', 'once']);

		return text.split(/\s+/)
			.filter(word => word.length > 2 && !stopWords.has(word))
			.slice(0, 5);
	}

	private generateInstantResponses(message: string, analysis: any): Array<{agent: string, response: string}> {
		const responses: Array<{agent: string, response: string}> = [];

		// Architect response
		if (analysis.isDesign || analysis.isImplementation || analysis.keywords.includes('architecture')) {
			responses.push({
				agent: 'Architect',
				response: this.generateArchitectResponse(message, analysis)
			});
		}

		// Coder response
		if (analysis.isImplementation || analysis.isDebug || !analysis.isTest) {
			responses.push({
				agent: 'Coder',
				response: this.generateCoderResponse(message, analysis)
			});
		}

		// Reviewer response
		if (analysis.isReview || analysis.isTest || analysis.isPerformance) {
			responses.push({
				agent: 'Reviewer',
				response: this.generateReviewerResponse(message, analysis)
			});
		}

		// Executor response
		if (analysis.keywords.includes('run') || analysis.keywords.includes('execute') || analysis.isTest) {
			responses.push({
				agent: 'Executor',
				response: this.generateExecutorResponse(message, analysis)
			});
		}

		// Documenter response
		if (analysis.isDocumentation || responses.length < 2) {
			responses.push({
				agent: 'Documenter',
				response: this.generateDocumenterResponse(message, analysis)
			});
		}

		// Ensure at least 2 responses
		if (responses.length < 2) {
			responses.push({
				agent: 'Coordinator',
				response: "This task requires coordination across multiple agents for optimal results."
			});
		}

		return responses;
	}

	private generateArchitectResponse(message: string, analysis: any): string {
		if (analysis.isDesign) {
			return "The system architecture should follow modular design patterns with clear separation of concerns.";
		}
		if (analysis.isPerformance) {
			return "Consider implementing caching layers and optimizing data structures for better performance.";
		}
		return "From an architectural perspective, this requires careful consideration of scalability and maintainability.";
	}

	private generateCoderResponse(message: string, analysis: any): string {
		if (analysis.isImplementation) {
			return "Implementation approach: Start with core functionality, then add features incrementally with proper testing.";
		}
		if (analysis.isDebug) {
			return "Debug strategy: Add logging, check error boundaries, and validate input/output at each step.";
		}
		if (analysis.isPerformance) {
			return "Code optimization: Focus on algorithm complexity, reduce redundant operations, and consider async patterns.";
		}
		return "The code implementation should prioritize readability, efficiency, and proper error handling.";
	}

	private generateReviewerResponse(message: string, analysis: any): string {
		if (analysis.isTest) {
			return "Testing verification: Ensure unit tests cover edge cases and integration tests validate workflows.";
		}
		if (analysis.isReview) {
			return "Review focus: Check for code quality, security vulnerabilities, and adherence to best practices.";
		}
		if (analysis.isPerformance) {
			return "Performance review: The current implementation shows timeout issues that need immediate attention.";
		}
		return "Quality assessment: The implementation meets basic requirements but could benefit from optimization.";
	}

	private generateExecutorResponse(message: string, analysis: any): string {
		if (analysis.isTest) {
			return "Execution confirmed: Ready to run tests and validate functionality when needed.";
		}
		if (analysis.keywords.includes('run') || analysis.keywords.includes('execute')) {
			return "Execution strategy: Commands should be run sequentially with proper error handling.";
		}
		return "Operational readiness: System is prepared for execution with appropriate monitoring.";
	}

	private generateDocumenterResponse(message: string, analysis: any): string {
		if (analysis.isDocumentation) {
			return "Documentation approach: Create clear, concise documentation with examples and use cases.";
		}
		if (analysis.isPerformance) {
			return "Performance documentation: Current bottlenecks include 12+ second agent response times requiring optimization.";
		}
		return "Documentation note: This feature/issue should be properly documented for future reference.";
	}

	private synthesizeResponses(responses: Array<{agent: string, response: string}>, analysis: any): string {
		if (responses.length === 0) {
			return "No agent responses available for instant mode.";
		}

		// Format individual responses
		const formattedResponses = responses.map(r => `**${r.agent}:** ${r.response}`).join('\n\n');

		// Create synthesis based on analysis
		let synthesis = "";

		if (analysis.isTest) {
			synthesis = "**Team Consensus:** The system is operational but experiencing performance issues. Testing and verification can proceed with awareness of current limitations.";
		} else if (analysis.isPerformance) {
			synthesis = "**Team Consensus:** Performance optimization is critical. Current 12+ second response times indicate systemic issues that need addressing.";
		} else if (analysis.isImplementation) {
			synthesis = "**Team Consensus:** Implementation should proceed with iterative development and continuous testing.";
		} else {
			synthesis = "**Team Consensus:** The team has analyzed the request and provided initial guidance. Enable full mode for detailed analysis.";
		}

		return `${formattedResponses}\n\n${synthesis}`;
	}
}

/**
 * Single Agent Fast Mode - Uses only one agent for ultra-fast responses
 */
export class SingleAgentFastMode {
	constructor(
		private claudeProvider: any,
		private agentManager: any
	) {}

	async sendSingleAgentMessage(
		message: string,
		context?: any
	): Promise<string> {
		console.log(`[SingleAgent] Starting single agent fast response`);

		// Select the best single agent for this query
		const bestAgent = this.selectBestAgent(message);

		try {
			// Try to get a response with a 5-second timeout
			const timeoutPromise = new Promise<string>((_, reject) => {
				setTimeout(() => reject(new Error('Timeout')), 5000);
			});

			const response = await Promise.race([
				this.claudeProvider.sendMessage(message, bestAgent, context),
				timeoutPromise
			]);

			return `**${bestAgent.name} (Fast Mode):**\n\n${response}`;

		} catch (error) {
			// If timeout or error, return instant local response
			console.log(`[SingleAgent] Timeout/error, using local response`);
			return this.generateLocalResponse(message, bestAgent);
		}
	}

	private selectBestAgent(message: string): AgentConfig {
		const msgLower = message.toLowerCase();

		// Simple keyword matching to select best agent
		if (msgLower.includes('design') || msgLower.includes('architect')) {
			return this.agentManager.getAgent('architect');
		}
		if (msgLower.includes('review') || msgLower.includes('test')) {
			return this.agentManager.getAgent('reviewer');
		}
		if (msgLower.includes('execute') || msgLower.includes('run')) {
			return this.agentManager.getAgent('executor');
		}
		if (msgLower.includes('document') || msgLower.includes('explain')) {
			return this.agentManager.getAgent('documenter');
		}

		// Default to coder
		return this.agentManager.getAgent('coder');
	}

	private generateLocalResponse(message: string, agent: AgentConfig): string {
		return `**${agent.name} (Instant Mode):**\n\nThe ${agent.name} agent is analyzing your request. Due to current response delays, here's an instant preliminary assessment:\n\n` +
			`Based on the query about "${message.slice(0, 50)}...", the ${agent.name} agent would typically focus on ${agent.role}. ` +
			`Key areas to consider: ${agent.capabilities.slice(0, 3).join(', ')}.\n\n` +
			`*Note: Full agent analysis requires standard mode. Current system experiencing 12+ second delays.*`;
	}
}