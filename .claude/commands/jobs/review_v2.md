# Review - Pull Request Analysis

Conduct thorough code review and create improvement issues.

## Your Task
Review PR: $ARGUMENTS

## Process

### 1. Fetch PR Information
- Get PR details using `gh pr view $ARGUMENTS`
- Fetch diff and changed files
- Check CI status and test results
- Review PR description and linked issues

### 2. Systematic Review (Multi-Pass)

#### Pass 1: High-Level Architecture
- Does this align with our patterns?
- Are boundaries respected?
- Is complexity appropriate?

#### Pass 2: Security & Safety
- Input validation present?
- SQL injection prevention?
- Auth/authz checks?
- Sensitive data handling?
- Error messages safe?

#### Pass 3: Performance
- N+1 queries avoided?
- Appropriate caching?
- Bundle size impact?
- Database indexes used?
- Async operations correct?

#### Pass 4: Code Quality
- Readable and maintainable?
- Proper error handling?
- Test coverage adequate?
- Documentation updated?
- No debug code left?

#### Pass 5: Business Logic
- Requirements met?
- Edge cases handled?
- Backward compatibility?
- Feature flags if needed?

### 3. Generate Review Issues

#### A. Must-Fix Issues (Blocking)
```markdown
# 🚨 PR #[X] Blocker: [Issue Title]

## Context
Reviewing PR #[X]: [PR title]

## Issue Found
[Specific problem description]

## Why This Matters
[Impact if not fixed - security, performance, correctness]

## Suggested Fix
```[language]
// Current problematic code
[code snippet]

// Suggested improvement
[improved code]
```

## Additional Considerations
- [Alternative approach]
- [Things to test]

## Definition of Done
- [ ] Code updated with suggested fix
- [ ] Tests added for this case
- [ ] Re-reviewed by team

## Labels
`pr-feedback`, `blocker`, `review-finding`
```

#### B. Should-Fix Issues (Important)
```markdown
# ⚠️ PR #[X] Improvement: [Issue Title]

## Context  
Reviewing PR #[X]: [PR title]

## Improvement Opportunity
[What could be better]

## Current Approach
```[language]
[current code]
```

## Recommended Approach
```[language]
[better code]
```

## Benefits
- [Benefit 1]
- [Benefit 2]

## Labels
`pr-feedback`, `improvement`, `review-finding`
```

#### C. Consider Issues (Suggestions)
```markdown
# 💡 PR #[X] Suggestion: [Title]

## Context
Optional improvement for PR #[X]

## Suggestion
[What could enhance the code]

## Example
[Code example if applicable]

## Trade-offs
- **Pros**: [Benefits]
- **Cons**: [Costs]

## Labels
`pr-feedback`, `suggestion`, `enhancement`
```

### 4. Create Review Summary

Post as PR comment and create tracking issue:

```markdown
# Code Review Summary for PR #[X]

## ✅ What's Great
- [Positive point 1]
- [Positive point 2]
- [Positive point 3]

## 🚨 Must Fix (Blocking)
- [ ] #[issue] - [Critical issue 1]
- [ ] #[issue] - [Critical issue 2]

## ⚠️ Should Fix (Important)
- [ ] #[issue] - [Important improvement 1]
- [ ] #[issue] - [Important improvement 2]

## 💡 Consider (Optional)
- [ ] #[issue] - [Suggestion 1]
- [ ] #[issue] - [Suggestion 2]

## 📊 Review Metrics
- **Security**: [Pass/Concerns]
- **Performance**: [Pass/Concerns]
- **Tests**: [Coverage %]
- **Documentation**: [Updated/Needs work]
- **Code Quality**: [Score/10]

## 🎯 Overall Assessment
[Ready to merge after fixes | Needs significant work | Consider different approach]

## 📚 Learning Opportunities
[Things the team can learn from this PR]

---
*Review conducted using automated checks + manual inspection*
*Total review time: [X minutes]*
```

### 5. Special Review Types

**Security Review**: Focus on OWASP top 10, auth, crypto
**Performance Review**: Profiling, benchmarks, scalability
**Architecture Review**: Patterns, boundaries, complexity
**API Review**: Breaking changes, versioning, documentation

### 6. Create Follow-up Issues

For patterns found during review:
```markdown
# 📏 Coding Standard: [Pattern to Establish]

## Context
During review of PR #[X], noticed we need standards for [topic]

## Proposed Standard
[Clear guideline]

## Examples
✅ **Good**:
```[language]
[good example]
```

❌ **Avoid**:
```[language]
[bad example]
```

## Implementation
- [ ] Document in CLAUDE.md
- [ ] Add linting rule if possible
- [ ] Share with team
- [ ] Add to PR template

## Labels
`documentation`, `dx`, `standards`
```

## Output

1. Create issues for all findings
2. Post review summary as PR comment
3. Link issues in PR comment
4. Add review labels to PR
5. If blocking issues, request changes
6. If only suggestions, approve with comments
7. Create any follow-up standardization issues

## Review Checklist

Quick reference for every review:
- [ ] Security vulnerabilities?
- [ ] Performance regressions?
- [ ] Breaking changes?
- [ ] Tests adequate?
- [ ] Documentation updated?
- [ ] Error handling complete?
- [ ] Code readable?
- [ ] Patterns followed?

Remember: Reviews should be constructive, specific, and actionable. Every finding should either improve the code or improve the team's practices.