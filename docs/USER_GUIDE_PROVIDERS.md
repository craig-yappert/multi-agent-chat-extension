# Provider Setup Guide

Multi Agent Chat supports multiple AI providers with different setup methods. Choose the option that works best for you.

## Quick Start

**For most users:** If you have GitHub Copilot, just set `providerPreference` to `auto` and you're done!

**For Claude Max subscribers:** Keep the default `claude-cli` setting to use your subscription.

**For power users:** Use `direct-api` mode with your own API keys for full control.

---

## Provider Preference Options

Open VS Code settings and search for `multiAgentChat.providerPreference`:

### 1. `claude-cli` (Default)
**Best for:** Claude Max subscribers who want to maximize their subscription value

- Uses the Claude CLI tool (`claude` command)
- Requires Claude CLI to be installed and authenticated
- Direct access to your Claude Max plan
- **No additional API keys needed**

**Setup:**
```bash
# Install Claude CLI (if not already installed)
npm install -g @anthropic-ai/cli

# Login with your Claude account
claude login
```

### 2. `auto` (Recommended for Teams)
**Best for:** Teams who want the most accessible option for everyone

- Tries VS Code Language Model API first (free via Copilot)
- Falls back to Claude CLI if available
- Falls back to direct HTTP APIs if keys configured
- **Community-friendly default**

**Setup:**
- If you have GitHub Copilot: Nothing! It just works.
- If not: Install any VS Code AI extension (Copilot, Continue.dev, etc.)

### 3. `vscode-lm` (VS Code Only)
**Best for:** Users who only want to use VS Code's integrated AI models

- Only uses models from VS Code extensions
- Works with GitHub Copilot, Continue.dev, and similar extensions
- Will fail if no VS Code models are available
- **Strict mode for VS Code integration**

**Setup:**
1. Install GitHub Copilot extension (or Continue.dev, etc.)
2. Sign in to your account
3. Select this preference

### 4. `direct-api` (Power Users)
**Best for:** Users who want direct control with their own API keys

- Uses direct HTTP API calls to providers
- You provide API keys for each service
- No intermediary (CLI or VS Code extension)
- **Full control over which services you use**

**Setup:**
1. Get API keys from providers:
   - OpenAI: https://platform.openai.com/api-keys
   - Google Gemini: https://aistudio.google.com/app/apikey
   - xAI Grok: https://console.x.ai/
   - Anthropic: https://console.anthropic.com/

2. Add keys via Command Palette:
   ```
   Ctrl+Shift+P → "Multi Agent Chat: Manage API Keys"
   ```

---

## Supported Models by Provider

### Via Claude CLI (`claude-cli`)
- Claude Sonnet 4.5 (latest)
- Claude 3.5 Sonnet
- Claude 3.5 Haiku
- Claude 3 Opus

### Via VS Code (`vscode-lm` or `auto`)
**Available models depend on your installed extensions:**

- **GitHub Copilot:** GPT-4o, GPT-4o-mini, o1-preview, Claude 3.5 Sonnet
- **Continue.dev:** Any model configured in Continue
- **Other extensions:** Check their documentation

### Via Direct APIs (`direct-api`)
- **OpenAI:** GPT-4o, GPT-4o-mini, GPT-4 Turbo, GPT-3.5 Turbo
- **Google Gemini:** Gemini 2.5 Pro, 2.5 Flash, 2.0 Flash
- **xAI Grok:** Grok 4, Grok 4 Fast, Grok 3
- **Anthropic:** All Claude models (same as CLI)

---

## Comparison Table

| Feature | `claude-cli` | `auto` | `vscode-lm` | `direct-api` |
|---------|--------------|--------|-------------|--------------|
| **No API keys needed** | ✅ | ✅ (with Copilot) | ✅ (with Copilot) | ❌ |
| **Works offline** | ⚠️ (CLI only) | ❌ | ❌ | ❌ |
| **Multiple providers** | ❌ | ✅ | ✅ | ✅ |
| **Use Claude Max plan** | ✅ | ✅ (fallback) | ❌ | ❌ |
| **Free tier available** | ❌ | ✅ (Copilot) | ✅ (Copilot) | ✅ (Gemini) |
| **Setup complexity** | Low | Lowest | Low | Medium |

---

## Switching Providers

You can change providers at any time:

1. Open Settings: `Ctrl+,`
2. Search: `providerPreference`
3. Select your preferred option
4. Reload extension (if needed)

**Or** edit `.vscode/settings.json`:
```json
{
  "multiAgentChat.providerPreference": "auto"
}
```

---

## Troubleshooting

### "No provider available for model X"
- **`claude-cli`:** Make sure Claude CLI is installed and authenticated (`claude --version`)
- **`vscode-lm`:** Install GitHub Copilot or another AI extension
- **`direct-api`:** Add API keys via Command Palette

### "API key not configured"
- Run: `Ctrl+Shift+P` → "Multi Agent Chat: Manage API Keys"
- Or switch to `auto` mode to use VS Code models instead

### "VS Code Language Model requires user consent"
- A dialog will appear asking for permission
- Click "Allow" to enable VS Code model access
- This is a one-time permission per workspace

### Agent responses are slow
- `claude-cli`: CLI response time depends on Anthropic's servers
- `vscode-lm`: Speed depends on the underlying model (GPT-4o is fast)
- `direct-api`: Direct APIs are usually fastest

### Want to use different providers for different agents?
Currently, the preference applies to all agents. Per-agent provider selection is planned for a future release.

---

## Cost Comparison

**Free Options:**
- VS Code with GitHub Copilot (if you have a Copilot subscription)
- Google Gemini free tier (60 requests/minute)

**Paid Options:**
- Claude Max plan: ~$20/month (unlimited via CLI)
- OpenAI API: Pay-per-token (varies by model)
- Other APIs: Check provider pricing

---

## Best Practices

1. **For personal use:** Use `claude-cli` if you have Claude Max
2. **For team projects:** Use `auto` so teammates with Copilot can contribute
3. **For production:** Use `direct-api` with dedicated API keys for reliability
4. **For experimentation:** Use `vscode-lm` to try different models easily

---

## Next Steps

- [Adding New Providers (Developer Guide)](./ADDING_PROVIDERS.md)
- [Model Configuration Guide](../CLAUDE.md#model-configuration)
- [Agent Configuration Guide](../CLAUDE.md#agent-configuration)
