import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as util from 'util';
import * as path from 'path';
import { AgentManager } from './agents';
import { ProviderManager } from './providers';
import { AgentCommunicationHub } from './agentCommunication';
import { SettingsManager } from './settings/SettingsManager';
import { ApiKeyManager } from './settings/ApiKeyManager';
import { ConversationManager, ConversationIndex } from './conversations/ConversationManager';
import { ProjectContextManager } from './context/ProjectContextManager';
import { MigrationCommands } from './commands/MigrationCommands';
import { SettingsPanel } from './ui/SettingsPanel';
import { PermissionEnforcer } from './permissions';

const exec = util.promisify(cp.exec);

export async function activate(context: vscode.ExtensionContext) {
	console.log('Multi Agent Chat extension is being activated!');

	// Initialize Settings Manager
	const settingsManager = SettingsManager.getInstance(context);
	await settingsManager.initialize();

	// Initialize API Key Manager and perform migration
	const apiKeyManager = ApiKeyManager.getInstance(context);
	const migrated = await apiKeyManager.migrateFromSettings();
	if (migrated) {
		const skipPrompt = context.globalState.get('multiAgentChat.skipMigrationPrompt', false);
		if (!skipPrompt) {
			await apiKeyManager.promptToClearOldSettings();
		}
	}

	// Initialize Conversation Manager
	const conversationManager = ConversationManager.getInstance(context, settingsManager);
	await conversationManager.ensureInitialized();

	// Initialize Project Context Manager
	const contextManager = ProjectContextManager.getInstance(context, settingsManager);

	// Initialize Migration Commands
	const migrationCommands = new MigrationCommands(context, settingsManager, conversationManager, contextManager);
	migrationCommands.registerCommands();

	const provider = new ClaudeChatProvider(context.extensionUri, context, settingsManager, conversationManager, contextManager);

	const disposable = vscode.commands.registerCommand('multiAgentChat.openChat', (column?: vscode.ViewColumn) => {
		console.log('Multi Agent Chat command executed!');
		// Use ViewColumn.Beside to open next to the current editor
		provider.show(column || vscode.ViewColumn.Beside);
	});

	const loadConversationDisposable = vscode.commands.registerCommand('multiAgentChat.loadConversation', (filename: string) => {
		provider.loadConversation(filename);
	});

	const clearConversationsDisposable = vscode.commands.registerCommand('multiAgentChat.clearAllConversations', async () => {
		const answer = await vscode.window.showWarningMessage(
			'Are you sure you want to delete all conversation history? This cannot be undone.',
			'Yes, Clear All',
			'Cancel'
		);

		if (answer === 'Yes, Clear All') {
			await provider._clearAllConversations();
		}
	});

	// Model Configuration Commands
	const { ConfigurationRegistry } = require('./config/ConfigurationRegistry');

	const openModelsConfigDisposable = vscode.commands.registerCommand('multiAgentChat.openModelsConfig', async () => {
		const registry = ConfigurationRegistry.getInstance(context);
		await registry.openModelsConfig();
	});

	const resetModelsDisposable = vscode.commands.registerCommand('multiAgentChat.resetModelsToDefaults', async () => {
		const answer = await vscode.window.showWarningMessage(
			'Reset project models to defaults? This will overwrite .machat/models.json',
			'Yes, Reset',
			'Cancel'
		);

		if (answer === 'Yes, Reset') {
			const registry = ConfigurationRegistry.getInstance(context);
			await registry.resetProjectModels();
			vscode.window.showInformationMessage('Models reset to defaults. Restart extension to reload.');
		}
	});

	const reloadConfigsDisposable = vscode.commands.registerCommand('multiAgentChat.reloadConfigs', async () => {
		const registry = ConfigurationRegistry.getInstance(context);
		await registry.reloadModels();
		vscode.window.showInformationMessage('Model configurations reloaded from disk.');
	});

	// Agent Configuration Commands
	const openAgentsConfigDisposable = vscode.commands.registerCommand('multiAgentChat.openAgentsConfig', async () => {
		const registry = ConfigurationRegistry.getInstance(context);
		await registry.openAgentsConfig();
	});

	const resetAgentsDisposable = vscode.commands.registerCommand('multiAgentChat.resetAgentsToDefaults', async () => {
		const answer = await vscode.window.showWarningMessage(
			'Reset project agents to defaults? This will overwrite .machat/agents.json',
			'Yes, Reset',
			'Cancel'
		);

		if (answer === 'Yes, Reset') {
			const registry = ConfigurationRegistry.getInstance(context);
			await registry.resetProjectAgents();
			vscode.window.showInformationMessage('Agents reset to defaults. Restart extension to reload.');
		}
	});

	// Combined Update from Defaults Command
	const updateFromDefaultsDisposable = vscode.commands.registerCommand('multiAgentChat.updateFromDefaults', async () => {
		const registry = ConfigurationRegistry.getInstance(context);

		// Check what exists
		const hasModels = registry.hasProjectModels();
		const hasAgents = registry.hasProjectAgents();

		if (!hasModels && !hasAgents) {
			const answer = await vscode.window.showInformationMessage(
				'Initialize models.json and agents.json in .machat/?',
				'Yes',
				'Cancel'
			);

			if (answer === 'Yes') {
				await registry.initializeProjectModels();
				await registry.initializeProjectAgents();
				vscode.window.showInformationMessage('Created models.json and agents.json from defaults.');
			}
		} else {
			// Show options for what to update
			const items = [];
			if (hasModels) {
				items.push({ label: 'Update models.json', description: 'Overwrite with latest defaults', value: 'models' });
			} else {
				items.push({ label: 'Create models.json', description: 'Copy from defaults', value: 'models-init' });
			}
			if (hasAgents) {
				items.push({ label: 'Update agents.json', description: 'Overwrite with latest defaults', value: 'agents' });
			} else {
				items.push({ label: 'Create agents.json', description: 'Copy from defaults', value: 'agents-init' });
			}
			items.push({ label: 'Update Both', description: 'Overwrite all with latest defaults', value: 'both' });

			const selected = await vscode.window.showQuickPick(items, {
				placeHolder: 'Select what to update from defaults'
			});

			if (selected) {
				if (selected.value === 'models' || selected.value === 'both') {
					await registry.resetProjectModels();
				}
				if (selected.value === 'agents' || selected.value === 'both') {
					await registry.resetProjectAgents();
				}
				if (selected.value === 'models-init') {
					await registry.initializeProjectModels();
				}
				if (selected.value === 'agents-init') {
					await registry.initializeProjectAgents();
				}
				vscode.window.showInformationMessage('Updated from defaults. Restart extension to reload.');
			}
		}
	});

	// API Key Management Command
	const manageApiKeysDisposable = vscode.commands.registerCommand('multiAgentChat.manageApiKeys', async () => {
		await apiKeyManager.setupApiKeys();
	});

	// Register webview view provider for sidebar chat (using shared provider instance)
	const webviewProvider = new ClaudeChatWebviewProvider(context.extensionUri, context, provider);
	vscode.window.registerWebviewViewProvider('multiAgentChat.chat', webviewProvider);

	// Create status bar item
	const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
	statusBarItem.text = "Claude";
	statusBarItem.tooltip = "Open Multi Agent Chat (Ctrl+Shift+C)";
	statusBarItem.command = 'multiAgentChat.openChat';
	statusBarItem.show();

	context.subscriptions.push(
		disposable,
		loadConversationDisposable,
		clearConversationsDisposable,
		openModelsConfigDisposable,
		resetModelsDisposable,
		reloadConfigsDisposable,
		openAgentsConfigDisposable,
		resetAgentsDisposable,
		updateFromDefaultsDisposable,
		manageApiKeysDisposable,
		statusBarItem
	);
	console.log('Multi Agent Chat extension activation completed successfully!');
}

export function deactivate() { }

interface ConversationData {
	sessionId: string;
	startTime: string | undefined;
	endTime: string;
	messageCount: number;
	totalCost: number;
	totalTokens: {
		input: number;
		output: number;
	};
	messages: Array<{ timestamp: string, messageType: string, data: any, agent?: any }>;
	filename: string;
	agentContext?: Record<string, any[]>;
	topic?: string;
}

class ClaudeChatWebviewProvider implements vscode.WebviewViewProvider {
	constructor(
		private readonly _extensionUri: vscode.Uri,
		private readonly _context: vscode.ExtensionContext,
		private readonly _chatProvider: ClaudeChatProvider
	) { }

	public resolveWebviewView(
		webviewView: vscode.WebviewView,
		_context: vscode.WebviewViewResolveContext,
		_token: vscode.CancellationToken,
	) {

		webviewView.webview.options = {
			enableScripts: true,
			localResourceRoots: [this._extensionUri]
		};

		// Use the shared chat provider instance for the sidebar
		this._chatProvider.showInWebview(webviewView.webview, webviewView);

		// Handle visibility changes to reinitialize when sidebar reopens
		webviewView.onDidChangeVisibility(() => {
			if (webviewView.visible) {
				// Close main panel when sidebar becomes visible
				if (this._chatProvider._panel) {
					console.log('Closing main panel because sidebar became visible');
					this._chatProvider._panel.dispose();
					this._chatProvider._panel = undefined;
				}
				this._chatProvider.reinitializeWebview();
			}
		});
	}
}


class ClaudeChatProvider {
	public _panel: vscode.WebviewPanel | undefined;
	private _webview: vscode.Webview | undefined;
	private _webviewView: vscode.WebviewView | undefined;
	private _pendingInterAgentMessages: any[] = [];
	private _disposables: vscode.Disposable[] = [];
	private _messageHandlerDisposable: vscode.Disposable | undefined;
	private _totalCost: number = 0;
	private _totalTokensInput: number = 0;
	private _totalTokensOutput: number = 0;
	private _requestCount: number = 0;
	private _currentSessionId: string | undefined;
	private _backupRepoPath: string | undefined;
	private _commits: Array<{ id: string, sha: string, message: string, timestamp: string }> = [];
	private _conversationsPath: string | undefined;
	private _permissionRequestsPath: string | undefined;
	private _permissionWatcher: vscode.FileSystemWatcher | undefined;
	private _pendingPermissionResolvers: Map<string, (approved: boolean) => void> | undefined;
	private _currentConversation: Array<{ timestamp: string, messageType: string, data: any, agent?: any }> = [];
	private _agentConversationContext?: Map<string, any[]>;
	private _conversationStartTime: string | undefined;
	private _conversationTopic: string | undefined;
	private _conversationIndex: ConversationIndex[] = [];
	private _currentClaudeProcess: cp.ChildProcess | undefined;
	private _selectedModel: string = 'default'; // Default model (backwards compatibility)
	private _selectedAgent: string = 'coordinator'; // Default agent (changed from 'team' to avoid expensive fallback)
	private _agentSettings: any = {}; // Agent-specific settings from UI
	private _yoloMode: boolean = false; // YOLO mode for auto-approving permissions
	private _isProcessing: boolean | undefined;
	private _draftMessage: string = '';
	private _agentManager: AgentManager;
	private _permissionEnforcer: PermissionEnforcer;
	private _providerManager: ProviderManager;
	private _communicationHub: AgentCommunicationHub;
	private _outputChannel: vscode.OutputChannel;
	private _settingsPanel: SettingsPanel | undefined;
	private _currentView: 'chat' | 'settings' | 'history' = 'chat';
	private _activeOperations: Set<string> = new Set();
	private _abortControllers: Map<string, AbortController> = new Map();
	private _workflowMode: 'direct' | 'review' | 'brainstorm' | 'auto' = 'auto';

