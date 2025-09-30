# Feature Proposals

**Status:** Active proposals for future development

---

## Active Proposals

### 🔥 High Priority

#### [Claude Code Parity Features](CLAUDE_CODE_PARITY_FEATURES.md)
**Status:** Planned for v1.15.0+
**Complexity:** High

Proposes three major features to match Claude Code's developer experience:
1. **Real-time Diff Viewer** - Preview file changes before accepting
2. **Checkpoint System** - Save snapshots and rollback changes
3. **Workflow Hooks** - Automation triggers for common patterns

**Next Steps:** Break into phases, implement diff viewer first

---

### ⚖️ Medium Priority

#### [Agent Permissions Redesign](AGENT_PERMISSIONS_PROPOSAL.md)
**Status:** Planned for v1.16.0+
**Complexity:** Medium

Proposes trust-with-verification permission model:
- Domain-based default permissions
- Rollback capability instead of prevention
- Reduces permission friction while maintaining safety

**Dependencies:** Should follow diff viewer implementation

---

### 🌟 Low Priority

#### [Dynamic Model Discovery](DYNAMIC_MODEL_DISCOVERY_PROPOSAL.md)
**Status:** Future enhancement
**Complexity:** Medium

Proposes auto-discovery of available AI models:
- Query providers for available models
- Dynamic model selection UI
- Reduce manual model configuration

**Note:** Deferred until core features are stable. AI model landscape is too volatile for this to be high value currently.

---

## Archived Proposals

Implemented proposals have been moved to `docs/archive/implemented/`:

- ✅ **External Resources Refactor** (v1.13.0) - Extracted webview to external files
- ✅ **Inter-Agent UX Polish** (v1.13.0) - Live inter-agent message display
- ✅ **Floating Chat UI** (v1.12.0) - Detachable chat window
- ✅ **Status Updates Feature** (v1.12.0) - Real-time agent communication status

---

## Submitting New Proposals

Create a new markdown file in this directory with:
1. **Problem Statement** - What user pain point does this solve?
2. **Proposed Solution** - High-level approach
3. **Technical Design** - Implementation details
4. **Acceptance Criteria** - How do we know it's done?
5. **Estimated Complexity** - Low/Medium/High

Use existing proposals as templates.

---

*Last Updated: 2025-09-30 (v1.13.0)*
