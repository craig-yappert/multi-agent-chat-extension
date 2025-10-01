# Team Decision Protocol

## Quick Reference: When to Use Which Agent

### Single Agent Tasks (Low Credit)
```
@architect - System design, architecture decisions
@coder     - Implementation, coding tasks
@executor  - Running commands, testing
@reviewer  - Code review, quality checks
@documenter - Documentation updates
```

### Multi-Agent Workflows (Managed Credit)
```
Feature Development:
1. @architect (design) → 2. @coder (implement) → 3. @reviewer (validate)

Bug Fixing:
1. @executor (reproduce) → 2. @coder (fix) → 3. @executor (verify)

Refactoring:
1. @reviewer (analyze) → 2. @coder (refactor) → 3. @executor (test)
```

## Decision Trees

### Task Complexity Assessment
```
Is it a bug fix?
├── YES → @executor first (reproduce)
│   └── Then @coder (fix)
└── NO → Is it a new feature?
    ├── YES → @architect first (design)
    │   └── Then @coder (implement)
    └── NO → Is it refactoring?
        ├── YES → @coder only
        └── NO → @team (discuss)
```

### Credit Budget Decision
```
Task Estimate > 50 credits?
├── YES → Break down task
│   ├── Identify independent parts
│   └── Execute in parallel
└── NO → Task Estimate > 25 credits?
    ├── YES → Single agent with checkpoint
    └── NO → Single agent direct execution
```

## Team Consensus Rules

### Unanimous Agreement Required
- Architecture changes
- Breaking changes
- External dependencies
- Security implementations

### Majority Sufficient
- Code style decisions
- Tool choices
- Implementation approaches
- Documentation formats

### Single Agent Decides
- Variable naming
- Comment placement
- File organization
- Test structure

## Communication Efficiency

### DO Use
```markdown
@coder implement UserService.getById() method using existing patterns
```

### DON'T Use
```markdown
@team what does everyone think about maybe possibly implementing a method that might get a user by their ID?
```

## Escalation Path

1. **Level 1**: Single agent attempts
2. **Level 2**: Agent requests specific help
3. **Level 3**: Team consultation
4. **Level 4**: User decision required

## Credit Saving Patterns

### Pattern 1: Batch Similar Tasks
```markdown
@coder implement all CRUD operations for User model at once
```

### Pattern 2: Reuse Existing Code
```markdown
@coder copy ProductService pattern for UserService
```

### Pattern 3: Skip Unnecessary Steps
```markdown
@executor run tests for changed files only
```

### Pattern 4: Direct Assignment
```markdown
@reviewer check only the public API changes
```

## Task Handoff Protocol

### Clean Handoff Template
```
Agent A completes:
- ✓ Task 1
- ✓ Task 2
- Prepared: [context for next agent]

@AgentB continue with:
- Task 3 using [specific context]
- Expected output: [clear description]
```

### Checkpoint Format
```
Status: [% complete]
Credits used: [X/Budget]
Blockers: [if any]
Next steps: [specific actions]
```

## Abort Conditions

Immediately stop if:
- Credits exceed budget by 20%
- Same error occurs 3 times
- User provides "stop" signal
- Circular dependency detected
- No progress in 3 iterations

## Success Metrics

Track and optimize for:
- Credits per feature point
- Time to completion
- First-attempt success rate
- Rework frequency
- User satisfaction signals

## Team Learning

After each session:
1. What worked well? (Repeat)
2. What was expensive? (Optimize)
3. What failed? (Avoid)
4. What patterns emerged? (Codify)