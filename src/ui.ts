import getScript from './script';
import styles from './uiStyles';


const getHtml = (isTelemetryEnabled: boolean) => `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Multi Agent Chat</title>
	${styles}
	${getScript(isTelemetryEnabled)}
</head>
<body>
	<div class="header">
		<div style="display: flex; align-items: center;">
			<h2 id="chatTitle">Multi Agent Chat</h2>
			<!-- <div id="sessionInfo" class="session-badge" style="display: none;">
				<span class="session-icon">💬</span>
				<span id="sessionId">-</span>
				<span class="session-label">session</span>
			</div> -->
		</div>
		<div style="display: flex; gap: 8px; align-items: center;">
			<div id="sessionStatus" class="session-status" style="display: none;">No session</div>
			<button class="btn outlined" id="settingsBtn" onclick="toggleSettings()" title="Settings">⚙️</button>
			<button class="btn outlined" id="historyBtn" onclick="toggleConversationHistory()">📚 History</button>
			<button class="btn primary" id="newSessionBtn" onclick="newSession()">New Chat</button>
			<button class="btn outlined" id="floatBtn" onclick="floatWindow()" title="Pop Out to Separate Window">🪟</button>
		</div>
	</div>

	<div id="newChatTopic" class="new-chat-topic" style="display: none;">
		<div class="topic-input-container">
			<h3>New Conversation</h3>
			<input type="text" id="topicInput" class="topic-input" placeholder="Enter a topic for this conversation (optional)" />
			<div class="topic-buttons">
				<button class="btn primary" onclick="startNewChatWithTopic()">Start Chat</button>
				<button class="btn outlined" onclick="cancelNewChat()">Cancel</button>
			</div>
		</div>
	</div>

	<div id="conversationHistory" class="conversation-history" style="display: none;">
		<div class="conversation-header">
			<h3>Conversation History</h3>
			<button class="btn" onclick="toggleConversationHistory()">✕ Close</button>
		</div>
		<div id="conversationList" class="conversation-list">
			<!-- Conversations will be loaded here -->
		</div>
	</div>

	<div id="settingsPanel" class="settings-panel" style="display: none;">
		<div class="settings-header">
			<h3>⚙️ Settings</h3>
			<button class="btn" onclick="toggleSettings()">✕ Close</button>
		</div>
		<div id="settingsContent" class="settings-content">
			<div class="settings-loading" style="text-align: center; padding: 40px; color: var(--vscode-descriptionForeground);">
				Loading settings...
			</div>
		</div>
	</div>

	<div class="chat-container" id="chatContainer">
		<div class="messages" id="messages"></div>
		
		<!-- WSL Alert for Windows users -->
		<div id="wslAlert" class="wsl-alert" style="display: none;">
			<div class="wsl-alert-content">
				<div class="wsl-alert-icon">💻</div>
				<div class="wsl-alert-text">
					<strong>Looks like you are using Windows!</strong><br/>
					If you are using WSL to run Claude Code, you should enable WSL integration in the settings.
				</div>
				<div class="wsl-alert-actions">
					<button class="btn" onclick="openWSLSettings()">Enable WSL</button>
					<button class="btn outlined" onclick="dismissWSLAlert()">Dismiss</button>
				</div>
			</div>
		</div>

		<!-- Agent Status Indicator -->
		<div id="agentStatusBar" class="agent-status-bar" style="display: none;">
			<div class="status-indicator">
				<div class="status-spinner" id="statusSpinner" style="display: none;"></div>
				<div class="status-text" id="agentStatusText">Message sent, awaiting response...</div>
			</div>
			<div class="status-agents" id="agentStatusList"></div>
		</div>

		<div class="input-container" id="inputContainer">
			<!-- Hiding Plan and Thinking modes for multi-agent setup -->
			<div class="input-modes" style="display: none;">
				<div class="mode-toggle">
					<span onclick="togglePlanMode()">Plan First</span>
					<div class="mode-switch" id="planModeSwitch" onclick="togglePlanMode()"></div>
				</div>
				<div class="mode-toggle">
					<span id="thinkingModeLabel" onclick="toggleThinkingMode()">Thinking Mode</span>
					<div class="mode-switch" id="thinkingModeSwitch" onclick="toggleThinkingMode()"></div>
				</div>
			</div>
			<div class="textarea-container">
				<div class="textarea-wrapper">
					<textarea class="input-field" id="messageInput" placeholder="Type your message or @mention an agent..." rows="1"></textarea>
					<div class="input-controls">
						<div class="left-controls">
							<!-- File attach button -->
							<button class="attach-btn" onclick="selectFiles()" title="Attach files (or paste file paths)">
								📎
							</button>
							<!-- Agent selector removed - use @agent mentions instead -->
							<!-- MCP configuration hidden for multi-agent setup -->
							<button class="tools-btn" onclick="showMCPModal()" title="Configure MCP servers" style="display: none;">
								MCP
								<svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor">
									<path d="M1 2.5l3 3 3-3"></path>
								</svg>
							</button>
						</div>
						<div class="right-controls">
							<button class="send-btn" id="sendBtn" onclick="sendMessage()">
							<div>
							<span>Send </span>
							   <svg
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 24 24"
								width="11"
								height="11"
								>
								<path
									fill="currentColor"
									d="M20 4v9a4 4 0 0 1-4 4H6.914l2.5 2.5L8 20.914L3.086 16L8 11.086L9.414 12.5l-2.5 2.5H16a2 2 0 0 0 2-2V4z"
								></path>
								</svg>
								</div>
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
	
	<!-- Status and cost indicators hidden for multi-agent setup -->
	<div class="status ready" id="status" style="display: none;">
		<div class="status-indicator"></div>
		<div class="status-text" id="statusText">Initializing...</div>
		<button class="btn stop" id="stopBtn" onclick="stopRequest()" style="display: none;">
			<svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
				<path d="M6 6h12v12H6z"/>
			</svg>
			Stop
		</button>
	</div>

			<div id="yoloWarning" class="yolo-warning" style="display: none;">
			⚠️ Yolo Mode Active: Claude Code will auto-approve all tool requests.
		</div>

	<!-- File picker modal -->
	<div id="filePickerModal" class="file-picker-modal" style="display: none;">
		<div class="file-picker-content">
			<div class="file-picker-header">
				<span>Select File</span>
				<input type="text" id="fileSearchInput" placeholder="Search files..." class="file-search-input">
			</div>
			<div id="fileList" class="file-list">
				<!-- Files will be loaded here -->
			</div>
		</div>
	</div>

	<!-- MCP Servers modal -->
	<div id="mcpModal" class="tools-modal" style="display: none;">
		<div class="tools-modal-content">
			<div class="tools-modal-header">
				<span>MCP Servers</span>
				<button class="tools-close-btn" onclick="hideMCPModal()">✕</button>
			</div>
			<div class="tools-list">
				<div class="mcp-servers-list" id="mcpServersList">
					<!-- MCP servers will be loaded here -->
				</div>
				<div class="mcp-add-server">
					<button class="btn outlined" onclick="showAddServerForm()" id="addServerBtn">+ Add MCP Server</button>
				</div>
				<div class="mcp-popular-servers" id="popularServers">
					<h4>Popular MCP Servers</h4>
					<div class="popular-servers-grid">
						<div class="popular-server-item" onclick="addPopularServer('context7', { type: 'http', url: 'https://context7.liam.sh/mcp' })">
							<div class="popular-server-icon">📚</div>
							<div class="popular-server-info">
								<div class="popular-server-name">Context7</div>
								<div class="popular-server-desc">Up-to-date Code Docs For Any Prompt</div>
							</div>
						</div>
						<div class="popular-server-item" onclick="addPopularServer('sequential-thinking', { type: 'stdio', command: 'npx', args: ['-y', '@modelcontextprotocol/server-sequential-thinking'] })">
							<div class="popular-server-icon">🔗</div>
							<div class="popular-server-info">
								<div class="popular-server-name">Sequential Thinking</div>
								<div class="popular-server-desc">Step-by-step reasoning capabilities</div>
							</div>
						</div>
						<div class="popular-server-item" onclick="addPopularServer('memory', { type: 'stdio', command: 'npx', args: ['-y', '@modelcontextprotocol/server-memory'] })">
							<div class="popular-server-icon">🧠</div>
							<div class="popular-server-info">
								<div class="popular-server-name">Memory</div>
								<div class="popular-server-desc">Knowledge graph storage</div>
							</div>
						</div>
						<div class="popular-server-item" onclick="addPopularServer('puppeteer', { type: 'stdio', command: 'npx', args: ['-y', '@modelcontextprotocol/server-puppeteer'] })">
							<div class="popular-server-icon">🎭</div>
							<div class="popular-server-info">
								<div class="popular-server-name">Puppeteer</div>
								<div class="popular-server-desc">Browser automation</div>
							</div>
						</div>
						<div class="popular-server-item" onclick="addPopularServer('fetch', { type: 'stdio', command: 'npx', args: ['-y', '@modelcontextprotocol/server-fetch'] })">
							<div class="popular-server-icon">🌐</div>
							<div class="popular-server-info">
								<div class="popular-server-name">Fetch</div>
								<div class="popular-server-desc">HTTP requests & web scraping</div>
							</div>
						</div>
						<div class="popular-server-item" onclick="addPopularServer('filesystem', { type: 'stdio', command: 'npx', args: ['-y', '@modelcontextprotocol/server-filesystem'] })">
							<div class="popular-server-icon">📁</div>
							<div class="popular-server-info">
								<div class="popular-server-name">Filesystem</div>
								<div class="popular-server-desc">File operations & management</div>
							</div>
						</div>
					</div>
				</div>
				<div class="mcp-add-form" id="addServerForm" style="display: none;">
				<div class="form-group">
					<label for="serverName">Server Name:</label>
					<input type="text" id="serverName" placeholder="my-server" required>
				</div>
				<div class="form-group">
					<label for="serverType">Server Type:</label>
					<select id="serverType" onchange="updateServerForm()">
						<option value="http">HTTP</option>
						<option value="sse">SSE</option>
						<option value="stdio">stdio</option>
					</select>
				</div>
				<div class="form-group" id="commandGroup" style="display: none;">
					<label for="serverCommand">Command:</label>
					<input type="text" id="serverCommand" placeholder="/path/to/server">
				</div>
				<div class="form-group" id="urlGroup">
					<label for="serverUrl">URL:</label>
					<input type="text" id="serverUrl" placeholder="https://example.com/mcp">
				</div>
				<div class="form-group" id="argsGroup" style="display: none;">
					<label for="serverArgs">Arguments (one per line):</label>
					<textarea id="serverArgs" placeholder="--api-key&#10;abc123" rows="3"></textarea>
				</div>
				<div class="form-group" id="envGroup" style="display: none;">
					<label for="serverEnv">Environment Variables (KEY=value, one per line):</label>
					<textarea id="serverEnv" placeholder="API_KEY=123&#10;CACHE_DIR=/tmp" rows="3"></textarea>
				</div>
				<div class="form-group" id="headersGroup">
					<label for="serverHeaders">Headers (KEY=value, one per line):</label>
					<textarea id="serverHeaders" placeholder="Authorization=Bearer token&#10;X-API-Key=key" rows="3"></textarea>
				</div>
				<div class="form-buttons">
					<button class="btn" onclick="saveMCPServer()">Add Server</button>
					<button class="btn outlined" onclick="hideAddServerForm()">Cancel</button>
				</div>
			</div>
		</div>
	</div>
	</div>


	<!-- Agent selector modal -->
	<!-- Agent selector modal removed - use @agent mentions instead -->
	<div id="modelModal" class="tools-modal" style="display: none;">
		<div class="tools-modal-content" style="width: 450px;">
			<div class="tools-modal-header">
				<span>Select Agent</span>
				<button class="tools-close-btn" onclick="hideModelModal()">✕</button>
			</div>
			<div class="model-explanatory-text">
				Choose which AI agent to send your message to. Agents can hand off tasks to each other.
			</div>
			<div class="tools-list">
				<div class="tool-item" onclick="selectAgent('team')">
					<input type="radio" name="agent" id="agent-team" value="team" checked>
					<label for="agent-team">
						<div class="model-title">👥 Team - Full Team Collaboration</div>
						<div class="model-description">
							Broadcasts message to all agents and coordinates collaborative responses
						</div>
					</label>
				</div>
				<div class="tool-item" onclick="selectAgent('architect')">
					<input type="radio" name="agent" id="agent-architect" value="architect">
					<label for="agent-architect">
						<div class="model-title">🏗️ Architect - System Design & Architecture</div>
						<div class="model-description">
							Plans system architecture, designs APIs, and makes high-level technical decisions
						</div>
					</label>
				</div>
				<div class="tool-item" onclick="selectAgent('coder')">
					<input type="radio" name="agent" id="agent-coder" value="coder">
					<label for="agent-coder">
						<div class="model-title">💻 Coder - Implementation & Development</div>
						<div class="model-description">
							Writes code, implements features, and handles complex programming tasks
						</div>
					</label>
				</div>
				<div class="tool-item" onclick="selectAgent('executor')">
					<input type="radio" name="agent" id="agent-executor" value="executor">
					<label for="agent-executor">
						<div class="model-title">⚡ Executor - File Operations & Commands</div>
						<div class="model-description">
							Executes commands, manages files, runs tests, and handles system operations
						</div>
					</label>
				</div>
				<div class="tool-item" onclick="selectAgent('reviewer')">
					<input type="radio" name="agent" id="agent-reviewer" value="reviewer">
					<label for="agent-reviewer">
						<div class="model-title">🔍 Reviewer - Code Review & Quality Assurance</div>
						<div class="model-description">
							Reviews code quality, suggests improvements, and ensures best practices
						</div>
					</label>
				</div>
				<div class="tool-item" onclick="selectAgent('documenter')">
					<input type="radio" name="agent" id="agent-documenter" value="documenter">
					<label for="agent-documenter">
						<div class="model-title">📝 Documenter - Documentation & Communication</div>
						<div class="model-description">
							Creates documentation, writes comments, and explains complex concepts
						</div>
					</label>
				</div>
				<div class="tool-item" onclick="selectAgent('coordinator')">
					<input type="radio" name="agent" id="agent-coordinator" value="coordinator">
					<label for="agent-coordinator" class="default-model-layout">
						<div class="model-option-content">
							<div class="model-title">🤝 Coordinator - Multi-Agent Orchestration</div>
							<div class="model-description">
								Coordinates between agents, manages workflows, and delegates tasks
							</div>
						</div>
					</label>
				</div>
			</div>
		</div>
	</div>

	<!-- Thinking intensity modal -->
	<div id="thinkingIntensityModal" class="tools-modal" style="display: none;">
		<div class="tools-modal-content" style="width: 450px;">
			<div class="tools-modal-header">
				<span>Thinking Mode Intensity</span>
				<button class="tools-close-btn" onclick="hideThinkingIntensityModal()">✕</button>
			</div>
			<div class="thinking-modal-description">
				Configure the intensity of thinking mode. Higher levels provide more detailed reasoning but consume more tokens.
			</div>
			<div class="tools-list">
				<div class="thinking-slider-container">
					<input type="range" min="0" max="3" value="0" step="1" class="thinking-slider" id="thinkingIntensitySlider" oninput="updateThinkingIntensityDisplay(this.value)">
					<div class="slider-labels">
						<div class="slider-label active" id="thinking-label-0" onclick="setThinkingIntensityValue(0)">Think</div>
						<div class="slider-label" id="thinking-label-1" onclick="setThinkingIntensityValue(1)">Think Hard</div>
						<div class="slider-label" id="thinking-label-2" onclick="setThinkingIntensityValue(2)">Think Harder</div>
						<div class="slider-label" id="thinking-label-3" onclick="setThinkingIntensityValue(3)">Ultrathink</div>
					</div>
				</div>
				<div class="thinking-modal-actions">
					<button class="confirm-btn" onclick="confirmThinkingIntensity()">Confirm</button>
				</div>
			</div>
		</div>
	</div>
</body>
</html>`;

export default getHtml;