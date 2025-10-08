# Open Source Release Checklist

**Goal:** Release multi-agent-chat-extension to the public for feedback and community contribution.

---

## Pre-Release Cleanup ✅

### 1. Privacy & Security
- [x] Update .gitignore to exclude personal data
- [x] Remove tracked personal files (.claude/settings.local.json, .machat/context/, .machat/conversations/)
- [ ] Remove any API keys or credentials from codebase
- [ ] Review all markdown files for personal information
- [ ] Check git history for sensitive commits (optional: use git-filter-repo if needed)

### 2. Documentation Audit

**Essential (Keep & Polish):**
- [x] README.md - Main project description
- [x] CLAUDE.md - Development guide
- [x] docs/START_HERE.md - Getting started for contributors
- [x] docs/USER_GUIDE_PROVIDERS.md - Provider setup
- [x] LICENSE - Choose and add license (MIT recommended)

**Development Docs (Keep):**
- [ ] docs/ARCHITECTURE_DIAGRAM.md
- [ ] docs/CODE_FLOWS.md
- [ ] docs/QUICK_REFERENCE.md
- [ ] docs/proposals/ - Feature proposals

**Internal/WIP Docs (Review - Maybe Archive or Remove):**
- [ ] docs/testing/PHASE_1_ANALYSIS.md - Testing notes (keep or archive?)
- [ ] docs/testing/ROUND_1_FEEDBACK.md - Personal feedback (archive?)
- [ ] docs/PHASE_2_STATE_AND_ORCHESTRATION_CHALLENGE.md - Design doc (keep!)
- [ ] docs/architecture/PERMISSIONS_ASSESSMENT.md - Auto-generated (review)

### 3. Code Quality
- [ ] Run `npm run lint` and fix issues
- [ ] Run `npm run compile` and ensure no errors
- [ ] Test extension installation and basic functionality
- [ ] Remove any debug console.logs (optional)
- [ ] Ensure all TypeScript strict mode errors resolved

### 4. Repository Setup
- [ ] Create GitHub repository (public)
- [ ] Add clear repository description
- [ ] Add topics/tags: vscode-extension, ai, multi-agent, typescript
- [ ] Set up Issues template (optional)
- [ ] Set up PR template (optional)

---

## What to Include in Release

### Core Files (Must Have)
```
├── src/                    # Source code
├── resources/              # Webview assets
├── defaults/               # Default configurations
├── README.md              # Main docs
├── CLAUDE.md              # Dev guide
├── package.json           # Extension manifest
├── LICENSE                # License file (ADD THIS)
└── .gitignore             # Ignore rules
```

### Documentation (Include)
```
docs/
├── START_HERE.md          # Contributor onboarding
├── ARCHITECTURE_DIAGRAM.md
├── CODE_FLOWS.md
├── QUICK_REFERENCE.md
├── USER_GUIDE_PROVIDERS.md
├── ADDING_PROVIDERS.md
└── proposals/             # Feature proposals
```

### Testing/Internal Docs (Decision Needed)
```
docs/testing/              # Your test notes - keep or archive?
docs/internal/             # Internal docs - keep or remove?
```

---

## Documentation Cleanup Tasks

### README.md Updates Needed
- [ ] Add project logo/banner (optional)
- [ ] Clear "What is this?" description
- [ ] Installation instructions
- [ ] Quick start guide
- [ ] Link to detailed docs
- [ ] Screenshots/GIFs of functionality
- [ ] Contribution guidelines section
- [ ] Link to issues/discussions

### LICENSE
- [ ] Choose license (MIT recommended for VS Code extensions)
- [ ] Add LICENSE file to root
- [ ] Update package.json with license field

### CHANGELOG.md
- [ ] Create CHANGELOG.md
- [ ] Document versions released so far
- [ ] Note current version (1.16.1)

---

## What Makes Your Project Unique

### Strengths to Highlight
1. **7 Specialized AI Agents** - Architect, Coder, Executor, Reviewer, Documenter, Coordinator, Team
2. **Inter-Agent Communication** - Agents can collaborate via @mentions
3. **Multi-Provider Support** - Claude CLI, VS Code LM API, OpenAI, Google, xAI
4. **Permission System** - Phase 1 complete (soft enforcement), Phase 2 in progress (hard enforcement)
5. **External Configuration** - JSON-based model/agent configs, no rebuild needed
6. **Project-Local Storage** - .machat folder for per-project customization
7. **Extensive Documentation** - 127 markdown files (!)

