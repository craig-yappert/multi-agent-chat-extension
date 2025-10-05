/**
 * CommandClassifier - Pattern-based command classification with risk assessment
 *
 * Phase 1: Foundation - Detect command categories and assess risk
 */

import { CommandCategory, CommandClassification, ExecutionVector, RiskLevel } from './types';

export class CommandClassifier {
    private patterns: Map<CommandCategory, RegExp[]> = new Map([
        [CommandCategory.NPM, [/^npm\s/, /^npx\s/]],
        [CommandCategory.YARN, [/^yarn\s/]],
        [CommandCategory.PNPM, [/^pnpm\s/]],
        [CommandCategory.DOCKER, [/^docker\s/, /^docker-compose\s/]],
        [CommandCategory.PODMAN, [/^podman\s/]],
        [CommandCategory.PSQL, [/^psql\s/, /^pg_dump\s/, /^pg_restore\s/]],
        [CommandCategory.MYSQL, [/^mysql\s/, /^mysqldump\s/]],
        [CommandCategory.MONGO_SHELL, [/^mongosh\s/, /^mongo\s/]],
        [CommandCategory.REDIS_CLI, [/^redis-cli\s/]],
        [CommandCategory.GIT, [/^git\s/]],
        [CommandCategory.TEST_RUNNER, [
            /^jest\s/, /^mocha\s/, /^pytest\s/, /^vitest\s/,
            /^npm\s+(test|run\s+test)/, /^yarn\s+test/, /^pnpm\s+test/
        ]],
        [CommandCategory.LINTER, [
            /^eslint\s/, /^pylint\s/, /^tslint\s/,
            /^npm\s+run\s+lint/, /^yarn\s+lint/, /^pnpm\s+lint/
        ]],
        [CommandCategory.BUILD_TOOL, [
            /^make\s/, /^cmake\s/, /^gradle\s/, /^maven\s/,
            /^npm\s+(run\s+)?build/, /^yarn\s+build/, /^pnpm\s+build/
        ]],
        [CommandCategory.SYSTEM_COMMAND, [
            /^ls\s/, /^dir\s/, /^cd\s/, /^pwd/, /^mkdir\s/, /^echo\s/,
            /^cat\s/, /^type\s/, /^find\s/, /^grep\s/
        ]]
    ]);

    /**
     * Classify a command to determine its category and risk level
     */
    classify(command: string): CommandClassification {
        const trimmedCommand = command.trim();

        // Check for dangerous commands first
        if (this.isDangerous(trimmedCommand)) {
            return {
                vector: ExecutionVector.SHELL_COMMAND,
                category: CommandCategory.UNKNOWN,
                riskLevel: RiskLevel.CRITICAL,
                command: trimmedCommand
            };
        }

        // Try to match known categories
        for (const [category, patterns] of this.patterns) {
            if (patterns.some(pattern => pattern.test(trimmedCommand))) {
                return {
                    vector: ExecutionVector.SHELL_COMMAND,
                    category: category,
                    riskLevel: this.assessRisk(category, trimmedCommand),
                    command: trimmedCommand
                };
            }
        }

        // Unknown command - treat as high risk
        return {
            vector: ExecutionVector.SHELL_COMMAND,
            category: CommandCategory.UNKNOWN,
            riskLevel: RiskLevel.HIGH,
            command: trimmedCommand
        };
    }

