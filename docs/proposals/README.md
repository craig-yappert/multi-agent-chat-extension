# Feature Proposals

**Status:** Active proposals for future development

---

## Active Proposals

### 🔥 High Priority

#### [Agent Permissions System](AGENT_PERMISSIONS_PROPOSAL.md)
**Status:** Planned for v1.16.0
**Complexity:** Medium

Proposes 3-tier permission strategy:
1. **Tier 1:** Inherit from Claude Code (when installed) - zero config
2. **Tier 2:** Claude Agent SDK patterns (standalone mode)
3. **Tier 3:** Fallback defaults (safety net)

**Estimated Effort:** 6-8 hours

---

### ⚖️ Medium Priority (Deferred)

#### [Claude Code Parity Features](CLAUDE_CODE_PARITY_FEATURES.md)
**Status:** Deferred to v1.18.0+
**Complexity:** High

Proposes three major features to match Claude Code's developer experience:
1. **Real-time Diff Viewer** - Preview file changes before accepting (8-10 hours)
2. **Checkpoint System** - Save snapshots and rollback changes (4-5 hours)
3. **Workflow Hooks** - Automation triggers for common patterns (3-4 hours)

**Decision:** Focus on externalization first, evaluate these features after v1.17.0

**Total Effort:** 15-20 hours

---

## 📚 Strategic Evaluations

#### [Microsoft Agent Framework Evaluation](MICROSOFT_AGENT_FRAMEWORK_EVALUATION.md)
**Status:** Analysis Complete - No Adoption Recommended
**Date:** 2025-10-05

Comprehensive evaluation of Microsoft's new Agent Framework (unifying AutoGen + Semantic Kernel):

**Conclusion:** Do not adopt (runtime mismatch, wrong abstraction level)

**Value to Extract:**
- OpenTelemetry observability patterns (High Priority)
- Graph-based orchestration concepts
- A2A messaging standards
- Permission model improvements

**Key Insight:** We're building a VS Code-native coding assistant, they're building enterprise multi-agent infrastructure. Different problems require different solutions.

---

## Archived Proposals

Implemented proposals have been moved to `docs/archive/implemented/`:

- ✅ **External Model Configuration** (v1.15.0) - JSON-based model definitions with project overrides
- ✅ **External Agent Configuration** (v1.15.0) - JSON-based agent definitions with smart merging
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

*Last Updated: 2025-10-05 (Added Microsoft Agent Framework evaluation)*