	constructor(
		private readonly _extensionUri: vscode.Uri,
		private readonly _context: vscode.ExtensionContext,
		private readonly _settingsManager: SettingsManager,
		private readonly _conversationManager: ConversationManager,
		private readonly _contextManager: ProjectContextManager
	) {
		this._agentManager = new AgentManager();
		this._outputChannel = vscode.window.createOutputChannel('Multi-Agent Communication');

		// Initialize Permission Enforcer
		this._permissionEnforcer = new PermissionEnforcer({
			checkWorkspaceTrust: true,
			blockDangerousCommands: true,
			logViolations: true
		});

		// Load agents from ConfigurationRegistry (defaults + project overrides)
		this._agentManager.loadFromRegistry(_context).then(() => {
			console.log('[Extension] Agents loaded from registry');

			// Register agent permissions after agents are loaded
			const agents = this._agentManager.getAgents();
			agents.forEach((agent: any) => {
				if (agent.permissions) {
					this._permissionEnforcer.registerAgentPermissions(agent.id, agent.permissions);
					console.log(`[Extension] Registered permissions for ${agent.id}`);
				}
			});

			console.log(`[Extension] Permission enforcement initialized for ${agents.length} agents`);
		}).catch(error => {
			console.error('[Extension] Failed to load agents from registry:', error);
		});

		// Create streaming callback if needed
		const streamCallback = (chunk: string, agentId: string) => {
			// Send streaming chunks to UI if enabled
			const config = vscode.workspace.getConfiguration('multiAgentChat');
			if (config.get<boolean>('performance.enableStreaming', true)) {
				this._postMessage({
					type: 'streamChunk',
					data: chunk,
					agentId: agentId
				});
			}
		};

		// Buffer for messages that arrive before webview is ready
		this._pendingInterAgentMessages = [];

		// Create communication hub first with status callback
		this._communicationHub = new AgentCommunicationHub(
			this._agentManager,
			null as any,  // We'll set the provider manager after creation
			this._outputChannel,
			(status: string, fromAgent?: string, toAgent?: string, messageContent?: string) => {
				console.log(`[Extension statusCallback] Received: ${status}, from: ${fromAgent}, to: ${toAgent}, hasContent: ${!!messageContent}`);
				console.log(`[Extension statusCallback] Current _webview: ${!!this._webview}, Current _panel: ${!!this._panel}`);

				// Try multiple sources for webview reference
				const currentWebview = this._webview || this._panel?.webview;

				// Send inter-agent messages to webview for visibility AND save to conversation log
				if (currentWebview && messageContent) {
					console.log(`[Extension statusCallback] Posting interAgentMessage to webview and saving`);
					// Send as inter-agent message for special display AND save
					this._sendAndSaveMessage({
						type: 'interAgentMessage',
						data: {
							from: fromAgent,
							to: toAgent,
							content: messageContent,
							timestamp: new Date().toISOString()
						}
					});
				} else if (messageContent && !currentWebview) {
					// Buffer the message if webview isn't ready yet
					console.log(`[Extension statusCallback] Buffering message until webview ready`);
					this._pendingInterAgentMessages.push({
						from: fromAgent,
						to: toAgent,
						content: messageContent,
						timestamp: new Date().toISOString()
					});
				} else if (currentWebview) {
					// Regular status update
					this._postMessage({
						type: 'agentStatus',
						data: {
							message: status,
							agents: this._buildAgentStatusList(fromAgent, toAgent)
						}
					});
				}
			}
		);

		// Get ConfigurationRegistry instance for model awareness
		const { ConfigurationRegistry } = require('./config/ConfigurationRegistry');
		const configRegistry = ConfigurationRegistry.getInstance(_context);

		// Now create provider manager with the communication hub already available
		this._providerManager = new ProviderManager(_context, this._agentManager, this._communicationHub, streamCallback, configRegistry);

		// Update the communication hub with the provider manager reference
		(this._communicationHub as any).providerManager = this._providerManager;

		// Initialize backup repository and conversations
		this._initializeBackupRepo();
		this._initializeConversations();

		// Load conversation index from conversation manager (uses .machat folder when available)
		// Ensure ConversationManager is initialized first
		this._conversationManager.ensureInitialized().then(() => {
			this._conversationIndex = this._conversationManager.getConversationIndex();
			console.log('Loaded conversation index:', this._conversationIndex);
		});

		// Load saved model preference
		this._selectedModel = this._context.workspaceState.get('claude.selectedModel', 'default');

		// Resume session from latest conversation
		const latestConversation = this._getLatestConversation();
		this._currentSessionId = latestConversation?.sessionId;

		// If no existing conversation, create a new session ID
		if (!this._currentSessionId) {
			this._currentSessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
			console.log('[Session] Created new session ID in constructor:', this._currentSessionId);
		}
	}

	public show(column: vscode.ViewColumn | vscode.Uri = vscode.ViewColumn.Beside) {
		// Handle case where a URI is passed instead of ViewColumn
		// Use Beside to open next to current editor
		const actualColumn = column instanceof vscode.Uri ? vscode.ViewColumn.Beside : column;

		// Close sidebar if it's open
		this._closeSidebar();

		if (this._panel) {
			// Force reveal in the editor area, not bottom panel
			this._panel.reveal(actualColumn, false);
			return;
		}

		console.log('📱 [PANEL LIFECYCLE] Creating new webview panel');
		this._panel = vscode.window.createWebviewPanel(
			'multiAgentChat',  // Changed ID to avoid conflicts
			'Multi Agent Chat',
			actualColumn,
			{
				enableScripts: true,
				retainContextWhenHidden: true,
				localResourceRoots: [this._extensionUri]
			}
		);

		// Set icon for the webview tab using URI path
		const iconPath = vscode.Uri.joinPath(this._extensionUri, 'icon.png');
		this._panel.iconPath = iconPath;

		this._panel.webview.html = this._getHtmlForWebview();

		this._panel.onDidDispose(() => {
			console.log('📱 [PANEL LIFECYCLE] Panel disposed - webview no longer available');
			this.dispose();
		}, null, this._disposables);

		// Add view state change handler to detect when panel is restored
		this._panel.onDidChangeViewState((e) => {
			// When panel becomes visible again (e.g., after floating), reinitialize
			if (e.webviewPanel.visible && e.webviewPanel.active) {
				this._reinitializeAfterFloat();
			}
		}, null, this._disposables);

		this._setupWebviewMessageHandler(this._panel.webview);
		this._initializePermissions();

		// Resume session from latest conversation
		const latestConversation = this._getLatestConversation();
		this._currentSessionId = latestConversation?.sessionId;

		// If no existing conversation, create a new session ID
		if (!this._currentSessionId) {
			this._currentSessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
			console.log('[Session] Created new session ID:', this._currentSessionId);
		}

		// Load latest conversation history if available
		if (latestConversation) {
			this._loadConversationHistory(latestConversation.filename);
		}

		// Send ready message immediately
		setTimeout(() => {
			// If no conversation to load, send ready immediately
			if (!latestConversation) {
				this._sendReadyMessage();
			}
		}, 100);
	}

	private _postMessage(message: any) {
		const messageType = message.type || 'unknown';
		const messagePreview = message.data ? JSON.stringify(message.data).substring(0, 100) : 'no data';

		if (this._panel && this._panel.webview) {
			console.log(`[_postMessage] Sending ${messageType} to PANEL webview: ${messagePreview}...`);
			this._panel.webview.postMessage(message);
		} else if (this._webview) {
			console.log(`[_postMessage] Sending ${messageType} to SIDEBAR webview: ${messagePreview}...`);
			this._webview.postMessage(message);
		} else {
			console.error(`[_postMessage] NO WEBVIEW AVAILABLE to send ${messageType}!`);
			console.error(`[_postMessage] Message data: ${messagePreview}...`);
		}
	}

	private _sendReadyMessage() {
		// Send current session info if available
		/*if (this._currentSessionId) {
			this._postMessage({
				type: 'sessionResumed',
				data: {
					sessionId: this._currentSessionId
				}
			});
		}*/

		// Send current topic to UI
		this._postMessage({
			type: 'setTopic',
			topic: this._conversationTopic
		});

		this._postMessage({
			type: 'ready',
			data: this._isProcessing ? 'Agents are working...' : 'Ready to chat with Multi Agent Chat! Type your message below.'
		});

		// Send current model to webview
		this._postMessage({
			type: 'modelSelected',
			model: this._selectedModel
		});

		// Send platform information to webview
		this._sendPlatformInfo();

		// Send current settings to webview
		this._sendCurrentSettings();

		// Send saved draft message if any
		if (this._draftMessage) {
			this._postMessage({
				type: 'restoreInputText',
				data: this._draftMessage
			});
		}
	}

	private _handleWebviewMessage(message: any) {
		switch (message.type) {
			case 'sendMessage':
				this._sendMessageToAgent(message.text, message.planMode, message.thinkingMode);
				return;
			case 'newSession':
				this._newSession(message.topic);
				return;
			case 'restoreCommit':
				this._restoreToCommit(message.commitSha);
				return;
			case 'getConversationList':
				console.log('Received getConversationList request');
				this._sendConversationList();
				return;
			case 'loadSettings':
				this._sendSettingsToUI();
				return;
			case 'saveSettings':
				if (this._settingsPanel) {
					this._settingsPanel.saveSettings(message.settings);
				}
				return;
			case 'closeSettings':
				this._currentView = 'chat';
				this._initializeWebview();
				return;
			case 'toggleProjectSettings':
				this._currentView = 'settings';
				this._initializeWebview();
				return;
			case 'getWorkspaceFiles':
				this._sendWorkspaceFiles(message.searchTerm);
				return;
			case 'selectImageFile':
				this._selectImageFile();
				return;
			case 'selectFiles':
				this._selectFiles();
				return;
			case 'filesDropped':
				this._handleDroppedFiles(message.files);
				return;
			case 'floatWindow':
				this._floatWindow();
				return;
			case 'loadConversation':
				this.loadConversation(message.filename);
				return;
			case 'deleteConversation':
				this._deleteConversation(message.filename);
				return;
			case 'stopRequest':
				this._stopClaudeProcess();
				return;
			case 'emergencyStop':
				this._emergencyStopAllAgents();
				return;
			case 'changeWorkflowMode':
				this._setWorkflowMode(message.mode);
				return;
			case 'getSettings':
				this._sendCurrentSettings();
				return;
			case 'updateSettings':
				this._updateSettings(message.settings);
				return;
			case 'getClipboardText':
				this._getClipboardText();
				return;
			case 'selectAgent':
				this._setSelectedAgent(message.agent);
				return;
			case 'selectModel':
				this._setSelectedModel(message.model);
				return;
			case 'openModelTerminal':
				this._openModelTerminal();
				return;
			case 'openFile':
				this._openFileInEditor(message.filePath);
				return;
			case 'createImageFile':
				this._createImageFile(message.imageData, message.imageType);
				return;
			case 'permissionResponse':
				this._handlePermissionResponse(message.id, message.approved, message.alwaysAllow);
				return;
			case 'getPermissions':
				this._sendPermissions();
				return;
			case 'removePermission':
				this._removePermission(message.toolName, message.command);
				return;
			case 'addPermission':
				this._addPermission(message.toolName, message.command);
				return;
			case 'getCustomSnippets':
				this._sendCustomSnippets();
				return;
			case 'saveCustomSnippet':
				this._saveCustomSnippet(message.snippet);
				return;
			case 'deleteCustomSnippet':
				this._deleteCustomSnippet(message.snippetId);
				return;
			case 'enableYoloMode':
				this._enableYoloMode();
				return;
			case 'saveInputText':
				this._saveInputText(message.text);
				return;
			case 'clearAllConversations':
				this._clearAllConversations();
				return;
		}
	}

	private _setupWebviewMessageHandler(webview: vscode.Webview) {
		// Dispose of any existing message handler
		if (this._messageHandlerDisposable) {
			this._messageHandlerDisposable.dispose();
		}

		// Set up new message handler
		this._messageHandlerDisposable = webview.onDidReceiveMessage(
			message => this._handleWebviewMessage(message),
			null,
			this._disposables
		);
	}

	private _closeSidebar() {
		if (this._webviewView) {
			// Switch VS Code to show Explorer view instead of chat sidebar
			vscode.commands.executeCommand('workbench.view.explorer');
		}
	}

	public showInWebview(webview: vscode.Webview, webviewView?: vscode.WebviewView) {
		// Close main panel if it's open
		if (this._panel) {
			console.log('⚠️ [WEBVIEW SWITCH] Closing main panel because sidebar is opening');
			console.log('⚠️ [WEBVIEW SWITCH] Any messages in flight to panel will be lost!');
			this._panel.dispose();
			this._panel = undefined;
		}

		this._webview = webview;
		this._webviewView = webviewView;
		this._webview.html = this._getHtmlForWebview();

		// Flush any pending inter-agent messages now that webview is ready
		if (this._pendingInterAgentMessages.length > 0) {
			console.log(`[Extension] Flushing ${this._pendingInterAgentMessages.length} buffered inter-agent messages and saving`);
			for (const message of this._pendingInterAgentMessages) {
				this._sendAndSaveMessage({
					type: 'interAgentMessage',
					data: message
				});
			}
			this._pendingInterAgentMessages = [];
		}

		// Update the communication hub's status callback now that webview is available
		if (this._communicationHub) {
			console.log('[Extension] Updating communication hub callback with webview');
			this._communicationHub.setStatusCallback(
				(status: string, fromAgent?: string, toAgent?: string, messageContent?: string) => {
					console.log(`[Extension statusCallback] Received: ${status}, from: ${fromAgent}, to: ${toAgent}, hasContent: ${!!messageContent}`);

					// Send inter-agent messages to webview for visibility AND save to conversation log
					if (this._webview && messageContent) {
						console.log(`[Extension statusCallback] Posting interAgentMessage to webview and saving`);
						// Send as inter-agent message for special display AND save
						this._sendAndSaveMessage({
							type: 'interAgentMessage',
							data: {
								from: fromAgent,
								to: toAgent,
								content: messageContent,
								timestamp: new Date().toISOString()
							}
						});
					} else if (this._webview) {
						// Regular status update
						this._postMessage({
							type: 'agentStatus',
							data: {
								agentId: fromAgent || 'system',
								status: status
							}
						});
					}
				}
			);
		}

		this._setupWebviewMessageHandler(this._webview);
		this._initializePermissions();

		// Initialize the webview
		this._initializeWebview();
	}

	private _initializeWebview() {
		// Reload conversation index in case it wasn't loaded yet
		this._conversationIndex = this._conversationManager.getConversationIndex();

		// Send conversation list to webview
		this._sendConversationList();

		// Always load the most recent conversation (simpler and consistent)
		const latestConversation = this._getLatestConversation();

		this._currentSessionId = latestConversation?.sessionId;

		// Load latest conversation history if available
		if (latestConversation) {
			this._loadConversationHistory(latestConversation.filename);
		} else {
			// If no conversation to load, clear topic and send ready
			this._conversationTopic = undefined;
			setTimeout(() => {
				this._sendReadyMessage();
			}, 100);
		}
	}

