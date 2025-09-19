# Multi Agent Chat Extension - Next Session Todos

## Recently Completed (v1.13.0) ✅

### Major Architecture Changes

1. **Per-Project Settings System**
   - Implemented hierarchical settings (VS Code → Global → Project → Workspace)
   - Created SettingsManager for unified settings handling
   - Project settings stored in `.machat/config.json`
   - Settings auto-merge with proper precedence

2. **Project-Local Conversations**
   - ConversationManager handles local/global storage
   - Conversations stored in `.machat/conversations/`
   - Migration utilities for existing conversations
   - Automatic .gitignore for project folders

3. **Project Context Management**
   - ProjectContextManager for agent memory isolation
   - Project-specific prompts and documentation
   - Agent context scoped to projects

4. **Legacy Code Removal**
   - Removed entire MCP server infrastructure (~30KB)
   - Removed WSL support and configuration
   - Removed 8 unused provider files
   - Cleaned up WebSocket implementations

5. **Branding Unification**
   - Fixed all references from "claudeCodeChat" to "multiAgentChat"
   - Updated all command IDs and configurations
   - Consistent naming throughout extension

## Priority Tasks for Next Session

### 1. Dynamic Model Discovery System 🆕

**Goal:** Replace static model lists with dynamic discovery from provider APIs

- [ ] Implement ModelRegistry core service
- [ ] Create provider adapters (Ollama, OpenRouter, HuggingFace, OpenAI)
- [ ] Add caching layer with provider-specific TTLs
- [ ] Update UI to use discovered models
- [ ] Support for local models via Ollama

**Benefits:**
- Automatic detection of new models
- Support for 400+ models via OpenRouter
- Local model support through Ollama
- Real-time pricing and availability info

### 2. Settings UI Enhancement ✅ PARTIAL

- [x] Agent configuration cards implemented
- [x] Per-project settings working
- [ ] Visual refinement for compact layout
- [ ] Responsive design for different screen sizes
- [ ] Agent persona/prompt customization

### 3. Performance Optimization

- [ ] Implement smart agent selection based on query analysis
- [ ] Add response caching with TTL
- [ ] Optimize streaming for multiple agents
- [ ] Implement agent response timeout controls

### 4. Testing & Validation

- [ ] Test per-project settings isolation
- [ ] Verify conversation migration
- [ ] Validate agent memory boundaries
- [ ] Test with multiple workspaces

### 5. Documentation Update

- [ ] Update README with new features
- [ ] Create user guide for project settings
- [ ] Document agent customization
- [ ] Add troubleshooting guide

## Current State (v1.11.0)

### What's Working

- ✅ All agents functional with Claude backend
- ✅ Per-project settings architecture complete
- ✅ Project-local conversation storage
- ✅ Agent memory and context persistence
- ✅ File operations through Executor agent
- ✅ Team coordination with all 6 agents
- ✅ Clean, unified codebase without legacy code

### Known Issues

- ✅ ~~Settings UI only shows API Keys section~~ Fixed in v1.13.0
- Model lists are static and require manual updates
- Some performance settings not yet wired up
- Agent response synthesis could be improved

## Testing Checklist

1. **Project Settings**
   - [ ] Create `.machat` folder in new project
   - [ ] Verify settings cascade properly
   - [ ] Test project-specific API keys

2. **Conversation Storage**
   - [ ] Verify conversations save to project folder
   - [ ] Test migration from global storage
   - [ ] Confirm .gitignore works

3. **Agent Operations**
   - [ ] Test each specialized agent
   - [ ] Verify team coordination
   - [ ] Check memory isolation between projects

## Architecture Notes

```
Extension Structure:
├── src/
│   ├── settings/          # Settings management
│   ├── conversations/     # Conversation storage
│   ├── context/          # Project context
│   ├── agents.ts         # Agent definitions
│   ├── providers.ts      # AI providers (cleaned)
│   └── extension.ts      # Main extension
└── .machat/              # Project-local storage
    ├── config.json       # Project settings
    ├── conversations/    # Local conversations
    └── context/         # Agent memory
```

## Next Major Milestones

1. **v1.13.0** - ✅ Settings UI with Agent Configuration (COMPLETED)
2. **v1.14.0** - Dynamic Model Discovery
3. **v1.15.0** - Performance Optimizations
4. **v1.16.0** - Agent Personas & Templates
5. **v2.0.0** - Multi-workspace Support
