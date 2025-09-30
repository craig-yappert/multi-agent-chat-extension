# Multi-Agent Chat Architecture Redesign

## Current Problems

1. **Sequential Bottleneck**: Claude CLI calls are queued to prevent file locks, causing 6 agents × 20-30s = 120-180s total response time
2. **Timeout Cascade**: HTTP API times out at 30s, but requests continue processing for 60-120+ seconds
3. **No Cancellation**: Timed-out requests continue consuming resources
4. **Team Overload**: Every team query attempts to contact all 6 agents
5. **Poor User Feedback**: Users wait minutes with no progress indication

## Proposed Architecture

### 1. Parallel Processing with Connection Pool

Instead of sequential Claude CLI calls, implement a connection pool:

```typescript
class ClaudeConnectionPool {
    private maxConnections = 3; // Configurable
    private connections: Map<string, ChildProcess> = new Map();
    private queue: RequestQueue[] = [];

    async execute(request: Request): Promise<Response> {
        // Acquire connection from pool
        const conn = await this.acquire();
        try {
            return await this.processWithConnection(conn, request);
        } finally {
            this.release(conn);
        }
    }
}
```

### 2. Smart Agent Selection

For team queries, intelligently select 2-3 most relevant agents instead of all 6:

```typescript
class SmartAgentSelector {
    selectAgents(message: string, maxAgents = 3): Agent[] {
        // Analyze message content
        const keywords = this.extractKeywords(message);

        // Score agents by relevance
        const scores = agents.map(agent => ({
            agent,
            score: this.calculateRelevance(agent, keywords)
        }));

        // Return top N agents
        return scores
            .sort((a, b) => b.score - a.score)
            .slice(0, maxAgents)
            .map(s => s.agent);
    }
}
```

### 3. WebSocket-Based Real-Time Updates

Use WebSocket for progress streaming instead of waiting for complete responses:

```typescript
// Client side
ws.on('agent-progress', (data) => {
    updateStatusBar(`${data.agent}: ${data.status}`);
});

ws.on('agent-chunk', (data) => {
    appendToResponse(data.agent, data.chunk);
});

// Server side
class AgentProcessor {
    async processWithProgress(agent: Agent, message: string) {
        ws.send('agent-progress', { agent: agent.id, status: 'starting' });

        const stream = await this.startStreaming(agent, message);
        stream.on('data', chunk => {
            ws.send('agent-chunk', { agent: agent.id, chunk });
        });

        stream.on('end', () => {
            ws.send('agent-progress', { agent: agent.id, status: 'complete' });
        });
    }
}
```

### 4. Request Cancellation & Cleanup

Implement proper request lifecycle management:

```typescript
class RequestManager {
    private activeRequests: Map<string, AbortController> = new Map();

    async sendRequest(id: string, message: string): Promise<Response> {
        const controller = new AbortController();
        this.activeRequests.set(id, controller);

        try {
            return await this.process(message, controller.signal);
        } finally {
            this.activeRequests.delete(id);
        }
    }

    cancelRequest(id: string) {
        const controller = this.activeRequests.get(id);
        if (controller) {
            controller.abort();
            // Clean up any child processes
            this.cleanupResources(id);
        }
    }
}
```

### 5. Tiered Response Strategy

Implement progressive enhancement with fallbacks:

```typescript
class TieredResponseStrategy {
    async getResponse(message: string, agent: Agent): Promise<Response> {
        // Tier 1: Cache (instant)
        const cached = await this.checkCache(message, agent);
        if (cached) return cached;

        // Tier 2: Fast local model (1-2s)
        if (await this.isSimpleQuery(message)) {
            return this.getLocalResponse(message, agent);
        }

        // Tier 3: WebSocket API (5-10s)
        try {
            return await this.getWebSocketResponse(message, agent, { timeout: 10000 });
        } catch (e) {
            // Tier 4: Direct Claude CLI (15-30s)
            return await this.getClaudeResponse(message, agent, { timeout: 30000 });
        }
    }
}
```

## Implementation Plan

### Phase 1: Immediate Fixes (v1.7.0)
- [x] Fix status bar layout
- [ ] Implement request cancellation
- [ ] Add WebSocket progress updates
- [ ] Reduce default timeouts

### Phase 2: Smart Selection (v1.8.0)
- [ ] Implement SmartAgentSelector
- [ ] Add relevance scoring
- [ ] Configure max agents per query
- [ ] Add user preference learning

### Phase 3: Connection Pool (v1.9.0)
- [ ] Build ClaudeConnectionPool
- [ ] Implement parallel processing
- [ ] Add connection health monitoring
- [ ] Handle connection failures gracefully

### Phase 4: Progressive Enhancement (v2.0.0)
- [ ] Implement tiered response strategy
- [ ] Add local model integration
- [ ] Enhance caching with TTL and invalidation
- [ ] Add response quality indicators

## Configuration Changes

```json
{
  "claudeCodeChat.performance.maxConcurrentAgents": 3,
  "claudeCodeChat.performance.smartAgentSelection": true,
  "claudeCodeChat.performance.progressiveResponses": true,
  "claudeCodeChat.performance.connectionPoolSize": 3,
  "claudeCodeChat.performance.requestTimeout": 15000,
  "claudeCodeChat.performance.enableStreaming": true,
  "claudeCodeChat.performance.cacheStrategy": "aggressive"
}
```

## Expected Improvements

- **Response Time**: 120-180s → 15-30s for team queries
- **First Response**: 60s → 2-5s with progressive enhancement
- **Resource Usage**: 6 parallel CLI processes → 3 max
- **User Experience**: Dead waiting → Live progress updates
- **Reliability**: Timeout cascades → Graceful degradation

## Migration Strategy

1. Keep existing code paths as fallback
2. Add feature flags for new functionality
3. Gradually migrate users with opt-in
4. Monitor metrics and adjust
5. Remove legacy code after validation