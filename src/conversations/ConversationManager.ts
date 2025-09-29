import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { SettingsManager } from '../settings/SettingsManager';

export interface ConversationMessage {
    timestamp: string;
    messageType: string;
    data: any;
    agent?: any;
}

export interface ConversationData {
    sessionId: string;
    startTime: string | undefined;
    endTime: string;
    messageCount: number;
    totalCost: number;
    totalTokens: {
        input: number;
        output: number;
    };
    messages: ConversationMessage[];
    filename: string;
    agentContext?: Record<string, any[]>;
    topic?: string;
}

export interface ConversationIndex {
    filename: string;
    timestamp: string;
    messageCount: number;
    totalCost: number;
    topic?: string;
    sessionId: string;
    projectPath?: string;
}

export class ConversationManager {
    private static instance: ConversationManager;
    private settingsManager: SettingsManager;
    private conversationsPath: string | undefined;
    private globalConversationsPath: string | undefined;
    private conversationIndex: ConversationIndex[] = [];
    private useProjectStorage: boolean = true;

    private constructor(
        private context: vscode.ExtensionContext,
        settingsManager: SettingsManager
    ) {
        this.settingsManager = settingsManager;
        // Initialize is async, must be called explicitly
    }

    public static getInstance(
        context: vscode.ExtensionContext,
        settingsManager: SettingsManager
    ): ConversationManager {
        if (!ConversationManager.instance) {
            ConversationManager.instance = new ConversationManager(context, settingsManager);
        }
        return ConversationManager.instance;
    }

    public async ensureInitialized(): Promise<void> {
        if (this.conversationsPath) {
            return; // Already initialized
        }
        await this.initialize();
    }

    private async initialize(): Promise<void> {
        // Setup global conversations path (fallback)
        const storagePath = this.context.storageUri?.fsPath;
        if (storagePath) {
            this.globalConversationsPath = path.join(storagePath, 'conversations');
            await this.ensureDirectoryExists(this.globalConversationsPath);
        }

        // Setup project conversations path if available
        const machatPath = this.settingsManager.getMachatPath();
        if (machatPath) {
            this.conversationsPath = path.join(machatPath, 'conversations');
            await this.ensureDirectoryExists(this.conversationsPath);
        } else {
            // Fallback to global storage if no project
            this.conversationsPath = this.globalConversationsPath;
            this.useProjectStorage = false;
        }

        // Load conversation index
        await this.loadConversationIndex();
    }

    public async getConversationPath(): Promise<string> {
        if (!this.conversationsPath) {
            await this.initialize();
        }
        return this.conversationsPath || this.globalConversationsPath || '';
    }

    private async ensureDirectoryExists(dirPath: string): Promise<void> {
        try {
            await fs.promises.access(dirPath);
        } catch {
            await fs.promises.mkdir(dirPath, { recursive: true });
        }
    }

    public async saveConversation(conversation: ConversationData): Promise<void> {
        const convPath = await this.getConversationPath();
        if (!convPath) {
            throw new Error('No conversation storage path available');
        }

        const filePath = path.join(convPath, conversation.filename);
        await fs.promises.writeFile(
            filePath,
            JSON.stringify(conversation, null, 2),
            'utf-8'
        );

        // Update index
        await this.updateConversationIndex(conversation);

        console.log(`Saved conversation: ${conversation.filename} to ${convPath}`);
    }

    public async loadConversation(filename: string): Promise<ConversationData | null> {
        // Try project storage first
        if (this.conversationsPath) {
            const projectPath = path.join(this.conversationsPath, filename);
            if (await this.fileExists(projectPath)) {
                const content = await fs.promises.readFile(projectPath, 'utf-8');
                return JSON.parse(content) as ConversationData;
            }
        }

        // Fallback to global storage
        if (this.globalConversationsPath) {
            const globalPath = path.join(this.globalConversationsPath, filename);
            if (await this.fileExists(globalPath)) {
                const content = await fs.promises.readFile(globalPath, 'utf-8');
                return JSON.parse(content) as ConversationData;
            }
        }

        return null;
    }

    public async deleteConversation(filename: string): Promise<void> {
        // Try project storage first
        if (this.conversationsPath) {
            const projectPath = path.join(this.conversationsPath, filename);
            if (await this.fileExists(projectPath)) {
                await fs.promises.unlink(projectPath);
                console.log(`Deleted conversation from project: ${filename}`);
            }
        }

        // Also try global storage
        if (this.globalConversationsPath) {
            const globalPath = path.join(this.globalConversationsPath, filename);
            if (await this.fileExists(globalPath)) {
                await fs.promises.unlink(globalPath);
                console.log(`Deleted conversation from global: ${filename}`);
            }
        }

        // Update index
        this.conversationIndex = this.conversationIndex.filter(c => c.filename !== filename);
        await this.saveConversationIndex();
    }

