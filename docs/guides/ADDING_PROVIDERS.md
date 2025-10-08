# Adding New Providers - Developer Guide

This guide explains how to add support for new AI providers to Multi Agent Chat.

## Overview

The extension supports three types of providers:

1. **CLI Providers:** Uses a command-line tool (e.g., `claude`)
2. **VS Code LM Providers:** Uses VS Code's Language Model API
3. **HTTP Providers:** Makes direct HTTP API calls

Most new providers will be **HTTP providers**.

---

## Quick Add: OpenAI-Compatible Providers

If the provider uses the OpenAI chat completions format, you only need to edit JSON!

### Step 1: Add to `defaults/providers.json`

```json
{
  "providers": {
    "your-provider": {
      "type": "http",
      "displayName": "Your Provider Name",
      "vendor": "your-vendor",
      "description": "Description of the provider",
      "baseUrl": "https://api.yourprovider.com/v1",
      "chatEndpoint": "/chat/completions",
      "authHeader": "Authorization",
      "authFormat": "Bearer {apiKey}",
      "requestFormat": "openai-chat",
      "responseFormat": "openai-chat",
      "documentation": "https://docs.yourprovider.com",
      "supports": [
        "model-id-1",
        "model-id-2"
      ]
    }
  }
}
```

### Step 2: Add models to `defaults/models.json`

```json
{
  "providers": {
    "your-provider": {
      "displayName": "Your Provider",
      "models": [
        {
          "id": "model-id-1",
          "displayName": "Model Name",
          "description": "Model description",
          "contextWindow": 128000,
          "maxOutput": 4096,
          "capabilities": ["text", "code"],
          "tags": ["latest"]
        }
      ]
    }
  }
}
```

### Step 3: Update `ProviderManager.ts`

Add your provider to the switch statement in `getProvider()`:

```typescript
case 'your-provider':
    return this.getHttpProvider(selection.providerId, selection.config);
```

**That's it!** The `OpenAIHttpProvider` will handle the requests automatically.

---

## Custom Format Providers

If the provider uses a custom API format (like Google Gemini), you need to create a provider class.

### Step 1: Create Provider Class

Create `src/providers/YourProviderHttpProvider.ts`:

```typescript
import { HttpProvider } from './HttpProvider';
import { AgentConfig } from '../agents';

export class YourProviderHttpProvider extends HttpProvider {
    /**
     * Build request body in your provider's format
     */
    protected buildRequestBody(message: string, agentConfig: AgentConfig, context?: any): any {
        // Convert to your provider's format
        return {
            // Your provider's request structure
            messages: [
                { role: 'user', content: message }
            ]
        };
    }

    /**
     * Parse response from your provider's format
     */
    protected parseResponse(response: any): string {
        // Extract text from your provider's response
        return response.output.text.trim();
    }
}
```

### Step 2: Add to `providers.json`

```json
{
  "your-provider": {
    "type": "http",
    "displayName": "Your Provider",
    "vendor": "your-vendor",
    "description": "Custom format provider",
    "baseUrl": "https://api.yourprovider.com",
    "chatEndpoint": "/generate",
    "authHeader": "X-API-Key",
    "authFormat": "{apiKey}",
    "requestFormat": "custom",
    "responseFormat": "custom",
    "supports": ["model-1", "model-2"]
  }
}
```

### Step 3: Update `ProviderManager.ts`

Import and use your provider:

```typescript
import { YourProviderHttpProvider } from './providers/YourProviderHttpProvider';

// In getHttpProvider():
if (config.vendor === 'your-vendor') {
    provider = new YourProviderHttpProvider(config, this.context);
} else {
    // OpenAI-compatible fallback
    provider = new OpenAIHttpProvider(config, this.context);
}
```

---

## CLI Providers

To add a CLI-based provider:

### Step 1: Add to `providers.json`

```json
{
  "your-cli": {
    "type": "cli",
    "displayName": "Your CLI Provider",
    "vendor": "your-vendor",
    "description": "Uses your-cli command",
    "command": "your-cli",
    "documentation": "https://docs.yourprovider.com/cli",
    "supports": ["model-1", "model-2"]
  }
}
```

### Step 2: Create Provider Class

Create `src/providers/YourCliProvider.ts`:

```typescript
import * as vscode from 'vscode';
import * as cp from 'child_process';
import { AIProvider } from '../providers';
import { AgentConfig } from '../agents';

export class YourCliProvider implements AIProvider {
    constructor(private context: vscode.ExtensionContext) {}

    async sendMessage(message: string, agentConfig: AgentConfig, context?: any): Promise<string> {
        return new Promise((resolve, reject) => {
            const process = cp.spawn('your-cli', ['--model', agentConfig.model || 'default'], {
                shell: true,
                stdio: ['pipe', 'pipe', 'pipe']
            });

            if (process.stdin) {
                process.stdin.write(message + '\n');
                process.stdin.end();
            }

            let output = '';
            process.stdout?.on('data', (data) => {
                output += data.toString();
            });

            process.on('close', (code) => {
                if (code === 0) {
                    resolve(output.trim());
                } else {
                    reject(new Error(`CLI failed with code ${code}`));
                }
            });
        });
    }
}
```