	public reinitializeWebview() {
		// Only reinitialize if we have a webview (sidebar)
		if (this._webview) {
			this._initializePermissions();
			this._initializeWebview();
			// Set up message handler for the webview
			this._setupWebviewMessageHandler(this._webview);
		}
	}

	private _reinitializeAfterFloat() {

		if (!this._panel) {
			return;
		}

		// Send conversation list
		this._sendConversationList();

		// Get latest conversation
		const latestConversation = this._getLatestConversation();

		// Load the conversation
		if (latestConversation) {
			this._loadConversationHistory(latestConversation.filename);
		} else {
			// Send ready message if no conversation
			this._conversationTopic = undefined;
			this._sendReadyMessage();
		}
	}

	private async _sendMessageToAgent(message: string, planMode?: boolean, thinkingMode?: boolean) {
		// Route to appropriate agent based on selected agent
		const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
		const cwd = workspaceFolder ? workspaceFolder.uri.fsPath : process.cwd();

		// Reset emergency stop flag when user sends a new message
		if (this._communicationHub) {
			this._communicationHub.resetStopFlag();
		}

		// Show original user input in chat
		this._sendAndSaveMessage({
			type: 'userInput',
			data: message
		});

		this._isProcessing = true;

		// Parse @agent mentions in the message
		const agentMentions = this._parseAgentMentions(message);

		// Check for ANY @mention pattern (including invalid ones)
		const anyMentionRegex = /@(\w+)/g;
		const allMentions: string[] = [];
		let match;
		while ((match = anyMentionRegex.exec(message)) !== null) {
			allMentions.push(match[1].toLowerCase());
		}

		// Validate all mentions are known agents
		const validAgents = this._agentManager.getAllAgents().map(a => a.id);
		const invalidMentions = allMentions.filter(m => !validAgents.includes(m));

		// Determine target agent based on workflow mode and validation
		let targetAgent: string;

		if (invalidMentions.length > 0) {
			// Found invalid @mentions - show error and block
			const invalidList = invalidMentions.map(m => `@${m}`).join(', ');
			const availableAgents = validAgents.map(a => `@${a}`).join(', ');

			// Use _sendAndSaveMessage like Emergency stop does
			this._sendAndSaveMessage({
				type: 'system',
				data: `⚠️ Unknown agent(s): ${invalidList}\n\nAvailable agents: ${availableAgents}`
			});

			this._isProcessing = false;
			this._postMessage({
				type: 'setProcessing',
				data: false
			});
			return;
		}

		// Valid mentions or no mentions - use standard routing
		targetAgent = agentMentions.length > 0 ? agentMentions[0] : this._selectedAgent;

		// Override agent selection based on workflow mode
		if (this._workflowMode !== 'auto' && agentMentions.length === 0) {
			// No explicit agent mention, let workflow mode determine routing
			switch(this._workflowMode) {
				case 'direct':
					// Use the currently selected single agent
					break;
				case 'review':
					// Start with coder, will trigger review after
					targetAgent = 'coder';
					break;
				case 'brainstorm':
					// Use team for parallel exploration
					targetAgent = 'team';
					break;
			}
		}

		// Validate agent exists
		const agentConfig = this._agentManager.getAgent(targetAgent);
		if (!agentConfig) {
			// Agent not found - show helpful error message
			const availableAgents = this._agentManager.getAllAgents()
				.map(a => `@${a.id}`)
				.join(', ');

			this._postMessage({
				type: 'agentStatus',
				data: {
					message: `⚠️ Agent '@${targetAgent}' not found. Available agents: ${availableAgents}`,
					agents: []
				}
			});

			this._isProcessing = false;
			this._postMessage({
				type: 'setProcessing',
				data: false
			});
			return;
		}

		const agentName = agentConfig.name;
		const agentIcon = agentConfig.icon;

		// Send initial status message based on workflow mode
		let statusMessage = '';
		switch(this._workflowMode) {
			case 'direct':
				statusMessage = `${agentIcon} ${agentName} is processing your request directly...`;
				break;
			case 'review':
				statusMessage = `Starting review workflow: ${agentIcon} ${agentName} will create solution, then peer review...`;
				break;
			case 'brainstorm':
				statusMessage = `Starting brainstorm: Multiple agents will explore options in parallel...`;
				break;
			case 'auto':
				statusMessage = `User message sent to ${agentName}. ${agentIcon} ${agentName} is processing...`;
				break;
		}

		this._postMessage({
			type: 'agentStatus',
			data: {
				message: statusMessage,
				agents: []  // Don't show agent pills, just the message
			}
		});

		// Set processing state
		this._postMessage({
			type: 'setProcessing',
			data: true
		});

		try {
			// Route to appropriate agent handler
			await this._handleAgentMessage(targetAgent, message, planMode, thinkingMode);
		} catch (error) {
			console.error('Error processing agent message:', error);
			this._sendAndSaveMessage({
				type: 'error',
				data: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
			});
		} finally {
			this._isProcessing = false;
			this._postMessage({
				type: 'setProcessing',
				data: false
			});
		}
	}

	private _parseAgentMentions(message: string): string[] {
		const mentions: string[] = [];
		// Make regex case insensitive for typo tolerance
		const mentionRegex = /@(team|architect|coder|executor|reviewer|documenter|coordinator)\b/gi;
		let match;
		while ((match = mentionRegex.exec(message)) !== null) {
			// Normalize to lowercase for consistent agent lookup
			mentions.push(match[1].toLowerCase());
		}
		return mentions;
	}

	private _buildAgentStatusList(fromAgent?: string, toAgent?: string): any[] {
		const agents: any[] = [];

		// Add from agent if provided
		if (fromAgent) {
			const fromConfig = this._agentManager.getAgent(fromAgent);
			if (fromConfig) {
				agents.push({
					id: fromAgent,
					name: fromConfig.name,
					icon: fromConfig.icon,
					status: 'sending'
				});
			}
		}

		// Add to agent if provided
		if (toAgent) {
			const toConfig = this._agentManager.getAgent(toAgent);
			if (toConfig) {
				agents.push({
					id: toAgent,
					name: toConfig.name,
					icon: toConfig.icon,
					status: 'processing'
				});
			}
		}

		return agents;
	}

	private async _handleAgentMessage(agent: string, message: string, planMode?: boolean, thinkingMode?: boolean) {
		// Get agent configuration
		const agentConfig = this._agentManager.getAgent(agent);
		if (!agentConfig) {
			this._sendAndSaveMessage({
				type: 'agentResponse',
				data: `❌ **Error:** Unknown agent "${agent}". Available agents: team, architect, coder, executor, reviewer, documenter, coordinator`
			});
			return;
		}

		try {
			// Get appropriate provider for this agent
			const provider = await this._providerManager.getProvider(agentConfig);

			// Check if inter-agent communication is enabled
			const config = vscode.workspace.getConfiguration('multiAgentChat');
			const interAgentCommEnabled = config.get<boolean>('interAgentComm.enabled', false);

			// Get conversation history for this agent
			const agentHistory = this._agentConversationContext?.get(agentConfig.id) || [];

			// Send message to provider with inter-agent communication context and history
			const response = await provider.sendMessage(message, agentConfig, {
				planMode,
				thinkingMode,
				workspaceRoot: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,
				useInterAgentComm: interAgentCommEnabled,
				conversationHistory: agentHistory,
				extensionContext: this._context,
				userRequest: message,  // Pass the original user message for context chain
				workflowMode: this._workflowMode,  // Pass workflow mode for provider to adjust behavior
				onPartialResponse: (partialText: string) => {
					// Callback for providers to send partial responses before full completion
					this._sendAndSaveMessage({
						type: 'agentResponse',
						data: partialText,
						agent: {
							id: agentConfig.id,
							name: agentConfig.name,
							icon: agentConfig.icon,
							color: agentConfig.color
						}
					});
				}
			});

			// Parse response for file operations from any agent
			// All agents can potentially create files (e.g., Coder creates code files, Documenter creates docs)
			await this._handleFileOperations(response);

			// Send response back to UI with agent metadata
			this._sendAndSaveMessage({
				type: 'agentResponse',
				data: response,
				agent: {
					id: agentConfig.id,
					name: agentConfig.name,
					icon: agentConfig.icon,
					color: agentConfig.color
				}
			});

			// Store agent response in conversation context for next message
			if (!this._agentConversationContext) {
				this._agentConversationContext = new Map();
			}
			const updatedHistory = this._agentConversationContext.get(agentConfig.id) || [];
			updatedHistory.push({ role: 'user', content: message });
			updatedHistory.push({ role: 'assistant', content: response });
			// Keep last 10 exchanges (20 messages) per agent for context
			if (updatedHistory.length > 20) {
				updatedHistory.splice(0, updatedHistory.length - 20);
			}
			this._agentConversationContext.set(agentConfig.id, updatedHistory);

		} catch (error) {
			console.error(`Error with ${agentConfig.name} provider:`, error);
			this._sendAndSaveMessage({
				type: 'agentResponse',
				data: `${agentConfig.icon} **${agentConfig.name} Error:**\n\nSorry, I encountered an error processing your request: ${error instanceof Error ? error.message : 'Unknown error'}\n\n*Please check your configuration and try again.*`
			});
		}
	}


	private async _sendMessageToClaude(message: string, planMode?: boolean, thinkingMode?: boolean) {
		const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
		const cwd = workspaceFolder ? workspaceFolder.uri.fsPath : process.cwd();

		// Get thinking intensity setting
		const configThink = vscode.workspace.getConfiguration('multiAgentChat');
		const thinkingIntensity = configThink.get<string>('thinking.intensity', 'think');

		// Prepend mode instructions if enabled
		let actualMessage = message;
		if (planMode) {
			actualMessage = 'PLAN FIRST FOR THIS MESSAGE ONLY: Plan first before making any changes. Show me in detail what you will change and wait for my explicit approval in a separate message before proceeding. Do not implement anything until I confirm. This planning requirement applies ONLY to this current message. \n\n' + message;
		}
		if (thinkingMode) {
			let thinkingPrompt = '';
			const thinkingMesssage = ' THROUGH THIS STEP BY STEP: \n'
			switch (thinkingIntensity) {
				case 'think':
					thinkingPrompt = 'THINK';
					break;
				case 'think-hard':
					thinkingPrompt = 'THINK HARD';
					break;
				case 'think-harder':
					thinkingPrompt = 'THINK HARDER';
					break;
				case 'ultrathink':
					thinkingPrompt = 'ULTRATHINK';
					break;
				default:
					thinkingPrompt = 'THINK';
			}
			actualMessage = thinkingPrompt + thinkingMesssage + actualMessage;
		}

		this._isProcessing = true;

		// Clear draft message since we're sending it
		this._draftMessage = '';

		// Show original user input in chat and save to conversation (without mode prefixes)
		this._sendAndSaveMessage({
			type: 'userInput',
			data: message
		});

		// Set processing state to true
		this._postMessage({
			type: 'setProcessing',
			data: { isProcessing: true }
		});

		// Create backup commit before Claude makes changes
		try {
			await this._createBackupCommit(message);
		}
		catch (e) {
			console.log("error", e);
		}

		// Show loading indicator
		this._postMessage({
			type: 'loading',
			data: 'Claude is working...'
		});

		// Build command arguments with session management
		const args = [
			'-p',
			'--output-format', 'stream-json', '--verbose'
		];

		// Get configuration
		const config = vscode.workspace.getConfiguration('multiAgentChat');
		const yoloMode = config.get<boolean>('permissions.yoloMode', false);

		if (yoloMode) {
			// Yolo mode: skip all permissions
			args.push('--dangerously-skip-permissions');
		}

		// Add model selection if not using default
		if (this._selectedModel && this._selectedModel !== 'default') {
			args.push('--model', this._selectedModel);
		}

		// Add session resume if we have a current session
		if (this._currentSessionId) {
			args.push('--resume', this._currentSessionId);
			console.log('Resuming session:', this._currentSessionId);
		} else {
			console.log('Starting new session');
		}

		console.log('Claude command args:', args);
		// Use native claude command
		console.log('Using native Claude command');

		let claudeProcess: cp.ChildProcess;
		claudeProcess = cp.spawn('claude', args, {
			shell: process.platform === 'win32',
			cwd: cwd,
			stdio: ['pipe', 'pipe', 'pipe'],
			env: {
				...process.env,
				FORCE_COLOR: '0',
				NO_COLOR: '1'
			}
		});

		// Store process reference for potential termination
		this._currentClaudeProcess = claudeProcess;

		// Send the message to Claude's stdin (with mode prefixes if enabled)
		if (claudeProcess.stdin) {
			claudeProcess.stdin.write(actualMessage + '\n');
			claudeProcess.stdin.end();
		}

		let rawOutput = '';
		let errorOutput = '';

		if (claudeProcess.stdout) {
			claudeProcess.stdout.on('data', (data) => {
				rawOutput += data.toString();

				// Process JSON stream line by line
				const lines = rawOutput.split('\n');
				rawOutput = lines.pop() || ''; // Keep incomplete line for next chunk

				for (const line of lines) {
					if (line.trim()) {
						try {
							const jsonData = JSON.parse(line.trim());
							this._processJsonStreamData(jsonData);
						} catch (error) {
							console.log('Failed to parse JSON line:', line, error);
						}
					}
				}
			});
		}

		if (claudeProcess.stderr) {
			claudeProcess.stderr.on('data', (data) => {
				errorOutput += data.toString();
			});
		}

		claudeProcess.on('close', (code) => {
			console.log('Claude process closed with code:', code);
			console.log('Claude stderr output:', errorOutput);

			if (!this._currentClaudeProcess) {
				return;
			}

			// Clear process reference
			this._currentClaudeProcess = undefined;

			// Clear loading indicator and set processing to false
			this._postMessage({
				type: 'clearLoading'
			});

			// Reset processing state
			this._isProcessing = false;

			// Clear processing state
			this._postMessage({
				type: 'setProcessing',
				data: { isProcessing: false }
			});

			if (code !== 0 && errorOutput.trim()) {
				// Error with output
				this._sendAndSaveMessage({
					type: 'error',
					data: errorOutput.trim()
				});
			}
		});

		claudeProcess.on('error', (error) => {
			console.log('Claude process error:', error.message);

			if (!this._currentClaudeProcess) {
				return;
			}

			// Clear process reference
			this._currentClaudeProcess = undefined;

			this._postMessage({
				type: 'clearLoading'
			});

			this._isProcessing = false;

			// Clear processing state
			this._postMessage({
				type: 'setProcessing',
				data: { isProcessing: false }
			});

			// Check if claude command is not installed
			if (error.message.includes('ENOENT') || error.message.includes('command not found')) {
				this._sendAndSaveMessage({
					type: 'error',
					data: 'Install claude code first: https://www.anthropic.com/claude-code'
				});
			} else {
				this._sendAndSaveMessage({
					type: 'error',
					data: `Error running Claude: ${error.message}`
				});
			}
		});
	}

