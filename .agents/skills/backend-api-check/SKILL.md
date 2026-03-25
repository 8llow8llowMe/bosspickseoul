---
name: backend-api-check
description: Check backend REST API paths, Swagger metadata, response wrappers, and Presenter usage against the NowDoBoss backend docs.
---

# Backend API Check

Check whether a backend API implementation follows the NowDoBoss backend API design rules.

## When to Use

Use this skill when:
- a user asks to review or refine backend API design
- you add or change a controller, request/response DTO, or presenter
- you want to sanity-check RESTful path consistency
- you want to verify Swagger coverage before PR

## Read First

Open these docs before judging the implementation:

1. `backend/docs/api-design-guide.md`
2. `backend/docs/coding-conventions.md`
3. `backend/docs/done-checklist.md`

## What to Check

1. Path design
   - resource names are plural and meaningful
   - nesting depth reflects domain hierarchy
   - summary or comparison endpoints still read naturally inside the resource chain

2. Controller flow
   - controller calls only `*WebUseCase`
   - method naming matches the use case
   - response shape is `ResponseEntity<Response<T>>`

3. Response design
   - internal `Info` is not exposed directly
   - nested response composition is handled by Presenter
   - `SliceResponse` is used when infinite scroll fits the endpoint

4. Swagger coverage
   - `@Tag`, `@Operation`, `@Parameter`, `@Schema`
   - Korean descriptions by default
   - `@SecurityRequirement` exists for authenticated APIs

## Output Format

```text
BACKEND API CHECK
=================

Scope: [controller or feature]

Findings:
1. [severity] [file/path]
   - issue
   - expected rule
   - recommended fix

Confirmed:
- [what already matches the docs]

Residual Risk:
- [none or short note]
```