### Step 3: Wire Up in `ProviderManager`

```typescript
import { YourCliProvider } from './providers/YourCliProvider';

// In constructor:
private yourCliProvider?: YourCliProvider;

// In getProvider():
case 'your-cli':
    if (!this.yourCliProvider) {
        this.yourCliProvider = new YourCliProvider(this.context);
    }
    return this.yourCliProvider;
```

---

## API Key Management

### For OpenAI-Compatible Keys

If your provider uses the same key format as OpenAI, update `ApiKeyManager.ts`:

```typescript
// Add mapping in getApiKey():
const keyMap: Record<string, 'claude' | 'openai'> = {
    'openai': 'openai',
    'your-provider': 'openai',  // Reuse OpenAI key slot
    'xai': 'openai'
};
```

### For Provider-Specific Keys

To add a dedicated key storage:

1. **Update `ApiKeyManager.ts`:**

```typescript
private readonly SECRET_KEYS = {
    claude: 'multiAgentChat.apiKeys.claude',
    openai: 'multiAgentChat.apiKeys.openai',
    yourProvider: 'multiAgentChat.apiKeys.yourProvider'  // Add this
};
```

2. **Update `getApiKey()` to accept new type:**

```typescript
public async getApiKey(provider: 'claude' | 'openai' | 'yourProvider'): Promise<string | undefined>
```

3. **Update the setup command to include your provider.**

---

## Testing Your Provider

### 1. Test Compilation

```bash
npm run compile
```

### 2. Test Provider Selection

Add logging to see which provider is selected:

```typescript
console.log(`[ProviderRegistry] Selected provider '${providerId}' for model '${modelId}'`);
```

### 3. Test with Extension

1. Press `F5` to launch Extension Development Host
2. Open Multi Agent Chat
3. Send a test message
4. Check Debug Console for provider logs

### 4. Test Error Handling

Try these scenarios:
- No API key configured
- Invalid API key
- Network disconnected
- Invalid model ID
- API rate limiting

---

## Provider Preference Configuration

To add your provider to a preference priority list, update `defaults/providers.json`:

```json
{
  "preferences": {
    "custom-preference": {
      "description": "Prefer your provider first",
      "priority": ["your-provider", "claude-cli", "openai"]
    }
  }
}
```

Then users can select it via:
```json
{
  "multiAgentChat.providerPreference": "custom-preference"
}
```

---

## Common Patterns

### Authentication Header Formats

```json
// Bearer token (OpenAI, Anthropic)
{
  "authHeader": "Authorization",
  "authFormat": "Bearer {apiKey}"
}

// API key header (some providers)
{
  "authHeader": "X-API-Key",
  "authFormat": "{apiKey}"
}

// Custom prefix
{
  "authHeader": "Authorization",
  "authFormat": "Token {apiKey}"
}
```

### Query Parameter Auth (like Google)

Override `sendMessage()` to add query params:

```typescript
const baseUrl = this.buildUrl(agentConfig.model || 'default');
const url = `${baseUrl}?key=${apiKey}`;
```

### Streaming Responses

For providers that support streaming:

```typescript
protected async makeStreamingRequest(url: string, headers: any, body: any, onChunk: (text: string) => void): Promise<string> {
    // Implementation depends on provider's streaming format
    // See OpenAI's SSE format for reference
}
```

---

## Checklist for New Providers

- [ ] Add provider config to `defaults/providers.json`
- [ ] Add models to `defaults/models.json`
- [ ] Create provider class (if custom format)
- [ ] Update `ProviderManager.getProvider()`
- [ ] Update `ProviderManager.getHttpProvider()` (if HTTP)
- [ ] Test compilation (`npm run compile`)
- [ ] Test in Extension Development Host
- [ ] Document in `USER_GUIDE_PROVIDERS.md`
- [ ] Update this guide with any new patterns

---

## Examples in Codebase

**OpenAI-compatible:** `src/providers/OpenAIHttpProvider.ts`
- Used by: OpenAI, xAI Grok
- Simple request/response mapping

**Custom format:** `src/providers/GoogleHttpProvider.ts`
- Google Gemini API format
- Query parameter authentication
- Custom message structure

**CLI-based:** `src/providers.ts` (ClaudeProvider)
- Spawns `claude` command
- Handles process I/O
- Process management

---

## Getting Help

- Check existing providers for examples
- Read `ProviderRegistry.ts` for selection logic
- See `HttpProvider.ts` for base functionality
- Ask in GitHub Issues: https://github.com/craig-yappert/multi-agent-chat-extension/issues
