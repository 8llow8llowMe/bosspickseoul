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
   - plural REST resource paths that reflect the domain hierarchy
   - auth policy using `@PreAuthorize`, Resource Server, and JWT claims as appropriate
   - request/response model names

3. Create structure
   ```text
   domainlayer/<context>
     |- adapter
     |  |- in/web { controller, dto/{request,response,item}, presenter }
     |  \- out   { persistence/{entity,repository,*Adapter}, client }
     |- application
     |  |- command, info, mapper, model
     |  |- port/{in,out}
     |  \- service { *WebFacade, processor }
     \- domain/model
   ```

4. Define persistence and config
   - entity or DDL needs
   - index and soft-delete strategy
   - `@ConfigurationProperties` if settings are needed

5. Define internal service integration when needed
   - prefer `FeignClient` for synchronous Spring-to-Spring calls
   - preserve the `FeignClient -> Adapter -> QueryResult` boundary

6. Verify
   - Swagger
   - transaction boundaries
   - compile/test/check
   - update `service-inventory.md` and relevant `services/*.md` docs

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

Internal Integration:
- ... (Feign or none)

Verification Plan:
- ...
```