	private _processJsonStreamData(jsonData: any) {
		switch (jsonData.type) {
			case 'system':
				if (jsonData.subtype === 'init') {
					// System initialization message - session ID will be captured from final result
					console.log('System initialized');
					this._currentSessionId = jsonData.session_id;
					//this._sendAndSaveMessage({ type: 'init', data: { sessionId: jsonData.session_id; } })

					// Show session info in UI
					this._sendAndSaveMessage({
						type: 'sessionInfo',
						data: {
							sessionId: jsonData.session_id,
							tools: jsonData.tools || [],
							mcpServers: jsonData.mcp_servers || []
						}
					});
				}
				break;

			case 'assistant':
				if (jsonData.message && jsonData.message.content) {
					// Track token usage in real-time if available
					if (jsonData.message.usage) {
						this._totalTokensInput += jsonData.message.usage.input_tokens || 0;
						this._totalTokensOutput += jsonData.message.usage.output_tokens || 0;

						// Send real-time token update to webview
						this._sendAndSaveMessage({
							type: 'updateTokens',
							data: {
								totalTokensInput: this._totalTokensInput,
								totalTokensOutput: this._totalTokensOutput,
								currentInputTokens: jsonData.message.usage.input_tokens || 0,
								currentOutputTokens: jsonData.message.usage.output_tokens || 0,
								cacheCreationTokens: jsonData.message.usage.cache_creation_input_tokens || 0,
								cacheReadTokens: jsonData.message.usage.cache_read_input_tokens || 0
							}
						});
					}

					// Process each content item in the assistant message
					for (const content of jsonData.message.content) {
						if (content.type === 'text' && content.text.trim()) {
							// Show text content and save to conversation
							this._sendAndSaveMessage({
								type: 'output',
								data: content.text.trim()
							});
						} else if (content.type === 'thinking' && content.thinking.trim()) {
							// Show thinking content and save to conversation
							this._sendAndSaveMessage({
								type: 'thinking',
								data: content.thinking.trim()
							});
						} else if (content.type === 'tool_use') {
							// Show tool execution with better formatting
							const toolInfo = `🔧 Executing: ${content.name}`;
							let toolInput = '';

							if (content.input) {
								// Special formatting for TodoWrite to make it more readable
								if (content.name === 'TodoWrite' && content.input.todos) {
									toolInput = '\nTodo List Update:';
									for (const todo of content.input.todos) {
										const status = todo.status === 'completed' ? '✅' :
											todo.status === 'in_progress' ? '🔄' : '⏳';
										toolInput += `\n${status} ${todo.content} (priority: ${todo.priority})`;
									}
								} else {
									// Send raw input to UI for formatting
									toolInput = '';
								}
							}

							// Show tool use and save to conversation
							this._sendAndSaveMessage({
								type: 'toolUse',
								data: {
									toolInfo: toolInfo,
									toolInput: toolInput,
									rawInput: content.input,
									toolName: content.name
								}
							});
						}
					}
				}
				break;

			case 'user':
				if (jsonData.message && jsonData.message.content) {
					// Process tool results from user messages
					for (const content of jsonData.message.content) {
						if (content.type === 'tool_result') {
							let resultContent = content.content || 'Tool executed successfully';

							// Stringify if content is an object or array
							if (typeof resultContent === 'object' && resultContent !== null) {
								resultContent = JSON.stringify(resultContent, null, 2);
							}

							const isError = content.is_error || false;

							// Find the last tool use to get the tool name
							const lastToolUse = this._currentConversation[this._currentConversation.length - 1]

							const toolName = lastToolUse?.data?.toolName;

							// Don't send tool result for Read and Edit tools unless there's an error
							if ((toolName === 'Read' || toolName === 'Edit' || toolName === 'TodoWrite' || toolName === 'MultiEdit') && !isError) {
								// Still send to UI to hide loading state, but mark it as hidden
								this._sendAndSaveMessage({
									type: 'toolResult',
									data: {
										content: resultContent,
										isError: isError,
										toolUseId: content.tool_use_id,
										toolName: toolName,
										hidden: true
									}
								});
							} else {
								// Show tool result and save to conversation
								this._sendAndSaveMessage({
									type: 'toolResult',
									data: {
										content: resultContent,
										isError: isError,
										toolUseId: content.tool_use_id,
										toolName: toolName
									}
								});
							}
						}
					}
				}
				break;

			case 'result':
				if (jsonData.subtype === 'success') {
					// Check for login errors
					if (jsonData.is_error && jsonData.result && jsonData.result.includes('Invalid API key')) {
						this._handleLoginRequired();
						return;
					}

					this._isProcessing = false;

					// Capture session ID from final result
					if (jsonData.session_id) {
						const isNewSession = !this._currentSessionId;
						const sessionChanged = this._currentSessionId && this._currentSessionId !== jsonData.session_id;

						console.log('Session ID found in result:', {
							sessionId: jsonData.session_id,
							isNewSession,
							sessionChanged,
							currentSessionId: this._currentSessionId
						});

						this._currentSessionId = jsonData.session_id;

						// Show session info in UI
						this._sendAndSaveMessage({
							type: 'sessionInfo',
							data: {
								sessionId: jsonData.session_id,
								tools: jsonData.tools || [],
								mcpServers: jsonData.mcp_servers || []
							}
						});
					}

					// Clear processing state
					this._postMessage({
						type: 'setProcessing',
						data: { isProcessing: false }
					});

					// Update cumulative tracking
					this._requestCount++;
					if (jsonData.total_cost_usd) {
						this._totalCost += jsonData.total_cost_usd;
					}

					console.log('Result received:', {
						cost: jsonData.total_cost_usd,
						duration: jsonData.duration_ms,
						turns: jsonData.num_turns
					});

					// Send updated totals to webview
					this._postMessage({
						type: 'updateTotals',
						data: {
							totalCost: this._totalCost,
							totalTokensInput: this._totalTokensInput,
							totalTokensOutput: this._totalTokensOutput,
							requestCount: this._requestCount,
							currentCost: jsonData.total_cost_usd,
							currentDuration: jsonData.duration_ms,
							currentTurns: jsonData.num_turns
						}
					});
				}
				break;
		}
	}


	private async _newSession(topic?: string) {

		this._isProcessing = false

		// Update UI state
		this._postMessage({
			type: 'setProcessing',
			data: { isProcessing: false }
		});

		// Save current conversation to history before starting new session
		if (this._currentConversation.length > 0 && this._currentSessionId) {
			await this._saveCurrentConversation();
			console.log('Saved current conversation to history before starting new session');
		}

		// Try graceful termination first
		if (this._currentClaudeProcess) {
			const processToKill = this._currentClaudeProcess;
			this._currentClaudeProcess = undefined;
			processToKill.kill('SIGTERM');
		}

		// Generate new session ID for the new conversation
		this._currentSessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

		// Clear commits and conversation (start fresh)
		this._commits = [];
		this._currentConversation = [];
		this._conversationStartTime = new Date().toISOString();
		this._conversationTopic = topic || undefined;
		this._agentConversationContext = new Map();

		// Send topic to UI
		this._postMessage({
			type: 'setTopic',
			topic: this._conversationTopic
		});

		// Reset counters
		this._totalCost = 0;
		this._totalTokensInput = 0;
		this._totalTokensOutput = 0;
		this._requestCount = 0;

		// Notify webview to clear all messages and reset session
		this._postMessage({
			type: 'sessionCleared'
		});
	}

	public newSessionOnConfigChange() {
		// Start a new session due to configuration change
		this._newSession();

		// Show notification to user
		vscode.window.showInformationMessage(
			'WSL configuration changed. Started a new Claude session.',
			'OK'
		);

		// Send message to webview about the config change
		this._sendAndSaveMessage({
			type: 'configChanged',
			data: '⚙️ WSL configuration changed. Started a new session.'
		});
	}

	private _handleLoginRequired() {

		this._isProcessing = false;

		// Clear processing state
		this._postMessage({
			type: 'setProcessing',
			data: { isProcessing: false }
		});

		// Show login required message
		this._postMessage({
			type: 'loginRequired'
		});

		// Create terminal for Claude login
		const terminal = vscode.window.createTerminal('Claude Login');
		// Use native claude command
		terminal.sendText('claude');
		terminal.show();

		// Show info message
		vscode.window.showInformationMessage(
			'Please login to Claude in the terminal, then come back to this chat to continue.',
			'OK'
		);

		// Send message to UI about terminal
		this._postMessage({
			type: 'terminalOpened',
			data: `Please login to Claude in the terminal, then come back to this chat to continue.`,
		});
	}

	private async _initializeBackupRepo(): Promise<void> {
		try {
			const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
			if (!workspaceFolder) { return; }

			const storagePath = this._context.storageUri?.fsPath;
			if (!storagePath) {
				console.error('No workspace storage available');
				return;
			}
			console.log('Workspace storage path:', storagePath);
			this._backupRepoPath = path.join(storagePath, 'backups', '.git');

			// Create backup git directory if it doesn't exist
			try {
				await vscode.workspace.fs.stat(vscode.Uri.file(this._backupRepoPath));
			} catch {
				await vscode.workspace.fs.createDirectory(vscode.Uri.file(this._backupRepoPath));

				const workspacePath = workspaceFolder.uri.fsPath;

				// Initialize git repo with workspace as work-tree
				await exec(`git --git-dir="${this._backupRepoPath}" --work-tree="${workspacePath}" init`);
				await exec(`git --git-dir="${this._backupRepoPath}" config user.name "Multi Agent Chat"`);
				await exec(`git --git-dir="${this._backupRepoPath}" config user.email "claude@anthropic.com"`);

				console.log(`Initialized backup repository at: ${this._backupRepoPath}`);
			}
		} catch (error: any) {
			console.error('Failed to initialize backup repository:', error.message);
		}
	}

	private async _createBackupCommit(userMessage: string): Promise<void> {
		try {
			const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
			if (!workspaceFolder || !this._backupRepoPath) { return; }

			const workspacePath = workspaceFolder.uri.fsPath;
			const now = new Date();
			const timestamp = now.toISOString().replace(/[:.]/g, '-');
			const displayTimestamp = now.toISOString();
			const commitMessage = `Before: ${userMessage.substring(0, 50)}${userMessage.length > 50 ? '...' : ''}`;

			// Add all files using git-dir and work-tree (excludes .git automatically)
			await exec(`git --git-dir="${this._backupRepoPath}" --work-tree="${workspacePath}" add -A`);

			// Check if this is the first commit (no HEAD exists yet)
			let isFirstCommit = false;
			try {
				await exec(`git --git-dir="${this._backupRepoPath}" rev-parse HEAD`);
			} catch {
				isFirstCommit = true;
			}

			// Check if there are changes to commit
			const { stdout: status } = await exec(`git --git-dir="${this._backupRepoPath}" --work-tree="${workspacePath}" status --porcelain`);

			// Always create a checkpoint, even if no files changed
			let actualMessage;
			if (isFirstCommit) {
				actualMessage = `Initial backup: ${userMessage.substring(0, 50)}${userMessage.length > 50 ? '...' : ''}`;
			} else if (status.trim()) {
				actualMessage = commitMessage;
			} else {
				actualMessage = `Checkpoint (no changes): ${userMessage.substring(0, 50)}${userMessage.length > 50 ? '...' : ''}`;
			}

			// Create commit with --allow-empty to ensure checkpoint is always created
			await exec(`git --git-dir="${this._backupRepoPath}" --work-tree="${workspacePath}" commit --allow-empty -m "${actualMessage}"`);
			const { stdout: sha } = await exec(`git --git-dir="${this._backupRepoPath}" rev-parse HEAD`);

			// Store commit info
			const commitInfo = {
				id: `commit-${timestamp}`,
				sha: sha.trim(),
				message: actualMessage,
				timestamp: displayTimestamp
			};

			this._commits.push(commitInfo);

			// Show restore option in UI and save to conversation
			this._sendAndSaveMessage({
				type: 'showRestoreOption',
				data: commitInfo
			});

			console.log(`Created backup commit: ${commitInfo.sha.substring(0, 8)} - ${actualMessage}`);
		} catch (error: any) {
			console.error('Failed to create backup commit:', error.message);
		}
	}


