import * as vscode from 'vscode';
import { SettingsManager } from '../settings/SettingsManager';
import { ConversationManager } from '../conversations/ConversationManager';
import { ProjectContextManager } from '../context/ProjectContextManager';

export class MigrationCommands {
    constructor(
        private context: vscode.ExtensionContext,
        private settingsManager: SettingsManager,
        private conversationManager: ConversationManager,
        private contextManager: ProjectContextManager
    ) {}

    public registerCommands(): void {
        // Initialize project settings
        const initProjectCmd = vscode.commands.registerCommand(
            'multiAgentChat.initializeProject',
            () => this.initializeProject()
        );

        // Migrate conversations to project
        const migrateConvCmd = vscode.commands.registerCommand(
            'multiAgentChat.migrateConversations',
            () => this.migrateConversations()
        );

        // Show migration status
        const statusCmd = vscode.commands.registerCommand(
            'multiAgentChat.showMigrationStatus',
            () => this.showMigrationStatus()
        );

        this.context.subscriptions.push(initProjectCmd, migrateConvCmd, statusCmd);
    }

    private async initializeProject(): Promise<void> {
        try {
            const projectRoot = this.settingsManager.getProjectRoot();
            if (!projectRoot) {
                vscode.window.showErrorMessage('No workspace folder found. Please open a folder first.');
                return;
            }

            // Check if already initialized
            const machatPath = this.settingsManager.getMachatPath();
            if (machatPath) {
                const answer = await vscode.window.showQuickPick(['Reinitialize', 'Cancel'], {
                    placeHolder: '.machat folder already exists. Reinitialize?'
                });

                if (answer !== 'Reinitialize') {
                    return;
                }
            }

            // Create .machat structure
            await this.settingsManager.ensureMachatStructure();

            // Create project context file
            await this.contextManager.createProjectContextFile();

            // Offer to migrate conversations
            const migrate = await vscode.window.showQuickPick(['Yes', 'No'], {
                placeHolder: 'Migrate existing conversations to this project?'
            });

            if (migrate === 'Yes') {
                await this.migrateConversations();
            }

            // Show success message with next steps
            const message = `Multi Agent Chat project initialized!

Next steps:
1. Edit .machat/context/project-context.md to describe your project
2. Configure agents in .machat/config.json
3. Add custom agent prompts in .machat/agents/agent-prompts/

The .machat folder has been added to git (except sensitive data).`;

            vscode.window.showInformationMessage(message, 'Open Config', 'Open Context').then(selection => {
                if (selection === 'Open Config') {
                    const configPath = vscode.Uri.file(`${machatPath}/config.json`);
                    vscode.workspace.openTextDocument(configPath).then(doc => {
                        vscode.window.showTextDocument(doc);
                    });
                } else if (selection === 'Open Context') {
                    const contextPath = vscode.Uri.file(`${machatPath}/context/project-context.md`);
                    vscode.workspace.openTextDocument(contextPath).then(doc => {
                        vscode.window.showTextDocument(doc);
                    });
                }
            });

        } catch (error) {
            console.error('Failed to initialize project:', error);
            vscode.window.showErrorMessage(`Failed to initialize project: ${error}`);
        }
    }

    private async migrateConversations(): Promise<void> {
        try {
            await this.conversationManager.migrateGlobalToProject();
        } catch (error) {
            console.error('Migration failed:', error);
            vscode.window.showErrorMessage(`Migration failed: ${error}`);
        }
    }

    private async showMigrationStatus(): Promise<void> {
        const projectRoot = this.settingsManager.getProjectRoot();
        const machatPath = this.settingsManager.getMachatPath();
        const storageLocation = this.conversationManager.getStorageLocation();
        const isProjectStorage = this.conversationManager.isUsingProjectStorage();
        const conversationIndex = this.conversationManager.getConversationIndex();

        const status = `
Multi Agent Chat - Migration Status

Project Root: ${projectRoot || 'No workspace folder'}
.machat Path: ${machatPath || 'Not initialized'}
Storage Mode: ${storageLocation}
Using Project Storage: ${isProjectStorage ? 'Yes' : 'No'}
Total Conversations: ${conversationIndex.length}

Project Conversations: ${conversationIndex.filter(c => c.projectPath === projectRoot).length}
Global Conversations: ${conversationIndex.filter(c => !c.projectPath).length}
`;

        const panel = vscode.window.createWebviewPanel(
            'migrationStatus',
            'Multi Agent Chat - Status',
            vscode.ViewColumn.One,
            {}
        );

        panel.webview.html = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body {
            font-family: var(--vscode-font-family);
            padding: 20px;
            line-height: 1.6;
        }
        pre {
            background-color: var(--vscode-editor-background);
            padding: 15px;
            border-radius: 5px;
            white-space: pre-wrap;
        }
        .actions {
            margin-top: 20px;
        }
        button {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 8px 16px;
            margin-right: 10px;
            cursor: pointer;
            border-radius: 3px;
        }
        button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
    </style>
</head>
<body>
    <h2>Multi Agent Chat - Status</h2>
    <pre>${status}</pre>

    <div class="actions">
        <h3>Quick Actions:</h3>
        ${!machatPath ? '<p>• Run "Initialize Multi Agent Chat Project" to set up .machat folder</p>' : ''}
        ${machatPath && !isProjectStorage ? '<p>• Run "Migrate Conversations to Project" to move conversations</p>' : ''}
        ${machatPath ? '<p>• Edit .machat/config.json to configure project settings</p>' : ''}
        ${machatPath ? '<p>• Edit .machat/context/project-context.md to provide project information</p>' : ''}
    </div>
</body>
</html>
`;
    }
}