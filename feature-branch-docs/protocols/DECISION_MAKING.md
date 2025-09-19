# Decision Making Protocol

## Purpose
Establish clear decision-making processes for the multi-agent team to ensure efficient, consistent, and traceable decisions.

## Decision Categories

### 1. Operational Decisions
**Definition:** Day-to-day implementation choices within established patterns
**Authority:** Individual agents within their domain
**Documentation:** Code comments and commit messages

### 2. Tactical Decisions
**Definition:** Feature-level architectural choices and design patterns
**Authority:** Domain agent with peer review
**Documentation:** Design documents and ADRs (Architecture Decision Records)

### 3. Strategic Decisions
**Definition:** System-wide changes, major refactoring, technology choices
**Authority:** Team consensus with @architect leadership
**Documentation:** Formal ADRs and team meeting notes

## Decision Making Framework

### RAPID Model Implementation

| Role | Definition | Agent Assignment |
|------|----------|------------------|
| **R**ecommend | Proposes solution | Domain expert agent |
| **A**gree | Must agree for decision to move forward | @reviewer for code, @architect for design |
| **P**erform | Executes the decision | @coder, @executor |
| **I**nput | Consulted for expertise | Relevant domain agents |
| **D**ecide | Final decision maker | @coordinator or @team consensus |

## Decision Process

### Step 1: Problem Identification
```
Problem Statement:
- Issue: [Clear description]
- Impact: [Who/what is affected]
- Urgency: [Timeline constraints]
- Category: [Operational/Tactical/Strategic]
```

### Step 2: Solution Exploration
```
Options Analysis:
- Option A: [Description]
  - Pros: [Benefits]
  - Cons: [Drawbacks]
  - Effort: [Time/resource estimate]
- Option B: [Alternative]
  - Pros: [Benefits]
  - Cons: [Drawbacks]
  - Effort: [Time/resource estimate]
```

### Step 3: Decision Making
```
Decision Record:
- Selected: [Chosen option]
- Rationale: [Why this option]
- Decided by: [@agent or @team]
- Date: [YYYY-MM-DD]
- Review date: [If applicable]
```

### Step 4: Implementation
```
Implementation Plan:
- Owner: [@agent]
- Timeline: [Start - End]
- Dependencies: [What's needed]
- Success criteria: [How we measure]
```

## Consensus Building

### Synchronous Consensus (Team Broadcast)
Used for: Strategic decisions requiring immediate alignment
```
@team DECISION REQUIRED: [Topic]
Options: [A, B, C]
Recommendation: [Option X because...]
Deadline: [Time for responses]
```

### Asynchronous Consensus (Documentation Review)
Used for: Non-urgent tactical decisions
```
PR/Document created with:
- Proposal details
- Impact assessment
- Review checklist
- Approval requirements
```

## Decision Templates

### Architecture Decision Record (ADR)
```markdown
# ADR-[Number]: [Title]

## Status
[Proposed | Accepted | Deprecated | Superseded]

## Context
[Background and problem statement]

## Decision
[What we're doing and why]

## Consequences
[Positive and negative outcomes]

## Alternatives Considered
[Other options evaluated]
```

### Quick Decision Template
```markdown
DECISION: [One-line summary]
BY: [@agent]
RATIONALE: [2-3 sentences]
ACTION: [Next steps]
```

## Conflict Resolution

### Level 1: Direct Negotiation
Agents discuss and find compromise

### Level 2: Coordinator Arbitration
@coordinator mediates between agents

### Level 3: Team Vote
@team broadcast for majority decision

### Level 4: Fallback to Defaults
Use established patterns and standards

## Decision Reversal

### Conditions for Reversal
- New information materially changes context
- Implementation reveals critical issues
- External requirements change

### Reversal Process
1. Document reversal rationale
2. Assess impact of reversal
3. Get approval from original decision authority
4. Communicate change to all affected agents
5. Update documentation

## Metrics

### Decision Quality
- Reversal rate: < 5%
- Implementation success: > 90%
- Time to decision: < 1 hour for operational, < 1 day for tactical, < 1 week for strategic

### Process Efficiency
- Consensus achievement: > 80% first attempt
- Escalation rate: < 20%
- Documentation completeness: 100%

## Examples

### Example 1: Choosing a Testing Framework
```
@team DECISION REQUIRED: Testing Framework Selection
Options:
  A. Jest (current standard in JS ecosystem)
  B. Vitest (faster, better TS support)
  C. Mocha (traditional, flexible)
Recommendation: Option B - Vitest for better DX and speed
Deadline: Response needed within 30 minutes
```

### Example 2: Bug Fix Approach
```
DECISION: Use defensive coding to prevent null reference
BY: @coder
RATIONALE: Adding null checks is safer than assuming valid input.
Minimal performance impact with high reliability gain.
ACTION: Implement guards in all user input handlers
```

## Revision History
- v1.0.0: Initial decision protocol established
- Last Updated: 2025-09-16