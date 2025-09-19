import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { SettingsManager } from '../settings/SettingsManager';

export interface AgentMemory {
    agentName: string;
    lastUpdated: string;
    conversations: Array<{
        timestamp: string;
        role: string;
        content: string;
    }>;
    summary?: string;
}

export interface ProjectContext {
    projectName: string;
    description?: string;
    lastUpdated: string;
    agentMemory: Record<string, AgentMemory>;
    projectDocs: string[];
    knowledgeBase: Record<string, string>;
    customPrompts: Record<string, string>;
}

export class ProjectContextManager {
    private static instance: ProjectContextManager;
    private settingsManager: SettingsManager;
    private contextPath: string | undefined;
    private projectContext: ProjectContext | undefined;
    private agentConversationContext: Map<string, any[]> = new Map();

    private constructor(
        private context: vscode.ExtensionContext,
        settingsManager: SettingsManager
    ) {
        this.settingsManager = settingsManager;
        this.initialize();
    }

    public static getInstance(
        context: vscode.ExtensionContext,
        settingsManager: SettingsManager
    ): ProjectContextManager {
        if (!ProjectContextManager.instance) {
            ProjectContextManager.instance = new ProjectContextManager(context, settingsManager);
        }
        return ProjectContextManager.instance;
    }

    private async initialize(): Promise<void> {
        const machatPath = this.settingsManager.getMachatPath();
        if (machatPath) {
            this.contextPath = path.join(machatPath, 'context');
            await this.ensureDirectoryExists(this.contextPath);
            await this.loadProjectContext();
        }
    }

    private async ensureDirectoryExists(dirPath: string): Promise<void> {
        try {
            await fs.promises.access(dirPath);
        } catch {
            await fs.promises.mkdir(dirPath, { recursive: true });
        }
    }

    public async loadProjectContext(): Promise<ProjectContext | null> {
        if (!this.contextPath) {
            return null;
        }

        const contextFile = path.join(this.contextPath, 'project-context.json');

        try {
            if (await this.fileExists(contextFile)) {
                const content = await fs.promises.readFile(contextFile, 'utf-8');
                this.projectContext = JSON.parse(content);

                // Load agent memory into the conversation context map
                if (this.projectContext?.agentMemory) {
                    for (const [agentName, memory] of Object.entries(this.projectContext.agentMemory)) {
                        this.agentConversationContext.set(agentName, memory.conversations || []);
                    }
                }
            } else {
                // Create default context
                this.projectContext = {
                    projectName: this.settingsManager.getSettings().projectName || path.basename(this.settingsManager.getProjectRoot() || ''),
                    lastUpdated: new Date().toISOString(),
                    agentMemory: {},
                    projectDocs: [],
                    knowledgeBase: {},
                    customPrompts: {}
                };
                await this.saveProjectContext();
            }

            // Load project documentation if specified
            await this.loadProjectDocumentation();

            // Load custom agent prompts
            await this.loadCustomPrompts();

            return this.projectContext || null;
        } catch (error) {
            console.error('Failed to load project context:', error);
            return null;
        }
    }

    private async loadProjectDocumentation(): Promise<void> {
        if (!this.projectContext || !this.contextPath) return;

        const settings = this.settingsManager.getSettings();
        const includeFiles = settings.context?.includeFiles || [];

        this.projectContext.projectDocs = [];

        for (const file of includeFiles) {
            const fullPath = path.join(this.settingsManager.getProjectRoot() || '', file);
            if (await this.fileExists(fullPath)) {
                try {
                    const content = await fs.promises.readFile(fullPath, 'utf-8');
                    this.projectContext.projectDocs.push(`File: ${file}\n\n${content}`);
                } catch (error) {
                    console.error(`Failed to read project doc ${file}:`, error);
                }
            }
        }

        // Load any markdown files in the context/knowledge-base folder
        const knowledgeBasePath = path.join(this.contextPath, 'knowledge-base');
        if (await this.fileExists(knowledgeBasePath)) {
            try {
                const files = await fs.promises.readdir(knowledgeBasePath);
                for (const file of files) {
                    if (file.endsWith('.md') || file.endsWith('.txt')) {
                        const filePath = path.join(knowledgeBasePath, file);
                        const content = await fs.promises.readFile(filePath, 'utf-8');
                        this.projectContext.knowledgeBase[file] = content;
                    }
                }
            } catch (error) {
                console.error('Failed to load knowledge base:', error);
            }
        }
    }

    private async loadCustomPrompts(): Promise<void> {
        if (!this.projectContext) return;

        const machatPath = this.settingsManager.getMachatPath();
        if (!machatPath) return;

        const promptsPath = path.join(machatPath, 'agents', 'agent-prompts');
        if (await this.fileExists(promptsPath)) {
            try {
                const files = await fs.promises.readdir(promptsPath);
                for (const file of files) {
                    if (file.endsWith('.md') || file.endsWith('.txt')) {
                        const agentName = path.basename(file, path.extname(file));
                        const filePath = path.join(promptsPath, file);
                        const content = await fs.promises.readFile(filePath, 'utf-8');
                        this.projectContext.customPrompts[agentName] = content;
                    }
                }
            } catch (error) {
                console.error('Failed to load custom prompts:', error);
            }
        }
    }

