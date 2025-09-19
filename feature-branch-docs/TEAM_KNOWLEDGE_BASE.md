# Team Knowledge Base

## Quick Reference

### Essential Documents
- 📋 [Team Governance](./policies/TEAM_GOVERNANCE.md) - How we operate as a team
- 🔄 [Agent Workflows](./processes/AGENT_WORKFLOW.md) - Standard processes for tasks
- 🎯 [Decision Making](./protocols/DECISION_MAKING.md) - How we make decisions
- 💬 [Interaction Guide](./guides/AGENT_INTERACTION.md) - How agents communicate
- 🤝 [Collaboration Standards](./standards/COLLABORATION_STANDARDS.md) - Team working standards

## Agent Quick Reference

### Agent Capabilities Matrix

| Agent | Primary Role | Key Skills | When to Use |
|-------|-------------|------------|-------------|
| **@architect** | System Design | Architecture, patterns, scalability | Design decisions, tech choices |
| **@coder** | Implementation | Coding, optimization, refactoring | Writing/modifying code |
| **@executor** | Testing & Running | Test execution, debugging, validation | Running tests, reproducing bugs |
| **@reviewer** | Quality Assurance | Code review, security, best practices | Reviewing code, quality checks |
| **@documenter** | Documentation | Technical writing, diagrams, guides | Creating/updating docs |
| **@coordinator** | Project Management | Task management, prioritization, tracking | Planning, coordination |
| **@team** | Collective Action | Consensus, brainstorming, collaboration | Team decisions, broadcasts |

## Common Workflows

### 🚀 New Feature Implementation
1. @architect designs the solution
2. @coder implements the feature
3. @executor runs tests
4. @reviewer checks quality
5. @documenter updates docs

### 🐛 Bug Fix Process
1. @executor reproduces the issue
2. @coder implements the fix
3. @executor validates the fix
4. @reviewer approves changes

### 📚 Documentation Update
1. @documenter drafts content
2. Domain agent reviews for accuracy
3. @team approves if needed

## Communication Templates

### Task Request
```
@[agent] Please [action]
Context: [why this is needed]
Requirements: [what success looks like]
Priority: [High/Medium/Low]
```

### Status Update
```
@team Status Update: [Task name]
Progress: [% complete or description]
Blockers: [any issues]
ETA: [completion estimate]
```

### Help Request
```
@[expert] Need help with [issue]
Tried: [what you've attempted]
Error: [any error messages]
Goal: [what you're trying to achieve]
```

## Decision Framework

### Quick Decision Tree
```
Is it affecting the whole system?
  Yes → @team consensus needed
  No → Continue

Is it changing architecture?
  Yes → @architect approval needed
  No → Continue

Is it modifying code?
  Yes → @reviewer review needed
  No → Continue

Is it updating documentation?
  Yes → @documenter handles
  No → Individual agent decision
```

## Best Practices Checklist

### Before Starting Work
- [ ] Understand requirements clearly
- [ ] Check for existing solutions
- [ ] Identify dependencies
- [ ] Estimate effort required

### During Work
- [ ] Follow coding standards
- [ ] Write/update tests
- [ ] Document decisions
- [ ] Communicate blockers

### After Completing Work
- [ ] Run all tests
- [ ] Update documentation
- [ ] Request review if needed
- [ ] Confirm task closure

## Quality Standards

### Code Quality
- ✅ Passes linting (npm run lint)
- ✅ Type checks pass (npm run typecheck)
- ✅ Tests pass (npm run test)
- ✅ >80% test coverage
- ✅ No security vulnerabilities

### Documentation Quality
- ✅ Clear and concise
- ✅ Includes examples
- ✅ Up-to-date with code
- ✅ Follows templates
- ✅ Reviewed for accuracy

### Communication Quality
- ✅ Clear intent stated
- ✅ Context provided
- ✅ Specific and actionable
- ✅ Timely responses
- ✅ Professional tone

## Troubleshooting Guide

### Common Issues

**Issue:** Task blocked by missing information
**Solution:**
1. @coordinator to identify information source
2. Request from appropriate agent or user
3. Document for future reference

