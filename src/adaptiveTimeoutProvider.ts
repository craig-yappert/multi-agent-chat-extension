/**
 * Adaptive Timeout Provider
 * Adjusts timeouts based on message complexity
 */
export class AdaptiveTimeoutProvider {

    /**
     * Calculate appropriate timeout based on message characteristics
     */
    static getTimeout(message: string): number {
        const msgLower = message.toLowerCase();
        const wordCount = message.split(/\s+/).length;

        // Base timeout
        let timeout = 10000; // 10 seconds base

        // Simple queries - quick responses expected
        if (this.isSimpleQuery(msgLower)) {
            return 12000; // 12 seconds for simple queries
        }

        // Complex analysis tasks
        if (this.isComplexTask(msgLower)) {
            return 35000; // 35 seconds for complex tasks
        }

        // Code analysis/scanning
        if (this.isCodeAnalysis(msgLower)) {
            return 30000; // 30 seconds for code analysis
        }

        // Scale with message length
        if (wordCount > 50) {
            timeout += (wordCount - 50) * 100; // Add 100ms per word over 50
        }

        // Cap at maximum
        return Math.min(timeout, 40000); // Max 40 seconds
    }

    /**
     * Check if message is a simple query
     */
    private static isSimpleQuery(message: string): boolean {
        const simplePatterns = [
            'can you see',
            'are you there',
            'hello',
            'test',
            'ping',
            'check',
            'verify',
            'confirm',
            'yes or no',
            'true or false'
        ];

        return simplePatterns.some(pattern => message.includes(pattern));
    }

    /**
     * Check if message requests complex analysis
     */
    private static isComplexTask(message: string): boolean {
        const complexPatterns = [
            'analyze',
            'summarize',
            'explain in detail',
            'comprehensive',
            'deep dive',
            'thorough',
            'complete analysis',
            'full review',
            'detailed report'
        ];

        return complexPatterns.some(pattern => message.includes(pattern));
    }

    /**
     * Check if message involves code analysis
     */
    private static isCodeAnalysis(message: string): boolean {
        const codePatterns = [
            'scan the code',
            'analyze the code',
            'review the code',
            'check the implementation',
            'find bugs',
            'security review',
            'performance analysis',
            'code quality',
            'refactor'
        ];

        return codePatterns.some(pattern => message.includes(pattern));
    }

    /**
     * Get timeout for team queries (multiple agents)
     */
    static getTeamTimeout(message: string, agentCount: number): number {
        const baseTimeout = this.getTimeout(message);

        // For sequential processing (current limitation)
        // Each additional agent adds time
        return baseTimeout * agentCount;
    }

    /**
     * Get timeout with buffer for network/processing overhead
     */
    static getTimeoutWithBuffer(message: string, bufferPercent: number = 20): number {
        const timeout = this.getTimeout(message);
        const buffer = timeout * (bufferPercent / 100);
        return Math.round(timeout + buffer);
    }
}