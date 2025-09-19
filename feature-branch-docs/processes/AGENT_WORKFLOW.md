# Agent Workflow Processes

## Overview
Standardized workflows for multi-agent collaboration in the Chat Extension project.

## Standard Workflows

### 1. Feature Development Workflow

```mermaid
graph TD
    A[User Request] --> B[@architect: Design]
    B --> C[@coder: Implement]
    C --> D[@executor: Test]
    D --> E[@reviewer: Review]
    E --> F[@documenter: Document]
    F --> G[Complete]
```

**Process Steps:**
1. **Requirements Analysis** (@architect)
   - Parse user requirements
   - Define technical approach
   - Create design specification

2. **Implementation** (@coder)
   - Write code following design
   - Ensure code quality standards
   - Create unit tests

3. **Testing** (@executor)
   - Run test suites
   - Perform integration testing
   - Validate functionality

4. **Review** (@reviewer)
   - Code review for quality
   - Security assessment
   - Performance evaluation

5. **Documentation** (@documenter)
   - Update technical docs
   - Create user guides
   - Log changes

### 2. Bug Fix Workflow

```mermaid
graph TD
    A[Bug Report] --> B[@executor: Reproduce]
    B --> C[@coder: Fix]
    C --> D[@executor: Verify]
    D --> E[@reviewer: Approve]
    E --> F[Deploy]
```

**Process Steps:**
1. **Reproduction** (@executor)
   - Confirm bug existence
   - Document steps to reproduce
   - Identify affected components

2. **Resolution** (@coder)
   - Implement fix
   - Add regression tests
   - Update affected documentation

3. **Verification** (@executor)
   - Confirm fix works
   - Check for regressions
   - Validate edge cases

4. **Approval** (@reviewer)
   - Review fix implementation
   - Ensure coding standards
   - Approve for deployment

### 3. Documentation Update Workflow

```mermaid
graph TD
    A[Doc Request] --> B[@documenter: Draft]
    B --> C[Relevant Agent: Review]
    C --> D[@team: Approve]
    D --> E[Publish]
```

**Process Steps:**
1. **Drafting** (@documenter)
   - Create/update documentation
   - Ensure consistency with existing docs
   - Add examples and diagrams

2. **Technical Review** (Domain Agent)
   - Verify technical accuracy
   - Suggest improvements
   - Validate examples

3. **Team Approval** (@team)
   - Broad review for clarity
   - Check alignment with standards
   - Final approval

## Communication Templates

### Request Template
```
@[agent] Request: [Brief description]
Context: [Relevant background]
Requirements: [Specific needs]
Priority: [High/Medium/Low]
```

### Response Template
```
@[requester] Response: [Brief summary]
Status: [Complete/In Progress/Blocked]
Details: [Implementation details]
Next Steps: [If applicable]
```

### Handoff Template
```
@[next-agent] Handoff: [Task description]
Completed: [What was done]
Remaining: [What needs doing]
Dependencies: [Any blockers]
```

## Best Practices

### 1. Clear Communication
- State objectives clearly
- Provide necessary context
- Specify expected outcomes

### 2. Efficient Collaboration
- Minimize handoffs
- Batch related requests
- Use parallel processing when possible

### 3. Quality Assurance
- Test before handoff
- Document assumptions
- Validate outputs

### 4. Continuous Improvement
- Learn from failures
- Share knowledge
- Update processes based on experience

## Metrics and KPIs

### Response Time
- Target: < 2 seconds for agent acknowledgment
- Target: < 30 seconds for simple tasks
- Target: < 5 minutes for complex tasks

### Quality Metrics
- Code review approval rate: > 90%
- Test coverage: > 80%
- Documentation completeness: 100%

### Collaboration Efficiency
- Handoff success rate: > 95%
- Rework rate: < 10%
- Team satisfaction: > 4/5

## Revision History
- v1.0.0: Initial workflow documentation
- Last Updated: 2025-09-16