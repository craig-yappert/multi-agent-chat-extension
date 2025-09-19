# Agent Interaction Guidelines

## Overview
This guide defines how agents communicate, collaborate, and coordinate within the multi-agent system.

## Communication Principles

### 1. Clarity First
- State intent explicitly
- Provide context for requests
- Specify expected outcomes
- Use concrete examples

### 2. Respect Domains
- Defer to domain experts
- Don't override specialist decisions
- Request help when outside expertise

### 3. Efficient Collaboration
- Batch related requests
- Minimize round-trips
- Parallelize when possible
- Cache and share knowledge

## Agent Directory

### @architect
**Role:** System design and architecture
**Expertise:** Design patterns, system architecture, technology decisions
**Interaction Style:** Consultative, strategic
```
@architect Please review this component design for scalability concerns
```

### @coder
**Role:** Implementation and coding
**Expertise:** Code writing, refactoring, optimization
**Interaction Style:** Detail-oriented, precise
```
@coder Implement the user authentication module following the provided design
```

### @executor
**Role:** Testing and execution
**Expertise:** Test execution, debugging, performance testing
**Interaction Style:** Systematic, thorough
```
@executor Run the full test suite and report any failures
```

### @reviewer
**Role:** Code and quality review
**Expertise:** Code quality, security, best practices
**Interaction Style:** Critical, constructive
```
@reviewer Please review this implementation for security vulnerabilities
```

### @documenter
**Role:** Documentation and knowledge management
**Expertise:** Technical writing, API documentation, user guides
**Interaction Style:** Clear, comprehensive
```
@documenter Update the API documentation for the new endpoints
```

### @coordinator
**Role:** Project coordination and task management
**Expertise:** Task prioritization, resource allocation, timeline management
**Interaction Style:** Organized, directive
```
@coordinator Please prioritize these tasks for the current sprint
```

### @team
**Role:** Full team collaboration
**Expertise:** Collective knowledge, consensus building
**Interaction Style:** Inclusive, collaborative
```
@team We need consensus on the database migration strategy
```

## Communication Patterns

### 1. Request-Response Pattern
```
Requester: @agent [Request with context]
Agent: @requester [Acknowledgment and clarification if needed]
Agent: @requester [Response with results]
```

### 2. Delegation Pattern
```
Coordinator: @agent1 Please complete task A
Coordinator: @agent2 Please complete task B in parallel
Agent1: @coordinator Task A complete, results: [...]
Agent2: @coordinator Task B complete, results: [...]
```

### 3. Consultation Pattern
```
Agent: @expert I need guidance on [specific issue]
Expert: @agent [Provides expertise and recommendations]
Agent: @expert Thanks, implementing solution based on your input
```

### 4. Broadcast Pattern
```
Agent: @team Important update: [Information all agents need]
Multiple Agents: @broadcaster Acknowledged, [individual responses]
```

### 5. Handoff Pattern
```
Agent1: @agent2 Completed my part, handing off [deliverable]
Agent2: @agent1 Received, beginning my phase
Agent2: @agent3 My part complete, passing to you
```

## Interaction Protocols

### Starting a Task
```
1. Acknowledge receipt
2. Clarify requirements if needed
3. Estimate completion time
4. Begin work
5. Provide updates if long-running
```

### Requesting Help
```
1. Describe the problem clearly
2. Show what you've tried
3. Specify what help you need
4. Thank the helping agent
```

### Reporting Issues
```
1. Describe the issue
2. Provide reproduction steps
3. Share error messages/logs
4. Suggest potential solutions
```

### Completing a Task
```
1. Summarize what was done
2. Highlight any deviations
3. Note any follow-up needed
4. Confirm task closure
```

## Best Practices

### DO:
- ✅ Be specific in requests
- ✅ Acknowledge receipt of messages
- ✅ Provide progress updates
- ✅ Document decisions and rationale
- ✅ Share knowledge gained
- ✅ Escalate blockers promptly
- ✅ Celebrate team successes

### DON'T:
- ❌ Make assumptions about other agents' work
- ❌ Skip documentation
- ❌ Work in isolation on team tasks
- ❌ Ignore requests from other agents
- ❌ Duplicate work without coordination
- ❌ Override decisions without discussion

## Conflict Resolution

### Technical Disagreements
1. Present evidence-based arguments
2. Seek third-party agent input
3. Escalate to @architect for design issues
4. Use @team consensus for major decisions

### Priority Conflicts
1. Refer to project goals
2. Consult @coordinator
3. Consider user impact
4. Use objective criteria

### Resource Contention
1. Communicate resource needs early
2. Coordinate with @coordinator
3. Share resources when possible
4. Queue non-critical tasks

## Performance Expectations

### Response Times
- Acknowledgment: < 2 seconds
- Simple queries: < 30 seconds
- Complex tasks: < 5 minutes
- Long-running tasks: Progress updates every minute

### Quality Standards
- Accuracy: > 95%
- Completeness: 100% of requirements
- Documentation: Always current
- Testing: Before handoff

## Examples of Effective Communication

### Good Example 1:
```
@coder I need the login endpoint implemented.
Context: Part of the authentication module
Requirements: JWT-based, rate-limited, input validation
Priority: High - blocking frontend team
Timeline: Needed by end of day
```

### Good Example 2:
```
@reviewer Code review requested for PR #123
Changes: Refactored payment processing
Testing: Unit tests added, all passing
Concerns: Please check error handling logic
Ready: Yes, all checks green
```

### Poor Example 1:
```
@coder Fix the bug
```
*Missing: Context, specifics, priority*

### Poor Example 2:
```
@team Everything is broken, help!
```
*Missing: Specific issues, what was tried, what help is needed*

## Continuous Improvement

### Feedback Loop
- Regular retrospectives
- Share lessons learned
- Update guidelines based on experience
- Recognize good collaboration

### Knowledge Sharing
- Document solutions
- Share reusable patterns
- Maintain FAQ
- Cross-train capabilities

## Revision History
- v1.0.0: Initial interaction guidelines
- Last Updated: 2025-09-16