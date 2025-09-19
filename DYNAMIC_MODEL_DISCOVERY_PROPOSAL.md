# Dynamic Model Discovery Architecture Proposal

## Executive Summary
Transform the Multi Agent Chat extension from using a static, hardcoded list of AI models to a dynamic system that automatically discovers and updates available models from multiple providers through their APIs.

## Current State Analysis

### Current Implementation
- **Static Model List**: Models are hardcoded as strings (`'sonnet'`, `'opus'`, etc.)
- **Provider Configuration**: Fixed provider types (`'claude'`, `'openai'`, `'local'`, `'mcp'`, `'multi'`)
- **No Model Discovery**: No mechanism to detect newly released models
- **Manual Updates Required**: Extension must be updated and republished for new models

### Limitations
1. Cannot automatically detect new model releases
2. Users cannot use custom/local models without code modification
3. No visibility into model capabilities, pricing, or availability
4. Maintenance burden for keeping model lists current

## Proposed Architecture

### Core Components

#### 1. Model Registry Service
```typescript
interface ModelInfo {
  id: string;                    // Unique identifier
  name: string;                   // Display name
  provider: string;               // Provider name
  capabilities: string[];         // ['chat', 'code', 'vision', etc.]
  contextWindow: number;          // Max tokens
  pricing?: {
    input: number;               // Cost per million tokens
    output: number;
  };
  status: 'available' | 'deprecated' | 'offline';
  lastUpdated: Date;
  metadata?: Record<string, any>;
}

class ModelRegistry {
  private models: Map<string, ModelInfo>;
  private providers: Map<string, ModelProvider>;

  async refreshModels(): Promise<void>;
  async getModels(filter?: ModelFilter): Promise<ModelInfo[]>;
  async getModelById(id: string): Promise<ModelInfo | undefined>;
}
```

#### 2. Provider Adapters
Each provider implements a common interface for model discovery:

```typescript
interface ModelProvider {
  name: string;
  enabled: boolean;

  // Discovery methods
  async listModels(): Promise<ModelInfo[]>;
  async getModelDetails(modelId: string): Promise<ModelInfo>;
  async checkAvailability(modelId: string): Promise<boolean>;

  // Optional: Real-time updates
  onModelAdded?: (model: ModelInfo) => void;
  onModelRemoved?: (modelId: string) => void;
  onModelUpdated?: (model: ModelInfo) => void;
}
```

### Implementation Details

#### Provider-Specific Implementations

##### 1. Hugging Face Provider
```typescript
class HuggingFaceProvider implements ModelProvider {
  private api = new HfApi();

  async listModels(): Promise<ModelInfo[]> {
    const models = await this.api.list_models({
      task: 'text-generation',
      library: 'transformers',
      limit: 100
    });

    return models.map(m => this.convertToModelInfo(m));
  }
}
```

**API Endpoint**: `https://huggingface.co/api/models`
- Supports filtering by task, library, author
- Returns comprehensive metadata
- Free API access, no authentication required for public models

##### 2. Ollama Provider
```typescript
class OllamaProvider implements ModelProvider {
  async listModels(): Promise<ModelInfo[]> {
    const response = await fetch('http://localhost:11434/api/tags');
    const data = await response.json();

    return data.models.map(m => ({
      id: m.name,
      name: m.name,
      provider: 'ollama',
      capabilities: this.inferCapabilities(m),
      contextWindow: this.parseContextWindow(m.details),
      status: 'available',
      lastUpdated: new Date(m.modified_at)
    }));
  }
}
```

**API Endpoint**: `http://localhost:11434/api/tags`
- Lists locally available models
- Includes size, format, and modification time
- Real-time availability status

##### 3. OpenRouter Provider
```typescript
class OpenRouterProvider implements ModelProvider {
  async listModels(): Promise<ModelInfo[]> {
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: { 'Authorization': `Bearer ${this.apiKey}` }
    });

    const data = await response.json();
    return data.data.map(m => this.convertToModelInfo(m));
  }
}
```

