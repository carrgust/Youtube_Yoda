# Architect - System Design & Planning

Create comprehensive architecture plan and generate implementation issues.

## Your Task
Design a complete system architecture for: $ARGUMENTS

## Process

### 1. Analyze Requirements
- Extract project name, tech preferences, and scale requirements from arguments
- Consider startup constraints (limited budget, small team, need for speed)
- Identify key technical challenges

### 2. Architecture Design (Tree of Thoughts)
Explore THREE different architecture approaches:
- Path A: Simple/Fast (MVP approach)
- Path B: Balanced (Some future-proofing)  
- Path C: Scalable (Built for growth)

Evaluate each path and select the best one with clear reasoning.

### 3. Technical Decisions
Document key decisions:
- Infrastructure: AWS services selection and rationale
- Database: SQL vs NoSQL, specific technology choice
- API: REST vs GraphQL, authentication strategy
- Frontend: Framework, state management, deployment
- CI/CD: Pipeline design, testing strategy
- Monitoring: Logging, metrics, alerting approach

### 4. Generate Implementation Issues

Create 8-12 GitHub issues that cover:
1. **Infrastructure Setup** (Priority: P0)
2. **CI/CD Pipeline** (Priority: P0)
3. **Database Schema & Setup** (Priority: P0)
4. **Authentication System** (Priority: P0)
5. **API Foundation** (Priority: P1)
6. **Frontend Scaffold** (Priority: P1)
7. **Monitoring & Logging** (Priority: P1)
8. **Security Baseline** (Priority: P1)
9. **Documentation Structure** (Priority: P2)
10. **Performance Benchmarks** (Priority: P2)

Each issue MUST include:
```markdown
## Description
[Clear explanation of what needs to be built]

## Technical Approach
[Specific technologies and patterns to use]

## Acceptance Criteria
- [ ] [Specific, measurable criteria]
- [ ] [Another criteria]
- [ ] Tests written and passing
- [ ] Documentation updated

## Dependencies
- Depends on: #[issue_number] (if applicable)
- Blocks: #[issue_number] (if applicable)

## Time Estimate
[S/M/L - with specific day estimate]

## Resources
- [Relevant documentation links]
- [Example repositories or guides]
```

### 5. Create Architecture Epic

Generate one epic issue that links all the implementation issues:
```markdown
# 🏗️ Architecture Implementation: [Project Name]

## Overview
[High-level architecture summary]

## Architecture Decisions
- **Pattern**: [Chosen architecture pattern]
- **Infrastructure**: [AWS services used]
- **Database**: [Choice and rationale]
- **Estimated Monthly Cost**: $[amount]

## Implementation Plan
### Phase 1: Foundation (Week 1)
- [ ] #[issue] - Infrastructure Setup
- [ ] #[issue] - CI/CD Pipeline
- [ ] #[issue] - Database Setup

### Phase 2: Core Features (Week 2-3)
- [ ] #[issue] - Authentication
- [ ] #[issue] - API Foundation
- [ ] #[issue] - Frontend Scaffold

### Phase 3: Production Ready (Week 4)
- [ ] #[issue] - Monitoring
- [ ] #[issue] - Security
- [ ] #[issue] - Documentation

## Success Metrics
- All tests passing
- <200ms API response time
- 99.9% uptime capability
- Cost within budget

## Next Steps
1. Review and approve architecture
2. Assign issues to team members
3. Begin Phase 1 implementation
```

## Output

1. Create all GitHub issues using `gh issue create`
2. Link issues with dependencies
3. Add appropriate labels: `architecture`, `phase-1/2/3`, `priority-P0/P1/P2`
4. Generate a simple architecture diagram using Mermaid in the epic
5. Provide cost estimate and timeline summary

Remember: Focus on pragmatic solutions that can ship quickly while maintaining quality and preparing for scale.