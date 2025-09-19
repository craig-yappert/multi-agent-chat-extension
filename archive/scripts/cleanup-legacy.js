const fs = require('fs');
const path = require('path');

console.log('🧹 Starting legacy code cleanup...\n');

// 1. Remove MCP server directory
const mcpServerPath = path.join(__dirname, '..', 'src', 'mcp-server');
if (fs.existsSync(mcpServerPath)) {
    fs.rmSync(mcpServerPath, { recursive: true, force: true });
    console.log('✅ Removed MCP server directory');
} else {
    console.log('⏭️  MCP server directory already removed');
}

// 2. Remove MCP-related provider files
const mcpProviderPath = path.join(__dirname, '..', 'src', 'providers', 'mcpWebSocketProvider.ts');
if (fs.existsSync(mcpProviderPath)) {
    fs.unlinkSync(mcpProviderPath);
    console.log('✅ Removed mcpWebSocketProvider.ts');
}

// 3. Remove unused provider files
const unusedProviders = [
    'simpleWebSocketProvider.ts',
    'smartAgentSelector.ts',
    'superFastMode.ts',
    'fastTeamProvider.ts',
    'fastTeamProviderV2.ts',
    'improvedFastTeamProvider.ts',
    'adaptiveTimeoutProvider.ts'
];

unusedProviders.forEach(file => {
    const filePath = path.join(__dirname, '..', 'src', file);
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`✅ Removed ${file}`);
    }
});

// 4. Update package.json to remove MCP commands
const packageJsonPath = path.join(__dirname, '..', 'package.json');
let packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// Remove MCP commands
const mcpCommands = [
    'multi-agent-chat.startMCPServer',
    'multi-agent-chat.stopMCPServer',
    'multi-agent-chat.restartMCPServer',
    'multi-agent-chat.toggleMCPServer',
    'multi-agent-chat.showMCPServerLogs',
    'multi-agent-chat.validateMCPServer',
    'multi-agent-chat.mcpServerStatus'
];

packageJson.contributes.commands = packageJson.contributes.commands.filter(
    cmd => !mcpCommands.includes(cmd.command)
);

console.log(`✅ Removed ${mcpCommands.length} MCP commands from package.json`);

// Write updated package.json
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');

// 5. Clean up extension.ts
const extensionPath = path.join(__dirname, '..', 'src', 'extension.ts');
let extensionContent = fs.readFileSync(extensionPath, 'utf8');

// Remove MCP imports
extensionContent = extensionContent.replace(/import.*MCPServerManager.*\n/g, '');
extensionContent = extensionContent.replace(/import.*mcp-server.*\n/g, '');

// Remove MCP initialization (lines containing MCPServerManager)
extensionContent = extensionContent.replace(/.*MCPServerManager.*\n/g, '');
extensionContent = extensionContent.replace(/.*mcpServerManager.*\n/g, '');

// Remove WSL configuration listener
extensionContent = extensionContent.replace(/.*affectsConfiguration\('claudeCodeChat\.wsl'\)[\s\S]*?\}\);/g, '// WSL configuration removed');

// Remove WSL-related methods
// Note: This is complex and would need careful regex or AST manipulation
// For now, we'll mark them for manual removal

fs.writeFileSync(extensionPath, extensionContent);
console.log('✅ Cleaned MCP references from extension.ts');

console.log('\n📝 Manual cleanup needed in extension.ts:');
console.log('   - Remove convertToWSLPath method');
console.log('   - Remove _dismissWSLAlert method');
console.log('   - Remove WSL-related code in _spawnClaude method');
console.log('   - Remove WSL configuration from getSystemInfo');

console.log('\n🎉 Legacy cleanup complete!');
console.log('Next steps:');
console.log('1. Manually review extension.ts for WSL code removal');
console.log('2. Run "npm run compile" to check for errors');
console.log('3. Test the extension');