**API Endpoint**: `https://openrouter.ai/api/v1/models`
- Returns 400+ models from multiple providers
- Includes pricing, context length, supported parameters
- Cached at edge for performance

##### 4. OpenAI Provider
```typescript
class OpenAIProvider implements ModelProvider {
  async listModels(): Promise<ModelInfo[]> {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: { 'Authorization': `Bearer ${this.apiKey}` }
    });

    const data = await response.json();
    return data.data
      .filter(m => m.id.includes('gpt'))
      .map(m => this.convertToModelInfo(m));
  }
}
```

**API Endpoint**: `https://api.openai.com/v1/models`
- Lists all available models
- Requires filtering for relevant models
- Includes ownership and permission data

##### 5. Anthropic/Claude Provider
```typescript
class AnthropicProvider implements ModelProvider {
  // Note: Anthropic doesn't provide a list endpoint
  // Models must be maintained manually or via web scraping
  private knownModels = [
    'claude-opus-4-1-20250805',
    'claude-sonnet-4-20250514',
    // ... other models
  ];

  async listModels(): Promise<ModelInfo[]> {
    // Could potentially scrape from docs or maintain manually
    return this.knownModels.map(id => this.createModelInfo(id));
  }
}
```

**Note**: Anthropic doesn't provide a public model listing API. Options:
1. Maintain a curated list with periodic manual updates
2. Scrape documentation pages (fragile)
3. Use community-maintained registries

### Caching & Persistence

```typescript
class ModelCache {
  private cache: Map<string, CacheEntry>;
  private storage: vscode.Memento;

  async get(provider: string): Promise<ModelInfo[] | undefined> {
    const entry = this.cache.get(provider);
    if (entry && !this.isExpired(entry)) {
      return entry.models;
    }
    return undefined;
  }

  async set(provider: string, models: ModelInfo[]): Promise<void> {
    this.cache.set(provider, {
      models,
      timestamp: Date.now(),
      ttl: this.getTTL(provider)
    });
    await this.persistToStorage();
  }

  private getTTL(provider: string): number {
    // Different TTL for different providers
    switch(provider) {
      case 'ollama': return 60 * 1000;        // 1 minute (local)
      case 'huggingface': return 3600 * 1000;  // 1 hour
      case 'openrouter': return 1800 * 1000;   // 30 minutes
      default: return 600 * 1000;              // 10 minutes
    }
  }
}
```

### User Interface Updates

#### 1. Model Selection UI
```typescript
interface ModelSelectorOptions {
  providers?: string[];           // Filter by providers
  capabilities?: string[];        // Filter by capabilities
  showPricing?: boolean;          // Display pricing info
  showStatus?: boolean;           // Show availability status
  groupByProvider?: boolean;      // Group models by provider
}

class ModelSelector {
  async showQuickPick(options?: ModelSelectorOptions): Promise<ModelInfo | undefined> {
    const models = await this.registry.getModels(options);

    const items = models.map(m => ({
      label: `$(${this.getIcon(m.provider)}) ${m.name}`,
      description: `${m.provider} - ${m.contextWindow} tokens`,
      detail: m.pricing ?
        `$${m.pricing.input}/$${m.pricing.output} per 1M tokens` :
        'Pricing unavailable',
      model: m
    }));

    const selected = await vscode.window.showQuickPick(items);
    return selected?.model;
  }
}
```

#### 2. Settings Integration
```json
{
  "multiAgentChat.modelDiscovery.enabled": true,
  "multiAgentChat.modelDiscovery.providers": {
    "huggingface": {
      "enabled": true,
      "filters": {
        "task": "text-generation",
        "minLikes": 100
      }
    },
    "ollama": {
      "enabled": true,
      "endpoint": "http://localhost:11434"
    },
    "openrouter": {
      "enabled": true,
      "apiKey": "${OPENROUTER_API_KEY}"
    },
    "openai": {
      "enabled": true,
      "apiKey": "${OPENAI_API_KEY}"
    },
    "anthropic": {
      "enabled": true,
      "updateMode": "manual"
    }
  },
  "multiAgentChat.modelDiscovery.refreshInterval": 3600000,
  "multiAgentChat.modelDiscovery.cacheEnabled": true
}
```