    /**
     * Assess risk level based on command category and content
     */
    private assessRisk(category: CommandCategory, command: string): RiskLevel {
        const lowerCommand = command.toLowerCase();

        switch (category) {
            case CommandCategory.DOCKER:
            case CommandCategory.PODMAN:
                if (command.includes('--privileged')) { return RiskLevel.CRITICAL; }
                if (/docker\s+run/.test(command)) { return RiskLevel.HIGH; }
                if (/docker\s+(ps|logs|images|inspect)/.test(command)) { return RiskLevel.LOW; }
                return RiskLevel.MEDIUM;

            case CommandCategory.PSQL:
            case CommandCategory.MYSQL:
            case CommandCategory.MONGO_SHELL:
                if (/DROP|DELETE|TRUNCATE/i.test(command)) { return RiskLevel.CRITICAL; }
                if (/INSERT|UPDATE/i.test(command)) { return RiskLevel.HIGH; }
                if (/SELECT|SHOW|DESCRIBE/i.test(command)) { return RiskLevel.MEDIUM; }
                return RiskLevel.HIGH;

            case CommandCategory.NPM:
            case CommandCategory.YARN:
            case CommandCategory.PNPM:
                if (/(test|run\s+test|run\s+lint|run\s+build)/.test(lowerCommand)) { return RiskLevel.LOW; }
                if (/(install|add|ci)/.test(lowerCommand)) { return RiskLevel.HIGH; }
                if (/(uninstall|remove)/.test(lowerCommand)) { return RiskLevel.HIGH; }
                return RiskLevel.MEDIUM;

            case CommandCategory.GIT:
                if (/git\s+(status|log|diff|show|branch)/.test(lowerCommand)) { return RiskLevel.LOW; }
                if (/git\s+push.*--force/.test(lowerCommand)) { return RiskLevel.CRITICAL; }
                if (/git\s+(push|pull|fetch)/.test(lowerCommand)) { return RiskLevel.HIGH; }
                if (/git\s+(add|commit|checkout)/.test(lowerCommand)) { return RiskLevel.MEDIUM; }
                if (/git\s+(reset|revert)/.test(lowerCommand)) { return RiskLevel.HIGH; }
                return RiskLevel.MEDIUM;

            case CommandCategory.TEST_RUNNER:
            case CommandCategory.LINTER:
                return RiskLevel.LOW;

            case CommandCategory.BUILD_TOOL:
                if (/clean/.test(lowerCommand)) { return RiskLevel.MEDIUM; }
                return RiskLevel.LOW;

            case CommandCategory.SYSTEM_COMMAND:
                if (/^(ls|dir|pwd|cat|type|echo|find|grep)\s/.test(lowerCommand)) { return RiskLevel.LOW; }
                if (/^(cd|mkdir)\s/.test(lowerCommand)) { return RiskLevel.LOW; }
                return RiskLevel.MEDIUM;

            case CommandCategory.UNKNOWN:
                return RiskLevel.HIGH;

            default:
                return RiskLevel.MEDIUM;
        }
    }

    /**
     * Check for universally dangerous command patterns
     */
    isDangerous(command: string): boolean {
        const dangerousPatterns = [
            /rm\s+-rf\s*\/(?!\w)/,           // rm -rf / (not followed by word char)
            /rm\s+-rf\s+\/$/,                 // rm -rf / at end
            /sudo\s/,                         // Any sudo command
            /del\s+\/[sq]/i,                  // Windows: del /s /q (recursive delete)
            /format\s+[c-z]:/i,               // Windows: format drives
            /dd\s+if=/,                       // dd commands (disk operations)
            />\s*\/dev\/(null|zero|random)/,  // Redirect to system devices
            /:\(\)\s*\{\s*:\|\:&\s*\}\s*;/,   // Fork bomb
            /chmod\s+777/,                    // Dangerous chmod
            /mkfs\./                          // Format filesystem
        ];

        return dangerousPatterns.some(pattern => pattern.test(command));
    }

    /**
     * Get a human-readable description of the risk
     */
    getRiskDescription(classification: CommandClassification): string {
        switch (classification.riskLevel) {
            case RiskLevel.LOW:
                return 'Low risk - Read-only or safe operation';
            case RiskLevel.MEDIUM:
                return 'Medium risk - Modifies files or system state';
            case RiskLevel.HIGH:
                return 'High risk - Significant changes or external operations';
            case RiskLevel.CRITICAL:
                return 'Critical risk - Destructive or irreversible operation';
            default:
                return 'Unknown risk level';
        }
    }
}