	private async _restoreToCommit(commitSha: string): Promise<void> {
		try {
			const commit = this._commits.find(c => c.sha === commitSha);
			if (!commit) {
				this._postMessage({
					type: 'restoreError',
					data: 'Commit not found'
				});
				return;
			}

			const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
			if (!workspaceFolder || !this._backupRepoPath) {
				vscode.window.showErrorMessage('No workspace folder or backup repository available.');
				return;
			}

			const workspacePath = workspaceFolder.uri.fsPath;

			this._postMessage({
				type: 'restoreProgress',
				data: 'Restoring files from backup...'
			});

			// Restore files directly to workspace using git checkout
			await exec(`git --git-dir="${this._backupRepoPath}" --work-tree="${workspacePath}" checkout ${commitSha} -- .`);

			vscode.window.showInformationMessage(`Restored to commit: ${commit.message}`);

			this._sendAndSaveMessage({
				type: 'restoreSuccess',
				data: {
					message: `Successfully restored to: ${commit.message}`,
					commitSha: commitSha
				}
			});

		} catch (error: any) {
			console.error('Failed to restore commit:', error.message);
			vscode.window.showErrorMessage(`Failed to restore commit: ${error.message}`);
			this._postMessage({
				type: 'restoreError',
				data: `Failed to restore: ${error.message}`
			});
		}
	}

	private async _initializeConversations(): Promise<void> {
		try {
			// Get conversation path from conversation manager
			this._conversationsPath = await this._conversationManager.getConversationPath();

			// Check if project has .machat structure, offer to initialize if not
			const projectRoot = this._settingsManager.getProjectRoot();
			const machatPath = this._settingsManager.getMachatPath();

			if (projectRoot && !machatPath) {
				// Project exists but no .machat folder - offer to initialize
				const choice = await vscode.window.showInformationMessage(
					'Initialize Multi Agent Chat for this project? This will create .machat/ with models.json, agents.json, and project context.',
					'Yes', 'Later'
				);

				if (choice === 'Yes') {
					await this._settingsManager.ensureMachatStructure();

					// Initialize models and agents configuration
					const { ConfigurationRegistry } = require('./config/ConfigurationRegistry');
					const configRegistry = ConfigurationRegistry.getInstance(this._context);
					await configRegistry.initializeProjectModels();
					await configRegistry.initializeProjectAgents();

					await this._contextManager.createProjectContextFile();

					vscode.window.showInformationMessage(
						'Multi Agent Chat initialized! Created models.json, agents.json, and project context.',
						'Open Models',
						'Open Agents'
					).then(selection => {
						const newMachatPath = this._settingsManager.getMachatPath();
						if (selection === 'Open Models' && newMachatPath) {
							const modelsPath = vscode.Uri.file(`${newMachatPath}/models.json`);
							vscode.workspace.openTextDocument(modelsPath).then(doc => {
								vscode.window.showTextDocument(doc);
							});
						} else if (selection === 'Open Agents' && newMachatPath) {
							const agentsPath = vscode.Uri.file(`${newMachatPath}/agents.json`);
							vscode.workspace.openTextDocument(agentsPath).then(doc => {
								vscode.window.showTextDocument(doc);
							});
						}
					});
				}
			}

			console.log(`Using conversations directory: ${this._conversationsPath}`);
		} catch (error: any) {
			console.error('Failed to initialize conversations:', error.message);
		}
	}

	private async _initializePermissions(): Promise<void> {
		try {

			if (this._permissionWatcher) {
				this._permissionWatcher.dispose();
				this._permissionWatcher = undefined;
			}

			const storagePath = this._context.storageUri?.fsPath;
			if (!storagePath) { return; }

			// Create permission requests directory
			this._permissionRequestsPath = path.join(path.join(storagePath, 'permission-requests'));
			try {
				await vscode.workspace.fs.stat(vscode.Uri.file(this._permissionRequestsPath));
			} catch {
				await vscode.workspace.fs.createDirectory(vscode.Uri.file(this._permissionRequestsPath));
				console.log(`Created permission requests directory at: ${this._permissionRequestsPath}`);
			}

			// console.log("DIRECTORY-----", this._permissionRequestsPath);

			// Set up file watcher for *.request files
			this._permissionWatcher = vscode.workspace.createFileSystemWatcher(
				new vscode.RelativePattern(this._permissionRequestsPath, '*.request')
			);

			this._permissionWatcher.onDidCreate(async (uri) => {
				// Only handle file scheme URIs, ignore vscode-userdata scheme
				if (uri.scheme === 'file') {
					await this._handlePermissionRequest(uri);
				}
			});

			this._disposables.push(this._permissionWatcher);

		} catch (error: any) {
			console.error('Failed to initialize permissions:', error.message);
		}
	}

	private async _handlePermissionRequest(requestUri: vscode.Uri): Promise<void> {
		try {
			// Read the request file
			const content = await vscode.workspace.fs.readFile(requestUri);
			const request = JSON.parse(new TextDecoder().decode(content));

			// Show permission dialog
			const approved = await this._showPermissionDialog(request);

			// Write response file
			const responseFile = requestUri.fsPath.replace('.request', '.response');
			const response = {
				id: request.id,
				approved: approved,
				timestamp: new Date().toISOString()
			};

			const responseContent = new TextEncoder().encode(JSON.stringify(response));
			await vscode.workspace.fs.writeFile(vscode.Uri.file(responseFile), responseContent);

			// Clean up request file
			await vscode.workspace.fs.delete(requestUri);

		} catch (error: any) {
			console.error('Failed to handle permission request:', error.message);
		}
	}

	private async _showPermissionDialog(request: any): Promise<boolean> {
		const toolName = request.tool || 'Unknown Tool';

		// Generate pattern for Bash commands
		let pattern = undefined;
		if (toolName === 'Bash' && request.input?.command) {
			pattern = this.getCommandPattern(request.input.command);
		}

		// Send permission request to the UI
		this._sendAndSaveMessage({
			type: 'permissionRequest',
			data: {
				id: request.id,
				tool: toolName,
				input: request.input,
				pattern: pattern
			}
		});

		// Wait for response from UI
		return new Promise((resolve) => {
			// Store the resolver so we can call it when we get the response
			this._pendingPermissionResolvers = this._pendingPermissionResolvers || new Map();
			this._pendingPermissionResolvers.set(request.id, resolve);
		});
	}

	private _handlePermissionResponse(id: string, approved: boolean, alwaysAllow?: boolean): void {
		if (this._pendingPermissionResolvers && this._pendingPermissionResolvers.has(id)) {
			const resolver = this._pendingPermissionResolvers.get(id);
			if (resolver) {
				resolver(approved);
				this._pendingPermissionResolvers.delete(id);

				// Handle always allow setting
				if (alwaysAllow && approved) {
					void this._saveAlwaysAllowPermission(id);
				}
			}
		}
	}

	private async _saveAlwaysAllowPermission(requestId: string): Promise<void> {
		try {
			// Read the original request to get tool name and input
			const storagePath = this._context.storageUri?.fsPath;
			if (!storagePath) return;

			const requestFileUri = vscode.Uri.file(path.join(storagePath, 'permission-requests', `${requestId}.request`));

			let requestContent: Uint8Array;
			try {
				requestContent = await vscode.workspace.fs.readFile(requestFileUri);
			} catch {
				return; // Request file doesn't exist
			}

			const request = JSON.parse(new TextDecoder().decode(requestContent));

			// Load existing workspace permissions
			const permissionsUri = vscode.Uri.file(path.join(storagePath, 'permission-requests', 'permissions.json'));
			let permissions: any = { alwaysAllow: {} };

			try {
				const content = await vscode.workspace.fs.readFile(permissionsUri);
				permissions = JSON.parse(new TextDecoder().decode(content));
			} catch {
				// File doesn't exist yet, use default permissions
			}

			// Add the new permission
			const toolName = request.tool;
			if (toolName === 'Bash' && request.input?.command) {
				// For Bash, store the command pattern
				if (!permissions.alwaysAllow[toolName]) {
					permissions.alwaysAllow[toolName] = [];
				}
				if (Array.isArray(permissions.alwaysAllow[toolName])) {
					const command = request.input.command.trim();
					const pattern = this.getCommandPattern(command);
					if (!permissions.alwaysAllow[toolName].includes(pattern)) {
						permissions.alwaysAllow[toolName].push(pattern);
					}
				}
			} else {
				// For other tools, allow all instances
				permissions.alwaysAllow[toolName] = true;
			}

			// Ensure permissions directory exists
			const permissionsDir = vscode.Uri.file(path.dirname(permissionsUri.fsPath));
			try {
				await vscode.workspace.fs.stat(permissionsDir);
			} catch {
				await vscode.workspace.fs.createDirectory(permissionsDir);
			}

			// Save the permissions
			const permissionsContent = new TextEncoder().encode(JSON.stringify(permissions, null, 2));
			await vscode.workspace.fs.writeFile(permissionsUri, permissionsContent);

			console.log(`Saved always-allow permission for ${toolName}`);
		} catch (error) {
			console.error('Error saving always-allow permission:', error);
		}
	}

	private getCommandPattern(command: string): string {
		const parts = command.trim().split(/\s+/);
		if (parts.length === 0) return command;

		const baseCmd = parts[0];
		const subCmd = parts.length > 1 ? parts[1] : '';

		// Common patterns that should use wildcards
		const patterns = [
			// Package managers
			['npm', 'install', 'npm install *'],
			['npm', 'i', 'npm i *'],
			['npm', 'add', 'npm add *'],
			['npm', 'remove', 'npm remove *'],
			['npm', 'uninstall', 'npm uninstall *'],
			['npm', 'update', 'npm update *'],
			['npm', 'run', 'npm run *'],
			['yarn', 'add', 'yarn add *'],
			['yarn', 'remove', 'yarn remove *'],
			['yarn', 'install', 'yarn install *'],
			['pnpm', 'install', 'pnpm install *'],
			['pnpm', 'add', 'pnpm add *'],
			['pnpm', 'remove', 'pnpm remove *'],

			// Git commands
			['git', 'add', 'git add *'],
			['git', 'commit', 'git commit *'],
			['git', 'push', 'git push *'],
			['git', 'pull', 'git pull *'],
			['git', 'checkout', 'git checkout *'],
			['git', 'branch', 'git branch *'],
			['git', 'merge', 'git merge *'],
			['git', 'clone', 'git clone *'],
			['git', 'reset', 'git reset *'],
			['git', 'rebase', 'git rebase *'],
			['git', 'tag', 'git tag *'],

			// Docker commands
			['docker', 'run', 'docker run *'],
			['docker', 'build', 'docker build *'],
			['docker', 'exec', 'docker exec *'],
			['docker', 'logs', 'docker logs *'],
			['docker', 'stop', 'docker stop *'],
			['docker', 'start', 'docker start *'],
			['docker', 'rm', 'docker rm *'],
			['docker', 'rmi', 'docker rmi *'],
			['docker', 'pull', 'docker pull *'],
			['docker', 'push', 'docker push *'],

			// Build tools
			['make', '', 'make *'],
			['cargo', 'build', 'cargo build *'],
			['cargo', 'run', 'cargo run *'],
			['cargo', 'test', 'cargo test *'],
			['cargo', 'install', 'cargo install *'],
			['mvn', 'compile', 'mvn compile *'],
			['mvn', 'test', 'mvn test *'],
			['mvn', 'package', 'mvn package *'],
			['gradle', 'build', 'gradle build *'],
			['gradle', 'test', 'gradle test *'],

			// System commands
			['curl', '', 'curl *'],
			['wget', '', 'wget *'],
			['ssh', '', 'ssh *'],
			['scp', '', 'scp *'],
			['rsync', '', 'rsync *'],
			['tar', '', 'tar *'],
			['zip', '', 'zip *'],
			['unzip', '', 'unzip *'],

			// Development tools
			['node', '', 'node *'],
			['python', '', 'python *'],
			['python3', '', 'python3 *'],
			['pip', 'install', 'pip install *'],
			['pip3', 'install', 'pip3 install *'],
			['composer', 'install', 'composer install *'],
			['composer', 'require', 'composer require *'],
			['bundle', 'install', 'bundle install *'],
			['gem', 'install', 'gem install *'],
		];

		// Find matching pattern
		for (const [cmd, sub, pattern] of patterns) {
			if (baseCmd === cmd && (sub === '' || subCmd === sub)) {
				return pattern;
			}
		}

		// Default: return exact command
		return command;
	}