### Migration Strategy

#### Phase 1: Foundation (Week 1)
1. Implement ModelRegistry core
2. Create provider interface
3. Add caching layer
4. Implement Ollama provider (simplest)

#### Phase 2: Provider Integration (Week 2)
1. Implement HuggingFace provider
2. Implement OpenRouter provider
3. Implement OpenAI provider
4. Add Anthropic manual registry

#### Phase 3: UI Integration (Week 3)
1. Update agent configuration UI
2. Add model selector component
3. Integrate with settings
4. Add model refresh command

#### Phase 4: Polish & Testing (Week 4)
1. Error handling and fallbacks
2. Performance optimization
3. Documentation
4. Migration guides for users

### Benefits

1. **Automatic Updates**: New models available without extension updates
2. **Provider Flexibility**: Support for multiple model sources
3. **Custom Models**: Users can use local/custom models via Ollama
4. **Better UX**: Rich model information (pricing, capabilities, status)
5. **Reduced Maintenance**: No need to manually track model releases
6. **Extensibility**: Easy to add new providers

### Considerations

1. **API Rate Limits**: Implement appropriate caching and throttling
2. **API Keys**: Some providers require authentication
3. **Network Dependency**: Fallback to cached/default models offline
4. **Performance**: Cache aggressively to avoid startup delays
5. **Breaking Changes**: Maintain backward compatibility with existing configs

### Example Usage

```typescript
// Before: Static model selection
const agent = {
  provider: 'claude',
  model: 'sonnet'  // Hardcoded string
};

// After: Dynamic model selection
const modelRegistry = new ModelRegistry();
await modelRegistry.refreshModels();

const models = await modelRegistry.getModels({
  providers: ['claude', 'openai'],
  capabilities: ['code-generation'],
  maxPrice: 10.0  // Max $10 per million tokens
});

const selectedModel = await vscode.window.showQuickPick(
  models.map(m => ({
    label: m.name,
    description: `${m.provider} - $${m.pricing?.input}/M tokens`,
    model: m
  }))
);

const agent = {
  provider: selectedModel.model.provider,
  model: selectedModel.model.id
};
```

## Implementation Priority

### High Priority
1. **Ollama Integration** - Local models, simple API
2. **OpenRouter Integration** - Access to 400+ models
3. **Model Registry Core** - Foundation for all providers

### Medium Priority
1. **HuggingFace Integration** - Large model ecosystem
2. **OpenAI Integration** - Popular models
3. **UI Components** - Enhanced user experience

### Low Priority
1. **Anthropic Scraping** - Complex, fragile
2. **Real-time Updates** - Nice-to-have
3. **Advanced Filtering** - Can be added later

## Next Steps

1. Review and approve architecture proposal
2. Create feature branch for implementation
3. Start with ModelRegistry core and Ollama provider
4. Iterate based on testing and feedback
5. Document migration path for users

## Alternative Approaches Considered

### 1. Static Registry with Auto-Updates
- Maintain a central registry file that's periodically updated
- Pros: Simple, no API dependencies
- Cons: Still requires manual updates, delayed model availability

### 2. Community-Maintained Registry
- Use a shared GitHub repo or API for model listings
- Pros: Community-driven, comprehensive
- Cons: External dependency, trust issues

### 3. Plugin System for Providers
- Allow third-party provider plugins
- Pros: Maximum extensibility
- Cons: Complex, security concerns

## Conclusion

The dynamic model discovery system will transform the Multi Agent Chat extension from a static, maintenance-heavy system to a dynamic, self-updating platform that automatically adapts to the rapidly evolving AI model landscape. By implementing provider-specific adapters and a robust caching strategy, we can provide users with immediate access to new models while maintaining performance and reliability.