    public async clearAllConversations(): Promise<void> {
        // Clear project conversations
        if (this.conversationsPath) {
            await this.clearConversationsInPath(this.conversationsPath);
        }

        // Optionally clear global conversations
        const clearGlobal = await vscode.window.showQuickPick(['Project Only', 'All (Project + Global)'], {
            placeHolder: 'Clear conversations from:',
            canPickMany: false
        });

        if (clearGlobal === 'All (Project + Global)' && this.globalConversationsPath) {
            await this.clearConversationsInPath(this.globalConversationsPath);
        }

        // Clear index
        this.conversationIndex = [];
        await this.saveConversationIndex();
    }

    private async clearConversationsInPath(dirPath: string): Promise<void> {
        try {
            const files = await fs.promises.readdir(dirPath);
            for (const file of files) {
                if (file.endsWith('.json') && file !== 'index.json') {
                    await fs.promises.unlink(path.join(dirPath, file));
                }
            }
            console.log(`Cleared conversations in: ${dirPath}`);
        } catch (error) {
            console.error(`Failed to clear conversations in ${dirPath}:`, error);
        }
    }

    private async loadConversationIndex(): Promise<void> {
        // Load project index
        if (this.conversationsPath) {
            const projectIndexPath = path.join(this.conversationsPath, 'index.json');
            if (await this.fileExists(projectIndexPath)) {
                const content = await fs.promises.readFile(projectIndexPath, 'utf-8');
                this.conversationIndex = JSON.parse(content);
                return;
            }
        }

        // Fallback to workspace state for backward compatibility
        this.conversationIndex = this.context.workspaceState.get('claude.conversationIndex', []);
    }

    private async saveConversationIndex(): Promise<void> {
        // Save to project storage
        if (this.conversationsPath) {
            const indexPath = path.join(this.conversationsPath, 'index.json');
            await fs.promises.writeFile(
                indexPath,
                JSON.stringify(this.conversationIndex, null, 2),
                'utf-8'
            );
        }

        // Also update workspace state for backward compatibility
        await this.context.workspaceState.update('claude.conversationIndex', this.conversationIndex);
    }

    private async updateConversationIndex(conversation: ConversationData): Promise<void> {
        // Remove existing entry if it exists
        this.conversationIndex = this.conversationIndex.filter(
            c => c.filename !== conversation.filename
        );

        // Add new entry
        this.conversationIndex.push({
            filename: conversation.filename,
            timestamp: conversation.endTime,
            messageCount: conversation.messageCount,
            totalCost: conversation.totalCost,
            sessionId: conversation.sessionId,
            topic: conversation.topic,
            projectPath: this.useProjectStorage ? this.settingsManager.getProjectRoot() : undefined
        });

        // Keep only last 50 conversations
        if (this.conversationIndex.length > 50) {
            this.conversationIndex = this.conversationIndex.slice(-50);
        }

        await this.saveConversationIndex();
    }

    public getConversationIndex(): ConversationIndex[] {
        return this.conversationIndex;
    }

    private async fileExists(filePath: string): Promise<boolean> {
        try {
            await fs.promises.access(filePath);
            return true;
        } catch {
            return false;
        }
    }

    public async migrateGlobalToProject(): Promise<void> {
        if (!this.globalConversationsPath || !this.conversationsPath) {
            throw new Error('Cannot migrate: paths not available');
        }

        if (this.globalConversationsPath === this.conversationsPath) {
            vscode.window.showInformationMessage('Already using project storage');
            return;
        }

        const answer = await vscode.window.showQuickPick(['Yes', 'No'], {
            placeHolder: 'Migrate existing global conversations to this project?'
        });

        if (answer !== 'Yes') {
            return;
        }

        try {
            const files = await fs.promises.readdir(this.globalConversationsPath);
            let migratedCount = 0;

            for (const file of files) {
                if (file.endsWith('.json') && file !== 'index.json') {
                    const sourcePath = path.join(this.globalConversationsPath, file);
                    const destPath = path.join(this.conversationsPath, file);

                    // Copy file
                    const content = await fs.promises.readFile(sourcePath, 'utf-8');
                    await fs.promises.writeFile(destPath, content, 'utf-8');

                    // Optionally delete original
                    const deleteOriginal = await vscode.window.showQuickPick(['Keep', 'Delete'], {
                        placeHolder: `${file}: Keep original or delete after migration?`
                    });

                    if (deleteOriginal === 'Delete') {
                        await fs.promises.unlink(sourcePath);
                    }

                    migratedCount++;
                }
            }

            vscode.window.showInformationMessage(`Migrated ${migratedCount} conversations to project storage`);

            // Reload index
            await this.loadConversationIndex();
        } catch (error) {
            console.error('Migration failed:', error);
            vscode.window.showErrorMessage('Failed to migrate conversations: ' + error);
        }
    }

    public isUsingProjectStorage(): boolean {
        return this.useProjectStorage;
    }

    public getStorageLocation(): string {
        return this.useProjectStorage ? 'Project (.machat)' : 'Global';
    }
}