	private async _sendPermissions(): Promise<void> {
		try {
			const storagePath = this._context.storageUri?.fsPath;
			if (!storagePath) {
				this._postMessage({
					type: 'permissionsData',
					data: { alwaysAllow: {} }
				});
				return;
			}

			const permissionsUri = vscode.Uri.file(path.join(storagePath, 'permission-requests', 'permissions.json'));
			let permissions: any = { alwaysAllow: {} };

			try {
				const content = await vscode.workspace.fs.readFile(permissionsUri);
				permissions = JSON.parse(new TextDecoder().decode(content));
			} catch {
				// File doesn't exist or can't be read, use default permissions
			}

			this._postMessage({
				type: 'permissionsData',
				data: permissions
			});
		} catch (error) {
			console.error('Error sending permissions:', error);
			this._postMessage({
				type: 'permissionsData',
				data: { alwaysAllow: {} }
			});
		}
	}

	private async _removePermission(toolName: string, command: string | null): Promise<void> {
		try {
			const storagePath = this._context.storageUri?.fsPath;
			if (!storagePath) return;

			const permissionsUri = vscode.Uri.file(path.join(storagePath, 'permission-requests', 'permissions.json'));
			let permissions: any = { alwaysAllow: {} };

			try {
				const content = await vscode.workspace.fs.readFile(permissionsUri);
				permissions = JSON.parse(new TextDecoder().decode(content));
			} catch {
				// File doesn't exist or can't be read, nothing to remove
				return;
			}

			// Remove the permission
			if (command === null) {
				// Remove entire tool permission
				delete permissions.alwaysAllow[toolName];
			} else {
				// Remove specific command from tool permissions
				if (Array.isArray(permissions.alwaysAllow[toolName])) {
					permissions.alwaysAllow[toolName] = permissions.alwaysAllow[toolName].filter(
						(cmd: string) => cmd !== command
					);
					// If no commands left, remove the tool entirely
					if (permissions.alwaysAllow[toolName].length === 0) {
						delete permissions.alwaysAllow[toolName];
					}
				}
			}

			// Save updated permissions
			const permissionsContent = new TextEncoder().encode(JSON.stringify(permissions, null, 2));
			await vscode.workspace.fs.writeFile(permissionsUri, permissionsContent);

			// Send updated permissions to UI
			this._sendPermissions();

			console.log(`Removed permission for ${toolName}${command ? ` command: ${command}` : ''}`);
		} catch (error) {
			console.error('Error removing permission:', error);
		}
	}

	private async _addPermission(toolName: string, command: string | null): Promise<void> {
		try {
			const storagePath = this._context.storageUri?.fsPath;
			if (!storagePath) return;

			const permissionsUri = vscode.Uri.file(path.join(storagePath, 'permission-requests', 'permissions.json'));
			let permissions: any = { alwaysAllow: {} };

			try {
				const content = await vscode.workspace.fs.readFile(permissionsUri);
				permissions = JSON.parse(new TextDecoder().decode(content));
			} catch {
				// File doesn't exist, use default permissions
			}

			// Add the new permission
			if (command === null || command === '') {
				// Allow all commands for this tool
				permissions.alwaysAllow[toolName] = true;
			} else {
				// Add specific command pattern
				if (!permissions.alwaysAllow[toolName]) {
					permissions.alwaysAllow[toolName] = [];
				}

				// Convert to array if it's currently set to true
				if (permissions.alwaysAllow[toolName] === true) {
					permissions.alwaysAllow[toolName] = [];
				}

				if (Array.isArray(permissions.alwaysAllow[toolName])) {
					// For Bash commands, convert to pattern using existing logic
					let commandToAdd = command;
					if (toolName === 'Bash') {
						commandToAdd = this.getCommandPattern(command);
					}

					// Add if not already present
					if (!permissions.alwaysAllow[toolName].includes(commandToAdd)) {
						permissions.alwaysAllow[toolName].push(commandToAdd);
					}
				}
			}

			// Ensure permissions directory exists
			const permissionsDir = vscode.Uri.file(path.dirname(permissionsUri.fsPath));
			try {
				await vscode.workspace.fs.stat(permissionsDir);
			} catch {
				await vscode.workspace.fs.createDirectory(permissionsDir);
			}

			// Save updated permissions
			const permissionsContent = new TextEncoder().encode(JSON.stringify(permissions, null, 2));
			await vscode.workspace.fs.writeFile(permissionsUri, permissionsContent);

			// Send updated permissions to UI
			this._sendPermissions();

			console.log(`Added permission for ${toolName}${command ? ` command: ${command}` : ' (all commands)'}`);
		} catch (error) {
			console.error('Error adding permission:', error);
		}
	}


	private async _sendCustomSnippets(): Promise<void> {
		try {
			const customSnippets = this._context.globalState.get<{ [key: string]: any }>('customPromptSnippets', {});
			this._postMessage({
				type: 'customSnippetsData',
				data: customSnippets
			});
		} catch (error) {
			console.error('Error loading custom snippets:', error);
			this._postMessage({
				type: 'customSnippetsData',
				data: {}
			});
		}
	}

	private async _saveCustomSnippet(snippet: any): Promise<void> {
		try {
			const customSnippets = this._context.globalState.get<{ [key: string]: any }>('customPromptSnippets', {});
			customSnippets[snippet.id] = snippet;

			await this._context.globalState.update('customPromptSnippets', customSnippets);

			this._postMessage({
				type: 'customSnippetSaved',
				data: { snippet }
			});

			console.log('Saved custom snippet:', snippet.name);
		} catch (error) {
			console.error('Error saving custom snippet:', error);
			this._postMessage({
				type: 'error',
				data: 'Failed to save custom snippet'
			});
		}
	}

	private async _deleteCustomSnippet(snippetId: string): Promise<void> {
		try {
			const customSnippets = this._context.globalState.get<{ [key: string]: any }>('customPromptSnippets', {});

			if (customSnippets[snippetId]) {
				delete customSnippets[snippetId];
				await this._context.globalState.update('customPromptSnippets', customSnippets);

				this._postMessage({
					type: 'customSnippetDeleted',
					data: { snippetId }
				});

				console.log('Deleted custom snippet:', snippetId);
			} else {
				this._postMessage({
					type: 'error',
					data: 'Snippet not found'
				});
			}
		} catch (error) {
			console.error('Error deleting custom snippet:', error);
			this._postMessage({
				type: 'error',
				data: 'Failed to delete custom snippet'
			});
		}
	}

	// WSL support removed - no longer needed


	private _sendAndSaveMessage(message: { type: string, data: any, agent?: any }): void {
		// Initialize conversation if this is the first message
		if (this._currentConversation.length === 0) {
			this._conversationStartTime = new Date().toISOString();
		}

		// Send to UI using the helper method
		this._postMessage(message);

		// Save to conversation with agent metadata if present
		const conversationEntry: any = {
			timestamp: new Date().toISOString(),
			messageType: message.type,
			data: message.data
		};

		// Include agent metadata if present
		if (message.agent) {
			conversationEntry.agent = message.agent;
		}

		this._currentConversation.push(conversationEntry);

		// Persist conversation
		void this._saveCurrentConversation();
	}

	private async _saveCurrentConversation(): Promise<void> {
		console.log('[ConversationSave] Starting save process...');
		console.log('[ConversationSave] Current conversation length:', this._currentConversation.length);
		console.log('[ConversationSave] Current session ID:', this._currentSessionId);

		if (this._currentConversation.length === 0) {
			console.log('[ConversationSave] Skipping: No messages in conversation');
			return;
		}
		if (!this._currentSessionId) {
			console.log('[ConversationSave] Skipping: No session ID');
			return;
		}

		try {
			// Create filename from first user message and timestamp
			const firstUserMessage = this._currentConversation.find(m => m.messageType === 'userInput');
			const firstMessage = firstUserMessage ? firstUserMessage.data : 'conversation';
			const startTime = this._conversationStartTime || new Date().toISOString();
			const sessionId = this._currentSessionId || 'unknown';

			// Clean and truncate first message for filename
			const cleanMessage = firstMessage
				.replace(/[^a-zA-Z0-9\s]/g, '') // Remove special chars
				.replace(/\s+/g, '-') // Replace spaces with dashes
				.substring(0, 50) // Limit length
				.toLowerCase();

			const datePrefix = startTime.substring(0, 16).replace('T', '_').replace(/:/g, '-');
			const filename = `${datePrefix}_${cleanMessage}.json`;

			const conversationData: ConversationData = {
				sessionId: sessionId,
				startTime: this._conversationStartTime,
				endTime: new Date().toISOString(),
				messageCount: this._currentConversation.length,
				totalCost: this._totalCost,
				totalTokens: {
					input: this._totalTokensInput,
					output: this._totalTokensOutput
				},
				messages: this._currentConversation,
				filename,
				agentContext: this._agentConversationContext ? Object.fromEntries(this._agentConversationContext) : undefined,
				topic: this._conversationTopic
			};

			// Save using conversation manager
			await this._conversationManager.saveConversation(conversationData);

			// Save project context
			await this._contextManager.saveProjectContext();

			// Update conversation index (now handled by conversation manager)
			this._conversationIndex = this._conversationManager.getConversationIndex();

			console.log(`Saved conversation: ${filename}`);
		} catch (error: any) {
			console.error('Failed to save conversation:', error.message);
		}
	}


	public async loadConversation(filename: string): Promise<void> {
		// Load the conversation history
		await this._loadConversationHistory(filename);
	}

	private async _deleteConversation(filename: string): Promise<void> {
		try {
			// Delete conversation using conversation manager (handles both .machat and global storage)
			await this._conversationManager.deleteConversation(filename);

			// Update local index from conversation manager
			this._conversationIndex = this._conversationManager.getConversationIndex();

			// Send updated list to webview
			this._sendConversationList();

			vscode.window.showInformationMessage('Conversation deleted successfully');
		} catch (error) {
			console.error('Error deleting conversation:', error);
			vscode.window.showErrorMessage(`Failed to delete conversation: ${error}`);
		}
	}

	private _sendConversationList(): void {
		console.log('Sending conversation list:', this._conversationIndex);
		this._postMessage({
			type: 'conversationList',
			data: this._conversationIndex
		});
	}

	private async _sendWorkspaceFiles(searchTerm?: string): Promise<void> {
		try {
			// Always get all files and filter on the backend for better search results
			const files = await vscode.workspace.findFiles(
				'**/*',
				'{**/node_modules/**,**/.git/**,**/dist/**,**/build/**,**/.next/**,**/.nuxt/**,**/target/**,**/bin/**,**/obj/**}',
				500 // Reasonable limit for filtering
			);

			let fileList = files.map(file => {
				const relativePath = vscode.workspace.asRelativePath(file);
				return {
					name: file.path.split('/').pop() || '',
					path: relativePath,
					fsPath: file.fsPath
				};
			});

			// Filter results based on search term
			if (searchTerm && searchTerm.trim()) {
				const term = searchTerm.toLowerCase();
				fileList = fileList.filter(file => {
					const fileName = file.name.toLowerCase();
					const filePath = file.path.toLowerCase();

					// Check if term matches filename or any part of the path
					return fileName.includes(term) ||
						filePath.includes(term) ||
						filePath.split('/').some(segment => segment.includes(term));
				});
			}

			// Sort and limit results
			fileList = fileList
				.sort((a, b) => a.name.localeCompare(b.name))
				.slice(0, 50);

			this._postMessage({
				type: 'workspaceFiles',
				data: fileList
			});
		} catch (error) {
			console.error('Error getting workspace files:', error);
			this._postMessage({
				type: 'workspaceFiles',
				data: []
			});
		}
	}

	private async _selectImageFile(): Promise<void> {
		try {
			// Show VS Code's native file picker for images
			const result = await vscode.window.showOpenDialog({
				canSelectFiles: true,
				canSelectFolders: false,
				canSelectMany: true,
				title: 'Select image files',
				filters: {
					'Images': ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp']
				}
			});

			if (result && result.length > 0) {
				// Send the selected file paths back to webview
				result.forEach(uri => {
					this._postMessage({
						type: 'imagePath',
						path: uri.fsPath
					});
				});
			}

		} catch (error) {
			console.error('Error selecting image files:', error);
		}
	}

	private async _selectFiles(): Promise<void> {
		try {
			// Show VS Code's native file picker for any files
			const result = await vscode.window.showOpenDialog({
				canSelectFiles: true,
				canSelectFolders: false,
				canSelectMany: true,
				title: 'Select files to add to message',
				openLabel: 'Add to Message'
			});

			if (result && result.length > 0) {
				// Format file paths with quotes and send back to webview
				const formattedPaths = result.map(uri => `"${uri.fsPath}"`).join(' ');
				this._postMessage({
					type: 'insertText',
					text: formattedPaths
				});
			}
		} catch (error) {
			console.error('Error selecting files:', error);
		}
	}