**Issue:** Conflicting implementations
**Solution:**
1. @architect reviews both approaches
2. @team decides if consensus needed
3. Document decision rationale

**Issue:** Test failures after changes
**Solution:**
1. @executor identifies failing tests
2. @coder fixes implementation
3. @reviewer ensures fix is appropriate

**Issue:** Unclear requirements
**Solution:**
1. @coordinator clarifies with user
2. @architect translates to technical specs
3. @team confirms understanding

## Performance Optimization

### Response Time Targets
- Acknowledgment: < 2 seconds
- Simple tasks: < 30 seconds
- Complex tasks: < 5 minutes
- Long tasks: Updates every minute

### Efficiency Tips
- Batch similar requests
- Run independent tasks in parallel
- Cache frequently used information
- Reuse existing components
- Automate repetitive tasks

## Learning Resources

### Internal Documentation
- [Architecture Overview](./architecture/README.md)
- [API Reference](./api/README.md)
- [Development Guide](./development/README.md)
- [Deployment Guide](./deployment/README.md)

### Process Documents
- [Git Workflow](./development/git-workflow.md)
- [Code Review Process](./processes/code-review.md)
- [Release Process](./deployment/release-process.md)
- [Incident Response](./processes/incident-response.md)

### Templates
- [Agent Communication](./templates/AGENT_TEMPLATE.md)
- [API Documentation](./templates/API_TEMPLATE.md)
- [User Guides](./templates/GUIDE_TEMPLATE.md)

## Metrics Dashboard

### Key Performance Indicators
- Task Completion Rate: Target >95%
- Code Quality Score: Target >90%
- Documentation Coverage: Target 100%
- Response Time: Target <30s average
- Collaboration Index: Target >4.0/5.0

### Health Checks
- All agents responsive ✅
- Documentation up-to-date ✅
- Tests passing ✅
- No critical bugs ✅
- Knowledge base current ✅

## Team Calendar

### Regular Activities
- **Daily:** Task updates and handoffs
- **Weekly:** Team retrospective
- **Monthly:** Documentation review
- **Quarterly:** Process improvement
- **Annually:** Architecture review

## Emergency Procedures

### System Down
1. @executor diagnoses issue
2. @team mobilizes for fix
3. @coder implements emergency patch
4. @coordinator communicates status
5. @documenter logs incident

### Data Loss
1. @executor checks backups
2. @architect plans recovery
3. @coder implements restoration
4. @reviewer validates data integrity
5. @documenter updates disaster recovery docs

## Continuous Improvement

### Feedback Channels
- Direct agent-to-agent feedback
- Team retrospectives
- User feedback integration
- Process improvement suggestions
- Innovation experiments

### Knowledge Sharing
- Document all solutions
- Share learnings from failures
- Create reusable patterns
- Maintain FAQ
- Regular knowledge transfer sessions

## Quick Links

### Policies
- [Team Governance](./policies/TEAM_GOVERNANCE.md)
- [Security Policy](./policies/SECURITY.md)
- [Quality Policy](./policies/QUALITY.md)

### Processes
- [Agent Workflow](./processes/AGENT_WORKFLOW.md)
- [Development Process](./processes/DEVELOPMENT.md)
- [Review Process](./processes/REVIEW.md)

### Protocols
- [Decision Making](./protocols/DECISION_MAKING.md)
- [Communication Protocol](./protocols/COMMUNICATION.md)
- [Escalation Protocol](./protocols/ESCALATION.md)

### Standards
- [Collaboration Standards](./standards/COLLABORATION_STANDARDS.md)
- [Coding Standards](./standards/CODING.md)
- [Documentation Standards](./standards/DOCUMENTATION.md)

### Guides
- [Agent Interaction](./guides/AGENT_INTERACTION.md)
- [Getting Started](./guides/getting-started.md)
- [Best Practices](./guides/best-practices.md)

## Version History
- v1.0.0: Initial knowledge base created
- Last Updated: 2025-09-16
- Next Review: 2025-10-16