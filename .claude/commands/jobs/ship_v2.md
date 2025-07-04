# Ship - Feature Development Workflow

Ship features by creating detailed implementation issues and executing them.

## Your Task
Implement: $ARGUMENTS

## Process (ReAct Framework)

### 1. Understand Context
- Parse the request from arguments
- Search codebase for related patterns
- Check existing issues and recent PRs
- Identify affected components

### 2. Break Down Work
If the task is complex, create multiple focused issues. Each issue should be completable in <1 day.

### 3. Generate Implementation Issue(s)

For each piece of work, create a GitHub issue:

```markdown
# [Type] [Clear, specific title]

## 📋 Description
[What needs to be done and why]

## 🎯 Current State vs Desired State
**Current**: [How it works now]
**Desired**: [How it should work]

## 🛠️ Implementation Plan
1. [Specific step with file/component]
2. [Next step with details]
3. [Continue until complete]

## 💻 Code Structure
- **Files to modify**:
  - `path/to/file.ts` - [what changes]
  - `path/to/other.ts` - [what changes]
  
- **New files to create**:
  - `path/to/new.ts` - [purpose]

- **Patterns to follow**:
  - [Reference similar implementation in codebase]

## 🧪 Testing Requirements
- [ ] Unit tests for [specific functions]
- [ ] Integration test for [API endpoint]
- [ ] E2E test for [user flow] (if applicable)
- [ ] Performance benchmark before/after

## ⚡ Performance Considerations
- [Any performance impacts]
- [Optimization strategies]

## 🔒 Security Checklist
- [ ] Input validation implemented
- [ ] Authentication checked
- [ ] Authorization verified
- [ ] No sensitive data logged

## 📸 UI Changes
[If applicable, describe expected UI changes]

## ✅ Definition of Done
- [ ] Code implemented and working
- [ ] Tests written and passing (>80% coverage)
- [ ] No linting errors
- [ ] Documentation updated
- [ ] PR created and reviewed
- [ ] Deployed to staging
- [ ] Verified in staging

## 🏷️ Labels
`feature|bug|enhancement`, `priority-[high|medium|low]`, `size-[S|M|L]`

## ⏱️ Time Estimate
[Hours or days]
```

### 4. Quick Tasks

For simple tasks (bugs, small features), create a single streamlined issue:

```markdown
# 🐛 Fix: [Specific bug description]

## Problem
[What's broken]

## Root Cause
[Why it's broken]

## Solution
[How to fix it]

## Testing
- [ ] Add regression test
- [ ] Verify fix locally
- [ ] Test edge cases

## Files to Change
- `file.ts` - [specific fix]

Time: [2-4 hours]
```

### 5. Urgent/Critical Tasks

For critical issues, create emergency issue:

```markdown
# 🚨 CRITICAL: [Issue description]

## Impact
- Severity: CRITICAL
- Users affected: [number/percentage]
- Revenue impact: [if applicable]

## Immediate Mitigation
1. [Quick fix step]
2. [Rollback plan if needed]

## Root Cause Fix
[Proper solution after emergency resolved]

## Post-Incident
- [ ] Add monitoring for this failure
- [ ] Create post-mortem
- [ ] Add regression tests

**Deploy immediately after review**
```

### 6. Link Related Work

- Connect to epic if part of larger feature
- Reference related issues
- Add to project board
- Set milestone if applicable

## Output

1. Create issue(s) using `gh issue create`
2. Add appropriate labels based on type and priority
3. Assign to self (or team member if specified)
4. If starting work immediately:
   - Create branch from issue
   - Begin implementation
   - Update issue with progress
5. Return issue number(s) for tracking

## Quick Patterns

- Bug fix: Focus on regression test
- New feature: Emphasize user value
- Performance: Include benchmarks
- Refactor: Explain why it's needed
- Security: Follow OWASP guidelines

Remember: Every issue should be self-contained with enough detail that any developer can pick it up and implement successfully.