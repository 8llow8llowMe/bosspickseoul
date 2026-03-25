---
name: backend-feature-bootstrap
description: Bootstrap a new backend service or context using the NowDoBoss backend docs, package template, API rules, and verification checklist.
---

# Backend Feature Bootstrap

Use this skill to start a new backend context or service without skipping the project conventions.

## When to Use

Use this skill when:
- a user wants a new service or a new context in an existing service
- a feature needs a first-pass package skeleton and implementation checklist
- you want a repeatable bootstrapping path for backend work

## Read First

1. `backend/docs/architecture-guide.md`
2. `backend/docs/api-design-guide.md`
3. `backend/docs/service-playbook.md`
4. `backend/docs/done-checklist.md`
5. if relevant, `backend/docs/services/*.md`

## Procedure

1. Define responsibility
   - what the service or context owns
   - what stays outside

2. Define public interface
   - REST paths
   - auth policy
   - request/response model names

3. Create structure
   - `controller`
   - `dto/request`, `dto/response`, `dto/item`
   - `presenter`
   - `port/in`, `port/out`
   - `service`, `processor`
   - `domain/model`
   - `adapter/out/persistence`

4. Define persistence and config
   - entity or DDL needs
   - index and delete strategy
   - `@ConfigurationProperties` if settings are needed

5. Verify
   - Swagger
   - transaction boundaries
   - compile/test/check
   - docs update

## Output Format

```text
BACKEND FEATURE BOOTSTRAP
=========================

Target: [service/context]

Responsibility:
- ...

Public APIs:
- ...

Package Skeleton:
- ...

Persistence / Config:
- ...

Verification Plan:
- ...
```
