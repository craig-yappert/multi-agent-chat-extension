const fs = require('fs');
const path = require('path');

const extensionPath = path.join(__dirname, '..', 'src', 'extension.ts');
let content = fs.readFileSync(extensionPath, 'utf8');

// Remove dismissWSLAlert case
content = content.replace(/case 'dismissWSLAlert':\s*this\._dismissWSLAlert\(\);\s*break;/g, '');

// Remove WSL configuration checks and related code blocks
// This regex matches WSL config blocks and their conditional code
content = content.replace(/const wslEnabled = config\.get<boolean>\('wsl\.enabled', false\);[\s\S]*?if \(wslEnabled\) \{[\s\S]*?\} else \{/g, '// WSL removed\n\t\tif (true) {');

// Clean up standalone WSL config lines
content = content.replace(/const wslEnabled = .*\n/g, '');
content = content.replace(/const wslDistro = .*\n/g, '');
content = content.replace(/const nodePath = .*\n/g, '');
content = content.replace(/const claudePath = .*\n/g, '');

// Remove WSL from getSystemInfo
content = content.replace(/'wsl\.enabled':.*\n/g, '');
content = content.replace(/'wsl\.distro':.*\n/g, '');
content = content.replace(/'wsl\.nodePath':.*\n/g, '');
content = content.replace(/'wsl\.claudePath':.*\n/g, '');
content = content.replace(/wslEnabled: wslEnabled.*\n/g, '');
content = content.replace(/wslAlertDismissed:.*\n/g, '');

// Remove convertToWSLPath calls
content = content.replace(/this\.convertToWSLPath\((.*?)\)/g, '$1');

// Clean up empty case statements
content = content.replace(/case 'dismissWSLAlert':\s*break;/g, '');

fs.writeFileSync(extensionPath, content);
console.log('✅ Removed WSL references from extension.ts');