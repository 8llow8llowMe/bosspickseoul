---
name: hexagonal-guard
description: Check NowDoBoss backend hexagonal boundaries, including Controller/WebUseCase/WebFacade/Processor/Presenter and Port/Adapter separation.
---

# Hexagonal Guard

Guard the backend against layer leaks and broken hexagonal boundaries.

## When to Use

Use this skill when:
- a user asks for architecture review or hexagonal refactoring
- a new context or service is being added
- processor, adapter, presenter, or mapper boundaries feel blurred
- port return types or adapter imports are starting to leak upward

## Read First

1. `backend/docs/architecture-guide.md`
2. `backend/docs/coding-conventions.md`
3. `backend/docs/service-playbook.md`

## What to Check

1. Layer ownership
   - Controller only orchestrates request/response flow
   - WebFacade is the main use case orchestrator
   - Processor returns `Info` or domain models, not response DTOs
   - Presenter is the only `Info -> Response` mapper

2. Port / Adapter boundary
   - `application` does not depend on `adapter` types
   - out-ports expose contracts only
   - adapters encapsulate JPA/Redis/external API details

3. Query and mapping
   - read paths use `QueryResult` when needed
   - `Info` does not cross outward through ports
   - entity/domain conversion is handled by MapStruct mappers

4. Write flow
   - save flows prefer `domain -> entity -> repository.save -> entity -> domain`
   - ID generation happens in processor or a clear upstream orchestration point

## Output Format

```text
HEXAGONAL GUARD REPORT
======================

Scope: [context or service]

Boundary Issues:
1. [severity] [file/path]
   - current leak
   - expected boundary
   - recommended refactor

Healthy Patterns:
- [existing patterns worth keeping]

Next Fix Order:
1. ...
2. ...
```
