# Debug - Incident Response & Resolution

Debug production issues and create tracking/improvement issues.

## Your Task
Debug and resolve: $ARGUMENTS

## Process (Chain of Thought)

### 1. Assess Severity
Parse arguments to determine:
- Severity level (critical/high/medium/low)
- Environment (production/staging/dev)
- Initial symptoms

### 2. Investigate Systematically
1. Check system health (alarms, metrics)
2. Review recent deployments
3. Analyze error patterns
4. Check external dependencies
5. Identify root cause

### 3. Take Immediate Action
- **Critical**: Initiate rollback, then investigate
- **High**: Apply hotfix if clear, else rollback
- **Medium/Low**: Fix forward with proper testing

### 4. Create Tracking Issues

#### A. Incident Issue
```markdown
# 🐛 Incident: [Description]

## 📝 Incident Details
- **Severity**: [Critical/High/Medium/Low]
- **Environment**: [Production/Staging]
- **Start Time**: [Timestamp]
- **Detection**: [How it was discovered]
- **User Impact**: [Number affected, functionality impacted]

## 🔍 Investigation Summary
### Symptoms
- [Symptom 1]
- [Symptom 2]

### Root Cause
[Clear explanation of what went wrong]

### Contributing Factors
- [Factor 1]
- [Factor 2]

## 🚑 Immediate Actions Taken
1. [Action 1] - [Time]
2. [Action 2] - [Time]
3. [Resolution] - [Time]

## 📊 Impact Metrics
- **Downtime**: [Duration]
- **Errors**: [Count]
- **Affected Users**: [Number/%]
- **Revenue Impact**: [If applicable]

## ✅ Resolution
- [ ] Root cause fixed
- [ ] Monitoring added
- [ ] Tests added
- [ ] Documentation updated
- [ ] Post-mortem scheduled

## 🔗 Related
- PR with fix: #[PR number]
- Post-mortem: #[Issue number]
- Follow-up improvements: #[Issue numbers]

## Labels
`incident`, `severity-[level]`, `postmortem-required`
```

#### B. Fix Implementation Issue
```markdown
# 🔧 Fix: [Specific fix needed]

## Context
Related to incident #[incident issue number]

## Problem
[Technical description of what's broken]

## Solution
[Specific fix approach]

## Implementation
- **Files to modify**:
  - `path/to/file` - [Changes needed]
  
## Testing
- [ ] Unit test for edge case
- [ ] Integration test for scenario
- [ ] Load test if performance-related
- [ ] Manual verification steps

## Rollout Plan
1. Deploy to staging
2. Verify fix
3. Deploy to production
4. Monitor for 30 minutes

## Labels
`bug`, `priority-high`, `incident-followup`
```

#### C. Prevention Issues
```markdown
# 🛡️ Prevention: [Improvement title]

## Context
Preventing recurrence of incident #[incident issue]

## Improvement
[What needs to be added/changed]

## Options
1. **Monitoring**: Add alerts for [specific condition]
2. **Automation**: Auto-recover when [condition]
3. **Testing**: Add test for [scenario]
4. **Process**: Change deployment process to [improvement]

## Expected Outcome
- Detect similar issues within [X minutes]
- Automatic recovery without manual intervention
- Prevent issue from reaching production

## Implementation
[Specific steps]

## Labels
`improvement`, `monitoring|automation|testing`, `incident-prevention`
```

### 5. Create Post-Mortem

For high/critical incidents:
```markdown
# 📋 Post-Mortem: [Incident Title]

## Meeting Details
- **Date**: [Schedule within 48 hours]
- **Attendees**: [List key people]
- **Facilitator**: [Name]

## Agenda
1. Timeline reconstruction (15 min)
2. Root cause analysis (20 min)
3. What went well (10 min)
4. What needs improvement (20 min)
5. Action items (15 min)

## Pre-work
- [ ] Gather metrics and logs
- [ ] Create timeline
- [ ] Interview key responders
- [ ] Prepare questions

## Success Criteria
- [ ] Blameless discussion
- [ ] Clear action items with owners
- [ ] Improvements to prevent recurrence
- [ ] Knowledge shared with team

## Output
- [ ] Final post-mortem document
- [ ] Action items as GitHub issues
- [ ] Updates to runbooks
- [ ] Team presentation

## Labels
`postmortem`, `meeting`, `incident-followup`
```

### 6. Quick Debug Commands

Based on symptom patterns, create appropriate issues:
- **Performance**: Optimization issue with benchmarks
- **Errors**: Bug fix with error handling improvements  
- **Availability**: Infrastructure and scaling improvements
- **Security**: Vulnerability fix and hardening

## Output

1. Create incident tracking issue immediately
2. Create fix implementation issue(s)
3. Create prevention/improvement issues
4. Schedule post-mortem if needed
5. Link all issues together
6. Update status page if applicable
7. Notify stakeholders via issue comments

## Priority Guidelines
- **Critical**: Fix within 1 hour, full post-mortem
- **High**: Fix within 4 hours, mini post-mortem
- **Medium**: Fix within 24 hours, brief review
- **Low**: Fix in next sprint, document learning

Remember: Every incident is a learning opportunity. Create issues that prevent recurrence.