### What's Unique vs. Other AI Code Extensions
- ✅ Multiple specialized agents (not just one chat bot)
- ✅ Team collaboration workflows
- ✅ Permission/security system
- ✅ Highly configurable (external JSON configs)
- ✅ Works with free providers (GitHub Copilot, Continue.dev)

---

## Documentation Complexity Assessment

**Current State:**
- 127 markdown files
- 1MB of documentation
- Very comprehensive (maybe TOO comprehensive for initial release?)

**Recommendation:**
Keep the docs! They show:
1. Serious project (not a toy)
2. Well thought-out architecture
3. Clear development process
4. Good for attracting contributors

**But:**
- Add a "Documentation Map" (docs/README.md)
- Organize into Essential vs Advanced
- Make START_HERE.md the main entry point

---

## Pre-Release Testing

### Manual Tests
- [ ] Install .vsix file in fresh VS Code
- [ ] Initialize .machat folder
- [ ] Test each agent (Architect, Coder, Executor, etc.)
- [ ] Test inter-agent communication (@mentions)
- [ ] Test provider switching (Claude CLI, VS Code LM)
- [ ] Test permission system (Phase 1)
- [ ] Test file operations (Phase 2 - single operations)

### User Flows to Verify
1. **New User Experience**
   - Install extension
   - Open chat
   - Talk to Coordinator
   - See agents work

2. **Developer Experience**
   - Clone repo
   - npm install
   - npm run compile
   - F5 to debug
   - Make a change
   - Test it works

---

## Release Strategy

### Option A: Soft Launch (Recommended)
1. Push to GitHub (public)
2. Share with small group first (Reddit, Discord, Twitter)
3. Gather initial feedback
4. Fix critical issues
5. Announce more widely

### Option B: Full Launch
1. Push to GitHub
2. Publish to VS Code Marketplace
3. Announce on all channels
4. Handle influx of issues/questions

**Recommendation:** Start with Option A to validate interest and find bugs.

---

## Community Engagement

### Where to Share
- [ ] Reddit: r/vscode, r/programming, r/artificial
- [ ] Hacker News (Show HN: Multi-Agent AI Assistant for VS Code)
- [ ] Twitter/X (#VSCode, #AI, #OpenSource)
- [ ] VS Code extension subreddit
- [ ] Dev.to article
- [ ] LinkedIn post

### What to Ask Community
1. "What workflows would benefit from multiple AI agents?"
2. "Which providers should we prioritize?"
3. "What's missing from current AI coding assistants?"
4. "How should multi-step tasks be orchestrated?" (Your current challenge!)

---

## Next Steps (Priority Order)

### Must Do Before Release
1. ✅ Fix .gitignore and remove personal data
2. [ ] Add LICENSE file (MIT)
3. [ ] Review and polish README.md
4. [ ] Test clean install

### Should Do Before Release
5. [ ] Create CHANGELOG.md
6. [ ] Review docs for personal info
7. [ ] Create docs/README.md (documentation map)
8. [ ] Add screenshots to README

### Nice to Have
9. [ ] Create demo GIF/video
10. [ ] Write blog post about the project
11. [ ] Set up GitHub Issues templates
12. [ ] Create CONTRIBUTING.md

---

## Estimated Time to Release-Ready

**Minimal (Get it out there):** 2-3 hours
- Fix privacy issues ✅
- Add LICENSE
- Polish README
- Push to GitHub

**Polished (Professional):** 1-2 days
- All of minimal
- Clean up docs organization
- Create demo materials
- Test thoroughly
- Write announcement post

**Your Call:** How polished do you want the initial release?

---

## After Release: What to Expect

### Likely Feedback Areas
1. **"How is this different from Copilot Chat?"** - Prepare answer
2. **"Does this work without Claude Pro?"** - Yes! VS Code LM support
3. **"The orchestration gap you described"** - Community might have ideas!
4. **Installation issues** - Always happens
5. **Feature requests** - Tons of them

### How to Handle
- Be responsive but set boundaries (you have other projects!)
- Use Issues to track requests
- Be clear about project status (passion project, active but not full-time)
- Welcome contributors - some might help solve orchestration challenge!

---

**Ready to release?** The code is solid, the docs are extensive. Main tasks: privacy cleanup (done!), LICENSE, and README polish.
