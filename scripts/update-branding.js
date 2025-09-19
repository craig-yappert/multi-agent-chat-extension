const fs = require('fs');
const path = require('path');

// Configuration
const OLD_NAMESPACE = 'claudeCodeChat';
const NEW_NAMESPACE = 'multiAgentChat';
const OLD_COMMAND_PREFIX = 'claude-code-chat';
const NEW_COMMAND_PREFIX = 'multiAgentChat';

// Files to update
const filesToUpdate = [
    'src/extension.ts',
    'src/providers.ts',
    'src/agentCommunication.ts',
    'src/ui/SettingsPanel.ts',
    'src/fastTeamProvider.ts',
    'src/improvedFastTeamProvider.ts',
    'src/performanceOptimizer.ts',
    'src/providers/intelligentProvider.ts',
    'src/providers/mcpWebSocketProvider.ts',
    'src/mcp-server/serverManager.ts',
    'src/mcp-server/validator.ts'
];

// Update each file
filesToUpdate.forEach(filePath => {
    const fullPath = path.join(__dirname, '..', filePath);

    if (!fs.existsSync(fullPath)) {
        console.log(`Skipping ${filePath} (file not found)`);
        return;
    }

    let content = fs.readFileSync(fullPath, 'utf8');
    let originalContent = content;

    // Replace configuration references
    content = content.replace(/getConfiguration\(['"]claudeCodeChat['"]\)/g, `getConfiguration('${NEW_NAMESPACE}')`);

    // Replace command references
    content = content.replace(/registerCommand\(['"]claude-code-chat\./g, `registerCommand('${NEW_COMMAND_PREFIX}.`);
    content = content.replace(/command: ['"]claude-code-chat\./g, `command: '${NEW_COMMAND_PREFIX}.`);
    content = content.replace(/registerWebviewViewProvider\(['"]claude-code-chat\./g, `registerWebviewViewProvider('${NEW_COMMAND_PREFIX}.`);

    // Replace other string references
    content = content.replace(/claude-code-chat-permissions/g, 'multiAgentChat-permissions');
    content = content.replace(/claude-code-chat-images/g, 'multiAgentChat-images');

    // Only write if content changed
    if (content !== originalContent) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`✅ Updated ${filePath}`);
    } else {
        console.log(`⏭️  No changes needed in ${filePath}`);
    }
});

console.log('\n🎉 Branding update complete!');
console.log('Next steps:');
console.log('1. Run "npm run compile" to check for any TypeScript errors');
console.log('2. Test the extension to ensure all functionality works');
console.log('3. Update any documentation or README files');