	private async _floatWindow(): Promise<void> {

		try {
			// First ensure the panel is active
			if (this._panel) {
				this._panel.reveal();
			} else {
				console.warn('WARNING: No panel to float!');
			}

			// Small delay to ensure the panel is ready
			setTimeout(async () => {
				// Execute the command to move editor to new window
				await vscode.commands.executeCommand('workbench.action.moveEditorToNewWindow');

				// After moving to new window, force reload conversation
				setTimeout(() => {
					this._reinitializeAfterFloat();
				}, 500);

				// Optional: Show a tip to the user (if not hidden)
				const hideFloatTip = this._context.globalState.get('multiAgentChat.hideFloatTip', false);
				if (!hideFloatTip) {
					const selection = await vscode.window.showInformationMessage(
						'Chat opened in separate window! You can resize and position it anywhere on your screen.',
						'Got it',
						'Don\'t show again'
					);

					if (selection === 'Don\'t show again') {
						// Store preference to not show tip again
						this._context.globalState.update('multiAgentChat.hideFloatTip', true);
					}
				}
			}, 200);
		} catch (error) {
			console.error('Failed to float window:', error);
			vscode.window.showErrorMessage('Failed to open chat in separate window');
		}
	}

	private async _handleDroppedFiles(files: any[]): Promise<void> {
		if (!files || files.length === 0) {
			return;
		}

		// Process the dropped files and send back formatted file paths
		const filePaths: string[] = [];

		for (const file of files) {
			// In VSCode webviews, we typically get file names without full paths
			// Try to find the file in the workspace
			if (file.name) {
				// Search for the file in the workspace
				const searchPattern = `**/${file.name}`;
				const foundFiles = await vscode.workspace.findFiles(searchPattern, '**/node_modules/**', 10);

				if (foundFiles.length > 0) {
					// Use the first match
					filePaths.push(foundFiles[0].fsPath);
				} else {
					// If not found in workspace, just use the name as-is
					// User might be dragging from outside the workspace
					filePaths.push(file.name);
				}
			}
		}

		// Send the formatted file paths back to the webview
		if (filePaths.length > 0) {
			const formattedPaths = filePaths.map(p => `"${p}"`).join(' ');
			this._postMessage({
				type: 'insertText',
				text: formattedPaths
			});
		}
	}

	private _stopClaudeProcess(): void {
		console.log('Stop request received');

		this._isProcessing = false

		// Update UI state
		this._postMessage({
			type: 'setProcessing',
			data: { isProcessing: false }
		});

		if (this._currentClaudeProcess) {
			console.log('Terminating Claude process...');

			// Try graceful termination first
			this._currentClaudeProcess.kill('SIGTERM');

			// Force kill after 2 seconds if still running
			setTimeout(() => {
				if (this._currentClaudeProcess && !this._currentClaudeProcess.killed) {
					console.log('Force killing Claude process...');
					this._currentClaudeProcess.kill('SIGKILL');
				}
			}, 2000);

			// Clear process reference
			this._currentClaudeProcess = undefined;

			this._postMessage({
				type: 'clearLoading'
			});

			// Send stop confirmation message directly to UI and save
			this._sendAndSaveMessage({
				type: 'error',
				data: '⏹️ Claude code was stopped.'
			});

			console.log('Claude process termination initiated');
		} else {
			console.log('No Claude process running to stop');
		}
	}

	private _emergencyStopAllAgents(): void {
		console.log('🛑 EMERGENCY STOP - Halting all agent operations');

		// Set emergency stop flag
		this._isProcessing = false;

		// Inject visible STOP message into chat so agents see it in their context
		this._sendAndSaveMessage({
			type: 'userInput',
			data: '🛑 EMERGENCY STOP - HALT ALL OPERATIONS IMMEDIATELY'
		});

		// Send urgent system message to UI
		this._sendAndSaveMessage({
			type: 'agentResponse',
			data: '⚠️ Emergency stop activated - All agent operations halted'
		});

		// Kill all active provider processes FIRST
		if (this._providerManager) {
			console.log('Killing all active provider processes...');
			this._providerManager.killAllActiveProcesses();
		}

		// Clear the communication hub message queue if available
		if (this._communicationHub) {
			// Clear any pending messages
			this._communicationHub.clearMessageQueue();

			// Reset all agent states
			console.log('Resetting all agent states...');
		}

		// Stop any active Claude process
		if (this._currentClaudeProcess) {
			console.log('Force stopping active Claude process...');
			this._currentClaudeProcess.kill('SIGKILL');
			this._currentClaudeProcess = undefined;
		}

		// Clear any active operations
		this._activeOperations.clear();
		this._abortControllers.forEach(controller => controller.abort());
		this._abortControllers.clear();

		// Update UI state
		this._postMessage({
			type: 'setProcessing',
			data: { isProcessing: false }
		});

		this._postMessage({
			type: 'clearLoading'
		});

		// Hide agent status
		this._postMessage({
			type: 'hideAgentStatus'
		});

		// Send emergency stop confirmation to UI
		this._sendAndSaveMessage({
			type: 'system',
			data: '🛑 Emergency Stop: All agent operations have been halted. The system is now idle.'
		});

		// Log the emergency stop event
		console.log('Emergency stop completed. All operations halted.');

		// Show VS Code notification
		vscode.window.showWarningMessage('Emergency Stop: All agent operations have been halted');
	}

	private _setWorkflowMode(mode: 'direct' | 'review' | 'brainstorm' | 'auto'): void {
		console.log(`Setting workflow mode to: ${mode}`);
		this._workflowMode = mode;

		// Store the preference
		this._context.globalState.update('workflowMode', mode);

		// Log the change
		this._outputChannel.appendLine(`Workflow mode changed to: ${mode.toUpperCase()}`);

		// Optionally update agent selection based on workflow mode
		if (mode === 'direct') {
			// In direct mode, we might want to use a specific agent
			// For now, keep the current agent selection
		}

		// Show VS Code notification
		let modeLabel = '';
		switch(mode) {
			case 'direct':
				modeLabel = 'Direct (Single Agent)';
				break;
			case 'review':
				modeLabel = 'Review (With Peer Review)';
				break;
			case 'brainstorm':
				modeLabel = 'Brainstorm (Parallel Exploration)';
				break;
			case 'auto':
				modeLabel = 'Auto (System Choice)';
				break;
		}
		vscode.window.showInformationMessage(`Workflow mode: ${modeLabel}`);
	}

