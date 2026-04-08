---
name: backend-multi-agent
description: Plan and run larger NowDoBoss backend work with explicit role splits such as leader, executor, DB reviewer, hexagonal reviewer, and security reviewer.
---

# Backend Team Playbook

Use this skill when a backend task is large enough that implementation and review should be split across explicit roles.

## When to Use

Use this skill when:
- a new backend service or major context is being added
- DB, Redis, API, and docs are changing together
- a refactor is large enough that architecture drift is a real risk
- the user explicitly asks for multi-agent or team-style backend execution

Do not use this skill for trivial one-file changes.

## Read First

1. `backend/docs/team-playbook.md`
2. `backend/docs/architecture-guide.md`
3. `backend/docs/coding-conventions.md`
4. `backend/docs/api-design-guide.md`
5. `backend/docs/done-checklist.md`

## Procedure

1. Classify the task
   - single service feature
   - DB / Redis / query structure change
   - security change
   - new service or major refactor

2. Choose the role set
   - `Backend Leader`
   - `Backend Executor`
   - `DB Reviewer`
   - `Hexagonal Reviewer`
   - `Security Reviewer`

3. Lock the leader-owned decisions first
   - scope
   - out-of-scope
   - public API direction
   - service boundary

4. Split work cleanly
   - executor implements
   - reviewers inspect boundaries, persistence, or security
   - avoid overlap that causes conflicting edits

5. Integrate
   - accept or reject review findings explicitly
   - make one coherent final pass

6. Verify
   - compile/test/check
   - Swagger
   - docs update
   - final risks

## Output Format

```text
BACKEND MULTI-AGENT PLAN
========================

Task:
- ...

Role Set:
- Leader: ...
- Executor: ...
- DB Reviewer: ...
- Hexagonal Reviewer: ...
- Security Reviewer: [if needed]

Execution Order:
1. ...
2. ...
3. ...

Verification:
- ...

Remaining Risks:
- ...
```