    public async saveProjectContext(): Promise<void> {
        if (!this.contextPath || !this.projectContext) return;

        // Update agent memory from conversation context
        for (const [agentName, conversations] of this.agentConversationContext.entries()) {
            if (!this.projectContext.agentMemory[agentName]) {
                this.projectContext.agentMemory[agentName] = {
                    agentName,
                    lastUpdated: new Date().toISOString(),
                    conversations: []
                };
            }

            // Keep only last 20 messages (10 exchanges) per agent
            this.projectContext.agentMemory[agentName].conversations = conversations.slice(-20);
            this.projectContext.agentMemory[agentName].lastUpdated = new Date().toISOString();
        }

        this.projectContext.lastUpdated = new Date().toISOString();

        const contextFile = path.join(this.contextPath, 'project-context.json');
        await fs.promises.writeFile(
            contextFile,
            JSON.stringify(this.projectContext, null, 2),
            'utf-8'
        );
    }

    public async updateAgentContext(agentName: string, message: any): Promise<void> {
        let agentContext = this.agentConversationContext.get(agentName) || [];
        agentContext.push(message);

        // Keep only last 20 messages (10 exchanges)
        if (agentContext.length > 20) {
            agentContext = agentContext.slice(-20);
        }

        this.agentConversationContext.set(agentName, agentContext);

        // Save periodically (every 5 messages)
        if (agentContext.length % 5 === 0) {
            await this.saveProjectContext();
        }
    }

    public getAgentContext(agentName: string): any[] {
        return this.agentConversationContext.get(agentName) || [];
    }

    public clearAgentContext(agentName: string): void {
        this.agentConversationContext.delete(agentName);
        if (this.projectContext?.agentMemory[agentName]) {
            this.projectContext.agentMemory[agentName].conversations = [];
        }
    }

    public async getContextForAgent(agentName: string): Promise<string> {
        if (!this.projectContext) {
            return '';
        }

        const parts: string[] = [];

        // Add project description
        if (this.projectContext.description) {
            parts.push(`Project: ${this.projectContext.projectName}\n${this.projectContext.description}`);
        }

        // Add custom prompt if exists
        const customPrompt = this.projectContext.customPrompts[agentName];
        if (customPrompt) {
            parts.push(`Custom Instructions:\n${customPrompt}`);
        }

        // Add relevant project documentation
        if (this.projectContext.projectDocs.length > 0) {
            parts.push('Project Documentation:\n' + this.projectContext.projectDocs.join('\n---\n'));
        }

        // Add knowledge base entries
        const knowledgeEntries = Object.entries(this.projectContext.knowledgeBase);
        if (knowledgeEntries.length > 0) {
            const knowledge = knowledgeEntries
                .map(([file, content]) => `Knowledge Base - ${file}:\n${content}`)
                .join('\n---\n');
            parts.push(knowledge);
        }

        // Add recent conversation context
        const agentContext = this.getAgentContext(agentName);
        if (agentContext.length > 0) {
            const recentContext = agentContext
                .slice(-10) // Last 5 exchanges
                .map(msg => `${msg.role}: ${msg.content}`)
                .join('\n');
            parts.push(`Recent Conversation:\n${recentContext}`);
        }

        return parts.filter(p => p).join('\n\n---\n\n');
    }

    private async fileExists(filePath: string): Promise<boolean> {
        try {
            await fs.promises.access(filePath);
            return true;
        } catch {
            return false;
        }
    }

    public async createProjectContextFile(): Promise<void> {
        if (!this.contextPath) return;

        const contextMdPath = path.join(this.contextPath, 'project-context.md');
        if (!await this.fileExists(contextMdPath)) {
            const template = `# Project Context

## Overview
Describe your project here. This information will be available to all agents.

## Architecture
- Describe the main components
- List key technologies used
- Explain the project structure

## Guidelines
- Coding standards
- Naming conventions
- Best practices for this project

## Current Focus
- What are you currently working on?
- What are the immediate priorities?

## Known Issues
- List any known bugs or limitations
- Areas that need improvement
`;
            await fs.promises.writeFile(contextMdPath, template, 'utf-8');
            vscode.window.showInformationMessage('Created project-context.md - Edit this file to provide project information to agents');
        }
    }

    public getAgentConversationContext(): Map<string, any[]> {
        return this.agentConversationContext;
    }

    public async rebuildAgentContextFromHistory(messages: any[]): Promise<void> {
        this.agentConversationContext.clear();

        for (const msg of messages) {
            if (msg.agent && msg.data) {
                const agentName = msg.agent.name || 'unknown';
                let agentContext = this.agentConversationContext.get(agentName) || [];

                if (msg.messageType === 'user') {
                    agentContext.push({
                        role: 'user',
                        content: msg.data.message,
                        timestamp: msg.timestamp
                    });
                } else if (msg.messageType === 'response') {
                    agentContext.push({
                        role: 'assistant',
                        content: msg.data.content,
                        timestamp: msg.timestamp
                    });
                }

                // Keep only last 20 messages per agent
                if (agentContext.length > 20) {
                    agentContext = agentContext.slice(-20);
                }

                this.agentConversationContext.set(agentName, agentContext);
            }
        }

        await this.saveProjectContext();
    }
}