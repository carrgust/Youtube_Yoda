# Research - Technical Discovery & Improvement

Research technical improvements and generate actionable issues.

## Your Task
Research: $ARGUMENTS

## Process

### 1. Multi-Source Investigation
- **Web Search**: Latest best practices, case studies, benchmarks
- **Documentation**: Official docs via Context7, migration guides
- **Codebase Analysis**: Current implementation, technical debt, bottlenecks
- **Competition**: What industry leaders are doing

### 2. Analysis Framework

Evaluate findings through three lenses:
- **Quick Wins**: What can improve immediately? (< 1 week)
- **Strategic Improvements**: What needs planning? (2-4 weeks)
- **Future Vision**: What should we prepare for? (3+ months)

### 3. Generate Improvement Issues

Create 5-10 specific, actionable issues based on research:

```markdown
# 🚀 [Improvement Title]

## 📊 Research Summary
**Current State**: [Baseline metrics/situation]
**Industry Best Practice**: [What research shows]
**Potential Improvement**: [Specific percentage or metric]

## 💡 Proposed Implementation

### Option A: Quick Win
- **Approach**: [Minimal change for immediate impact]
- **Effort**: S (2-3 days)
- **Impact**: Medium
- **Risk**: Low

### Option B: Optimal Solution  
- **Approach**: [Best practice implementation]
- **Effort**: M-L (1-2 weeks)
- **Impact**: High
- **Risk**: Medium

## 📈 Success Metrics
- **Before**: [Current metric]
- **Target**: [Improved metric]
- **Measurement**: [How to measure]

## 🔗 Research Sources
- [Article/Documentation Title](URL)
- [Benchmark Study](URL)
- [Case Study](URL)

## 💻 Implementation Details
- **Files to modify**: [List key files]
- **Dependencies to add**: [If any]
- **Breaking changes**: [Yes/No - details]

## ✅ Acceptance Criteria
- [ ] Implementation complete
- [ ] Performance improvement verified
- [ ] No regression in other areas
- [ ] Documentation updated
- [ ] Team trained on new approach

## 🏷️ Labels
`research`, `performance|security|dx|ux`, `impact-high|medium|low`
```

### 4. Create Research Epic

Generate one epic that summarizes all findings:

```markdown
# 📚 Research Report: [Topic]

## Executive Summary
- **Research Date**: [Date]
- **Key Finding**: [Most important discovery]
- **Recommended Investment**: [Time/resources needed]
- **Expected ROI**: [Concrete benefits]

## Research Findings

### 🏆 Top 3 Opportunities
1. **[Opportunity 1]** - [Impact] - Issue #X
2. **[Opportunity 2]** - [Impact] - Issue #Y  
3. **[Opportunity 3]** - [Impact] - Issue #Z

### 📊 Benchmark Analysis
| Metric | Our Current | Industry Average | Industry Best | Our Target |
|--------|-------------|------------------|---------------|------------|
| [Metric] | [Value] | [Value] | [Value] | [Value] |

### 🗺️ Implementation Roadmap

#### Sprint 1: Quick Wins
- [ ] #[issue] - [Title] (2 days)
- [ ] #[issue] - [Title] (3 days)

#### Sprint 2-3: Core Improvements
- [ ] #[issue] - [Title] (1 week)
- [ ] #[issue] - [Title] (1 week)

#### Future: Strategic Initiatives
- [ ] #[issue] - [Title] (2-4 weeks)

## 💰 Cost-Benefit Analysis
- **Total effort**: [X developer-days]
- **Expected improvements**: 
  - Performance: [X% faster]
  - Cost: [$X/month saved]
  - Developer Experience: [X hours/week saved]
  - User Satisfaction: [Expected increase]

## 📚 Knowledge Transfer
- Key documentation to create
- Training needed for team
- New patterns to establish

## 🎯 Success Criteria
- All high-impact issues completed
- Metrics improved to target levels
- No increase in bugs or incidents
- Team successfully using new approaches
```

### 5. Special Research Types

**Performance Research**: Focus on bottlenecks, benchmarks, optimization techniques
**Security Research**: OWASP guidelines, vulnerability patterns, best practices
**DX Research**: Developer productivity, tooling, workflow improvements
**Cost Research**: Infrastructure optimization, service alternatives, efficiency

## Output

1. Create all issues with `gh issue create`
2. Link issues to research epic
3. Add to project board under "Research" column
4. Set priorities based on impact/effort ratio
5. Share summary with team for discussion

Remember: Every research finding should result in an actionable issue. No research without action.