	private async _handleFileOperations(response: string): Promise<void> {
		console.log('[File Operations] Checking response for file operations');

		// Parse response for file operations - enhanced patterns
		// Look for various patterns agents might use
		const fileCreatePattern = /(?:Creating|Writing|Created|Wrote|Save|Saving|Generate|Generating|File|Making)(?:\s+(?:a\s+)?(?:new\s+)?(?:file|directory|folder))?:?\s+[`"]?([^\s`"]+\.[^\s`"]+)[`"]?/gi;
		const directoryPattern = /(?:Creating|Making|Created)(?:\s+(?:a\s+)?(?:new\s+)?(?:directory|folder)):?\s+[`"]?([^\s`"]+)[`"]?/gi;
		const fileContentPattern = /```(?:[\w+]+)?\n([\s\S]*?)```/g;

		let match;
		const fileOperations: { filename: string, content: string }[] = [];

		// Find file names mentioned
		const fileNames: string[] = [];
		while ((match = fileCreatePattern.exec(response)) !== null) {
			console.log(`[File Operations] Found file mention: ${match[1]}`);
			fileNames.push(match[1]);
		}

		// Find directory names mentioned
		const directoryNames: string[] = [];
		while ((match = directoryPattern.exec(response)) !== null) {
			console.log(`[File Operations] Found directory mention: ${match[1]}`);
			directoryNames.push(match[1]);
		}

		// Find code blocks that might be file contents
		const codeBlocks: string[] = [];
		while ((match = fileContentPattern.exec(response)) !== null) {
			codeBlocks.push(match[1]);
		}

		// Match file names with code blocks
		for (let i = 0; i < fileNames.length && i < codeBlocks.length; i++) {
			fileOperations.push({
				filename: fileNames[i],
				content: codeBlocks[i]
			});
		}

		// Create directories first if any mentioned
		if (directoryNames.length > 0) {
			console.log(`[File Operations] Creating ${directoryNames.length} directories`);
			for (const dir of directoryNames) {
				try {
					const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
					if (workspaceFolder) {
						const dirPath = path.isAbsolute(dir) ?
							dir :
							path.join(workspaceFolder.uri.fsPath, dir);

						const dirUri = vscode.Uri.file(dirPath);
						await vscode.workspace.fs.createDirectory(dirUri);
						console.log(`[File Operations] Created directory: ${dirPath}`);
					}
				} catch (error) {
					console.error(`[File Operations] Failed to create directory ${dir}:`, error);
				}
			}
		}

		// Request permission for file operations if any found
		if (fileOperations.length > 0) {
			console.log(`[File Operations] Found ${fileOperations.length} file operations`);
			const fileList = fileOperations.map(op => op.filename).join(', ');

			// Generate a unique permission ID
			const permissionId = `executor-file-${Date.now()}`;

			// Send permission request to UI
			this._sendAndSaveMessage({
				type: 'permissionRequest',
				data: {
					id: permissionId,
					tool: 'Executor File Write',
					input: {
						files: fileList,
						operation: 'write'
					},
					pattern: `Write files: ${fileList}`
				}
			});

			// Wait for permission response
			const approved = await new Promise<boolean>((resolve) => {
				if (!this._pendingPermissionResolvers) {
					this._pendingPermissionResolvers = new Map();
				}
				this._pendingPermissionResolvers.set(permissionId, resolve);
			});

			if (!approved) {
				console.log('[File Operations] Permission denied by user');
				vscode.window.showWarningMessage('File operations were denied');
				return;
			}
			console.log('[File Operations] Permission approved');
		}

		// Execute file operations if approved
		for (const op of fileOperations) {
			try {
				const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
				if (workspaceFolder) {
					const filePath = path.isAbsolute(op.filename) ?
						op.filename :
						path.join(workspaceFolder.uri.fsPath, op.filename);

					const fileUri = vscode.Uri.file(filePath);
					const content = new TextEncoder().encode(op.content);
					// Ensure parent directory exists
					const dirPath = path.dirname(filePath);
					const dirUri = vscode.Uri.file(dirPath);
					try {
						await vscode.workspace.fs.stat(dirUri);
					} catch {
						console.log(`[File Operations] Creating parent directory: ${dirPath}`);
						await vscode.workspace.fs.createDirectory(dirUri);
					}

					await vscode.workspace.fs.writeFile(fileUri, content);

					console.log(`[File Operations] Successfully wrote file: ${filePath}`);
					vscode.window.showInformationMessage(`File created: ${op.filename}`);
				}
			} catch (error) {
				console.error(`[File Operations] Failed to create file ${op.filename}:`, error);
			}
		}
	}

	public async _clearAllConversations(): Promise<void> {
		try {
			// Clear conversations using conversation manager
			await this._conversationManager.clearAllConversations();
			this._conversationIndex = this._conversationManager.getConversationIndex();
			console.log('Cleared all conversations');

			// Clear current session
			this._currentConversation = [];
			this._agentConversationContext = this._contextManager.getAgentConversationContext();
			this._agentConversationContext.clear();
			this._conversationStartTime = undefined;
			this._currentSessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

			// Reset totals
			this._totalCost = 0;
			this._totalTokensInput = 0;
			this._totalTokensOutput = 0;
			this._requestCount = 0;

			// Notify UI
			this._postMessage({
				type: 'sessionCleared'
			});

			this._postMessage({
				type: 'conversationList',
				data: []
			});

			vscode.window.showInformationMessage('All conversation history has been cleared');

		} catch (error) {
			console.error('Failed to clear conversations:', error);
			vscode.window.showErrorMessage('Failed to clear conversation history');
		}
	}

	private _rebuildAgentContextFromHistory(): void {
		// Rebuild agent conversation context from loaded history
		if (!this._agentConversationContext) {
			this._agentConversationContext = new Map();
		}

		// Go through conversation history and rebuild context
		for (let i = 0; i < this._currentConversation.length; i++) {
			const msg = this._currentConversation[i];

			// Track user inputs
			if (msg.messageType === 'userInput') {
				// Look ahead for agent response
				for (let j = i + 1; j < this._currentConversation.length; j++) {
					const nextMsg = this._currentConversation[j];
					if (nextMsg.messageType === 'agentResponse' && (nextMsg as any).agent) {
						const agentInfo = (nextMsg as any).agent;
						const agentId = agentInfo.id;
						const history = this._agentConversationContext.get(agentId) || [];
						history.push({ role: 'user', content: msg.data });
						history.push({ role: 'assistant', content: nextMsg.data });

						// Keep last 10 exchanges per agent
						if (history.length > 20) {
							history.splice(0, history.length - 20);
						}
						this._agentConversationContext.set(agentId, history);
						break;
					}
				}
			}
		}
	}

	// Note: _updateConversationIndex is now handled by ConversationManager internally
	// The old method is no longer needed as the ConversationManager maintains the index

	private _getLatestConversation(): any | undefined {
		if (this._conversationIndex.length === 0) {
			return undefined;
		}

		// Sort by timestamp to get the most recent conversation
		const sorted = [...this._conversationIndex].sort((a, b) => {
			return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
		});

		return sorted[0];
	}

	private async _loadConversationHistory(filename: string): Promise<void> {

		try {
			// Load conversation using conversation manager
			const conversationData = await this._conversationManager.loadConversation(filename);
			if (!conversationData) {
				console.error(`Conversation not found: ${filename}`);
				return;
			}

			// Load conversation into current state
			this._currentConversation = conversationData.messages || [];
			this._conversationStartTime = conversationData.startTime;
			this._conversationTopic = conversationData.topic;
			this._totalCost = conversationData.totalCost || 0;
			this._totalTokensInput = conversationData.totalTokens?.input || 0;
			this._totalTokensOutput = conversationData.totalTokens?.output || 0;

			// Send topic to UI and hide new chat topic input
			this._postMessage({
				type: 'setTopic',
				topic: this._conversationTopic
			});

			// Hide the new chat topic input if it's visible
			this._postMessage({
				type: 'hideNewChatTopic'
			});

			// Restore agent conversation context
			if ((conversationData as any).agentContext) {
				// Rebuild context from loaded conversation
				await this._contextManager.rebuildAgentContextFromHistory(conversationData.messages || []);
				this._agentConversationContext = this._contextManager.getAgentConversationContext();
			} else {
				// Rebuild context from message history for backward compatibility
				this._rebuildAgentContextFromHistory();
			}

			// Clear UI messages first, then send all messages to recreate the conversation
			setTimeout(() => {
				// Clear existing messages
				this._postMessage({
					type: 'sessionCleared'
				});

				let requestStartTime: number

				// Small delay to ensure messages are cleared before loading new ones
				setTimeout(() => {
					const messages = this._currentConversation;
					for (let i = 0; i < messages.length; i++) {

						const message = messages[i];

						if(message.messageType === 'permissionRequest'){
							const isLast = i === messages.length - 1;
							if(!isLast){
								continue;
							}
						}

						// Include agent metadata if present (for agentResponse messages)
						const postMsg: any = {
							type: message.messageType,
							data: message.data,
							timestamp: message.timestamp // Preserve original timestamp
						};

						if (message.agent) {
							postMsg.agent = message.agent;
						}

						this._postMessage(postMsg);
						if (message.messageType === 'userInput') {
							try {
								requestStartTime = new Date(message.timestamp).getTime()
							} catch (e) {
								console.log(e)
							}
						}
					}

					// Send updated totals
					this._postMessage({
						type: 'updateTotals',
						data: {
							totalCost: this._totalCost,
							totalTokensInput: this._totalTokensInput,
							totalTokensOutput: this._totalTokensOutput,
							requestCount: this._requestCount
						}
					});

					// Restore processing state if the conversation was saved while processing
					if (this._isProcessing) {
						this._postMessage({
							type: 'setProcessing',
							data: { isProcessing: this._isProcessing, requestStartTime }
						});
					}
					// Send ready message after conversation is loaded
					this._sendReadyMessage();
				}, 50);
			}, 100); // Small delay to ensure webview is ready

			console.log(`Loaded conversation history: ${filename}`);
		} catch (error: any) {
			console.error('Failed to load conversation history:', error.message);
		}
	}

	private _getHtmlForWebview(): string {
		const webview = this._webview || this._panel?.webview;
		if (!webview) {
			throw new Error('Webview not initialized');
		}

		// Load external resources
		const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(
			this._extensionUri,
			'resources',
			'webview',
			'script.js'
		));

		const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(
			this._extensionUri,
			'resources',
			'webview',
			'styles.css'
		));

		// Load HTML template
		const htmlPath = vscode.Uri.joinPath(this._extensionUri, 'resources', 'webview', 'index.html');
		const fs = require('fs');
		const html = fs.readFileSync(htmlPath.fsPath, 'utf-8')
			.replace(/\${scriptUri}/g, scriptUri.toString())
			.replace(/\${styleUri}/g, styleUri.toString())
			.replace(/\${cspSource}/g, webview.cspSource);

		return html;
	}

	private _sendCurrentSettings(): void {
		const config = vscode.workspace.getConfiguration('multiAgentChat');
		const settings = {
			'thinking.intensity': config.get<string>('thinking.intensity', 'think'),
			'wsl.enabled': config.get<boolean>('wsl.enabled', false),
			'wsl.distro': config.get<string>('wsl.distro', 'Ubuntu'),
			'wsl.nodePath': config.get<string>('wsl.nodePath', '/usr/bin/node'),
			'wsl.claudePath': config.get<string>('wsl.claudePath', '/usr/local/bin/claude'),
			'permissions.yoloMode': config.get<boolean>('permissions.yoloMode', false)
		};

		this._postMessage({
			type: 'settingsData',
			data: settings
		});
	}

	private async _enableYoloMode(): Promise<void> {
		try {
			// Update VS Code configuration to enable YOLO mode
			const config = vscode.workspace.getConfiguration('multiAgentChat');

			// Clear any global setting and set workspace setting
			await config.update('permissions.yoloMode', true, vscode.ConfigurationTarget.Workspace);

			console.log('YOLO Mode enabled - all future permissions will be skipped');

			// Send updated settings to UI
			this._sendCurrentSettings();

		} catch (error) {
			console.error('Error enabling YOLO mode:', error);
		}
	}

	private _saveInputText(text: string): void {
		this._draftMessage = text || '';
	}

	private async _updateSettings(settings: { [key: string]: any }): Promise<void> {
		const config = vscode.workspace.getConfiguration('multiAgentChat');

		try {
			for (const [key, value] of Object.entries(settings)) {
				if (key === 'permissions.yoloMode') {
					// YOLO mode is workspace-specific
					await config.update(key, value, vscode.ConfigurationTarget.Workspace);
				} else {
					// Other settings are global (user-wide)
					await config.update(key, value, vscode.ConfigurationTarget.Global);
				}
			}

			console.log('Settings updated:', settings);
		} catch (error) {
			console.error('Failed to update settings:', error);
			vscode.window.showErrorMessage('Failed to update settings');
		}
	}

	private async _getClipboardText(): Promise<void> {
		try {
			const text = await vscode.env.clipboard.readText();
			this._postMessage({
				type: 'clipboardText',
				data: text
			});
		} catch (error) {
			console.error('Failed to read clipboard:', error);
		}
	}

	private _setSelectedAgent(agent: string): void {
		// Validate agent name
		const validAgents = ['team', 'architect', 'coder', 'executor', 'reviewer', 'documenter', 'coordinator'];
		if (validAgents.includes(agent)) {
			this._selectedAgent = agent;
			console.log('Agent selected:', agent);

			// Store the agent preference in workspace state
			this._context.workspaceState.update('multiagent.selectedAgent', agent);

			// Show confirmation with agent names
			const agentNames: { [key: string]: string } = {
				'team': '👥 Team (Full Team Collaboration)',
				'architect': '🏗️ Architect (System Design & Architecture)',
				'coder': '💻 Coder (Implementation & Development)',
				'executor': '⚡ Executor (File Operations & Commands)',
				'reviewer': '🔍 Reviewer (Code Review & QA)',
				'documenter': '📝 Documenter (Documentation)',
				'coordinator': '🤝 Coordinator (Multi-Agent Orchestration)'
			};
			vscode.window.showInformationMessage(`Agent switched to: ${agentNames[agent] || agent}`);

			// Send confirmation to webview
			this._postMessage({
				type: 'agentSelected',
				agent: agent
			});
		} else {
			console.error('Invalid agent selected:', agent);
			vscode.window.showErrorMessage(`Invalid agent: ${agent}.`);
		}
	}

	private _setSelectedModel(model: string): void {
		// Map old model names to new agent roles for backwards compatibility
		const modelToAgent: { [key: string]: string } = {
			'opus': 'architect',
			'sonnet': 'coder',
			'default': 'team'
		};
		this._setSelectedAgent(modelToAgent[model] || 'team');
	}

	private _openModelTerminal(): void {
		const terminal = vscode.window.createTerminal('Claude Model Settings');
		const args = ['--model'];
		// Use native claude command
		terminal.sendText(`claude ${args.join(' ')}`);
		terminal.show();

		// Show info message
		vscode.window.showInformationMessage(
			'Check the terminal to update your default model configuration. Come back to this chat here after making changes.',
			'OK'
		);

		// Send message to UI about terminal
		this._postMessage({
			type: 'terminalOpened',
			data: 'Check the terminal to update your default model configuration. Come back to this chat here after making changes.'
		});
	}


	private _sendPlatformInfo() {
		const platform = process.platform;
		const dismissed = this._context.globalState.get<boolean>('wslAlertDismissed', false);

		// Get WSL configuration
		const config = vscode.workspace.getConfiguration('multiAgentChat');
		const wslEnabled = config.get<boolean>('wsl.enabled', false);

		this._postMessage({
			type: 'platformInfo',
			data: {
				platform: platform,
				isWindows: platform === 'win32',
				wslAlertDismissed: dismissed,
				wslEnabled: wslEnabled
			}
		});
	}


	private async _openFileInEditor(filePath: string) {
		try {
			const uri = vscode.Uri.file(filePath);
			const document = await vscode.workspace.openTextDocument(uri);
			await vscode.window.showTextDocument(document, vscode.ViewColumn.One);
		} catch (error) {
			vscode.window.showErrorMessage(`Failed to open file: ${filePath}`);
			console.error('Error opening file:', error);
		}
	}

	private async _createImageFile(imageData: string, imageType: string) {
		try {
			const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
			if (!workspaceFolder) { return; }

			// Extract base64 data from data URL
			const base64Data = imageData.split(',')[1];
			const buffer = Buffer.from(base64Data, 'base64');

			// Get file extension from image type
			const extension = imageType.split('/')[1] || 'png';

			// Create unique filename with timestamp
			const timestamp = Date.now();
			const imageFileName = `image_${timestamp}.${extension}`;

			// Create images folder in workspace .claude directory
			const imagesDir = vscode.Uri.joinPath(workspaceFolder.uri, '.claude', 'multiAgentChat-images');
			await vscode.workspace.fs.createDirectory(imagesDir);

			// Create .gitignore to ignore all images
			const gitignorePath = vscode.Uri.joinPath(imagesDir, '.gitignore');
			try {
				await vscode.workspace.fs.stat(gitignorePath);
			} catch {
				// .gitignore doesn't exist, create it
				const gitignoreContent = new TextEncoder().encode('*\n');
				await vscode.workspace.fs.writeFile(gitignorePath, gitignoreContent);
			}

			// Create the image file
			const imagePath = vscode.Uri.joinPath(imagesDir, imageFileName);
			await vscode.workspace.fs.writeFile(imagePath, buffer);

			// Send the file path back to webview
			this._postMessage({
				type: 'imagePath',
				data: {
					filePath: imagePath.fsPath
				}
			});

		} catch (error) {
			console.error('Error creating image file:', error);
			vscode.window.showErrorMessage('Failed to create image file');
		}
	}

	private async _sendSettingsToUI(): Promise<void> {
		try {
			console.log('Loading settings panel...');
			// Import SettingsPanel dynamically
			const { SettingsPanel } = await import('./ui/SettingsPanel.js');

			// Create or reuse SettingsPanel instance
			if (!this._settingsPanel) {
				this._settingsPanel = new SettingsPanel(this._context, (settings: any) => {
					// Handle settings change
					this._applySettings(settings);
				});
			}

			// Get the HTML and send it to the webview
			const html = this._settingsPanel.getHtml();
			const script = this._settingsPanel.getScript();

			console.log('Sending settings to UI...');
			this._postMessage({
				type: 'settingsLoaded',
				data: {
					html: html,
					script: script,
					settings: this._settingsPanel.loadSettings()
				}
			});
		} catch (error) {
			console.error('Error loading settings panel:', error);
			this._postMessage({
				type: 'settingsLoaded',
				data: {
					html: '<div style="padding: 20px; text-align: center; color: var(--vscode-errorForeground);">Error loading settings: ' + error + '</div>',
					script: '',
					settings: {}
				}
			});
		}
	}

	private async _saveSettings(settings: any): Promise<void> {
		// This method is now handled by SettingsPanel.saveSettings
		// Kept for backward compatibility
		if (this._settingsPanel) {
			await this._settingsPanel.saveSettings(settings);
		}
	}

	private _applySettings(settings: any): void {
		// Apply YOLO mode
		if (settings.global?.yoloMode !== undefined) {
			this._yoloMode = settings.global.yoloMode;
		}

		// Apply agent-specific settings
		if (settings.agents) {
			// Store agent settings for use when sending messages
			this._agentSettings = settings.agents;
		}

		console.log('Settings applied:', settings);
	}

	public dispose() {
		if (this._panel) {
			this._panel.dispose();
			this._panel = undefined;
		}

		// Dispose message handler if it exists
		if (this._messageHandlerDisposable) {
			this._messageHandlerDisposable.dispose();
			this._messageHandlerDisposable = undefined;
		}

		while (this._disposables.length) {
			const disposable = this._disposables.pop();
			if (disposable) {
				disposable.dispose();
			}
		}
	}
}