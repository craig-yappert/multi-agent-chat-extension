# TODO Next Session - Multi Agent Chat Extension

## Monday 2025-09-30: Control & Transparency Implementation

### 🎯 Primary Goal
Transform from "hidden bureaucracy" to "transparent orchestra with user as conductor"

### 📋 Implementation Plan
**Full details in**: `docs/proposals/IMPLEMENTATION_PLAN_2025_09_30_ENHANCED.md`

## Monday Morning Tasks (Quick Wins)

### 1. Toolbar Cleanup (30 mins)
- [ ] Convert all buttons to icons only
- [ ] Add tooltips to all buttons
- [ ] Consistent styling
- [ ] Add STOP button icon to toolbar

### 2. STOP Button Implementation (2 hours)
- [ ] Add emergency stop functionality
- [ ] Clear message queues
- [ ] Reset agent states
- [ ] Visual feedback
- [ ] Keyboard shortcut: `Ctrl+Shift+S`

### 3. Workflow Mode Selector (1.5 hours)
- [ ] Add dropdown to toolbar
- [ ] Implement modes: DIRECT, REVIEW, BRAINSTORM, AUTO
- [ ] Visual indicator of current mode
- [ ] Hook up to message routing

## Monday Afternoon Tasks (Core Features)

### 4. Graduated Controls (2 hours)
- [ ] Implement control levels: STOP, PAUSE, SIMPLIFY, REDIRECT
- [ ] Add UI buttons with distinct colors
- [ ] Keyboard shortcuts for each level
- [ ] State management

### 5. Visible Inter-Agent Messages (2 hours)
- [ ] Route agent messages to main chat
- [ ] Distinct visual styling (indented, lighter)
- [ ] Arrow notation: `📝 → 🏗️`
- [ ] No redundant context

### 6. Timestamps & Collapsible Messages (1.5 hours)
- [ ] Add timestamps to all messages
- [ ] Relative time display
- [ ] Implement expand/collapse for >500 chars
- [ ] Smart truncation

## Tuesday Tasks (Advanced Features)

### 7. Serial-Parallel-Serial Workflow
- [ ] Implement SPS pattern
- [ ] Visual progress indicator
- [ ] Phase transitions

### 8. Two-Phase Response System
- [ ] Phase 1: Immediate acknowledgment
- [ ] Phase 2: Full response with metrics
- [ ] Cost/token display

### 9. Begin Capability Refactor
- [ ] Start moving from personas to capabilities
- [ ] Test with simple tasks first

## Testing Before Starting

### Pre-Session Checklist
- [ ] Install latest VSIX (2.89 MB from 2025-09-29)
- [ ] Set `multiAgentChat.interAgentComm.maxMessagesPerConversation` to 50
- [ ] Open developer console for debug logs
- [ ] Test basic @mention between agents
- [ ] Verify file operations work for all agents

### What Should Be Working Now
- ✅ Inter-agent communication via @mentions
- ✅ Debug logging with clear message flow
- ✅ Context preservation through message chain
- ✅ File operations for all agents

### Known Issues to Address
- ⚠️ Runaway conversations (hence STOP button)
- ⚠️ Hidden inter-agent messages (hence visibility)
- ⚠️ Agent personas override user intent (hence capabilities)
- ⚠️ No user control during execution (hence graduated controls)

## Key Files to Modify

### Priority Files (Monday)
1. `src/ui.ts` - Toolbar buttons
2. `src/uiStyles.ts` - New CSS styles
3. `src/script.ts` - Client-side logic
4. `src/extension.ts` - Stop button handler
5. `src/agentCommunication.ts` - Message broadcasting

### Secondary Files (Tuesday)
6. `src/providers.ts` - Workflow modes
7. `src/agents.ts` - Capability refactor
8. `src/types/` - New type definitions

## Success Metrics

### End of Day 1 (Monday)
- [ ] User can STOP runaway conversations
- [ ] User can see inter-agent messages
- [ ] User can choose workflow mode
- [ ] Messages have timestamps
- [ ] Long messages are collapsible

### End of Day 2 (Tuesday)
- [ ] SPS workflow operational
- [ ] Two-phase responses working
- [ ] Cost tracking visible
- [ ] Basic capability system started

## Philosophy Reminders

### Core Principles
1. **Control > Speed**: User authority is paramount
2. **Transparency > Efficiency**: See everything
3. **Tools > Personalities**: Agents serve, not debate
4. **Cost > Speed**: 3 minutes is fine
5. **Graduated > Binary**: Multiple intervention levels

### The Vision
Transform the experience from "managing a dysfunctional team" to "conducting an orchestra with a dimmer switch"

## Reference Documents

### Proposals Created This Session
- `docs/proposals/AGENT_PERMISSIONS_PROPOSAL.md` - Trust model
- `docs/proposals/INTER_AGENT_UX_PROPOSAL.md` - UX redesign
- `docs/proposals/IMPLEMENTATION_PLAN_2025_09_30.md` - Original plan
- `docs/proposals/IMPLEMENTATION_PLAN_2025_09_30_ENHANCED.md` - Enhanced plan

### Key Insights Document
See `SESSION_CONTEXT.md` for philosophical breakthroughs and test results

## Commands & Configuration

### Build & Test
```bash
# Compile
npm run compile

# Build VSIX
npx vsce package

# Install
code --install-extension multi-agent-chat-1.13.0.vsix

# Open console
Ctrl+Shift+I (Windows)
```

### Required Settings
```json
{
  "multiAgentChat.interAgentComm.maxMessagesPerConversation": 50,
  "multiAgentChat.agents.enableInterCommunication": true,
  "multiAgentChat.agents.showInterCommunication": true
}
```

## Risk Mitigation

### Potential Issues
1. **UI Performance**: Too many messages
   - Mitigation: Virtual scrolling, pagination

2. **User Overwhelm**: Too much visible
   - Mitigation: Progressive disclosure

3. **Breaking Changes**: Existing conversations
   - Mitigation: Backward compatibility

## Notes for Monday Morning

### Start With
1. Coffee ☕
2. Review this document
3. Read `IMPLEMENTATION_PLAN_2025_09_30_ENHANCED.md`
4. Begin with toolbar cleanup (quick win)
5. Test each change before moving to next

### Remember
- One feature at a time
- Test after each implementation
- Commit frequently
- User control is the goal

---

*Last Updated: 2025-09-29*
*Session Start: Monday 2025-09-30*
*Focus: User Control & Transparency*