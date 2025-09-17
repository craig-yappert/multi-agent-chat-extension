# Multi Agent Chat Extension - Next Session Todos

## Priority Tasks (In Order)

### 1. Inter-Agent Communication
- Enable agents to communicate directly with each other
- Implement message passing between agents
- Create coordination protocols for multi-agent workflows

### 2. New Chat and History Saving
- Implement proper session management
- Save conversation history
- Enable loading previous conversations
- Clear chat / New chat functionality

### 3. Settings Screen
- Create proper settings UI (currently minimal)
- Add loop conversation controls for inter-agent communication
- Agent preference configurations
- Model selection per agent (when other providers are ready)

### 4. Code Cleanup
- Remove old Claude Chat remnants
- Clean up unused styles from ui-styles.ts
- Remove hidden UI objects that are no longer needed
- Consolidate duplicate code

### 5. Agent Response Streaming
- Implement real-time output streaming
- Show responses as they're generated instead of all-at-once
- Add typing indicators for agents

### 6. Agent Specialization Refinement
- Fine-tune each agent's role context
- Improve specialized responses
- Add more specific capabilities per agent
- Optimize prompts for better agent differentiation

### 7. Custom Agent Creation
- Allow users to define their own agents
- Custom roles and capabilities
- Agent configuration UI
- Save/load custom agent definitions

### 8. Three-Tier Agent Memory System
- **Short-term memory**: Current conversation context
- **Long-term memory**: Cross-session learning and patterns
- **Project-specific memory**: Isolated contexts per project
  - Prevent context bleeding between projects
  - Project-aware agent responses

### 9. Real-time Agent Dashboard (Future - Complex)
- Visual workflow showing active agents
- Real-time status updates
- Agent interaction visualization
- *Note: Team previously built this - check pre-recovery docs if needed*

### 10. Error Recovery
- Better handling of Claude API failures
- Timeout recovery
- Retry logic with exponential backoff
- User-friendly error messages

### 11. Token Economy System (Future - Complex)
- Token usage tracking per agent
- Weighting system for agent responses
- Token budget management
- Usage analytics
- *Note: Previously implemented - check pre-recovery docs if needed*

## Notes
- Items #9 and #11 are marked as future work due to complexity and tendency to break things
- Focus on stability and core functionality first
- Test thoroughly after each major change to prevent regression

## Current State (v1.2.3)
- All agents using Claude Sonnet model
- Team agent properly coordinates all 6 specialized agents
- Visual agent identification with colors working
- All agents functional with real Claude backend
- No more placeholder responses or "coming soon" messages