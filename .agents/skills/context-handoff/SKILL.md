---
name: context-handoff
description: Save the current work state as a repository handoff document for another chat, agent, worktree, or device. Use when the user invokes /context-handoff or $context-handoff and asks to save, hand off, or preserve the current context.
---

# Context Handoff

Save the current session state to an append-only Markdown document under `docs/handoffs/` so another agent can resume it later.

## Safety Boundary

- Do not modify product code while creating the handoff.
- Read repository and conversation state, then write only the new handoff document.
- Never overwrite or delete an existing handoff.
- Do not include credentials, tokens, personal data, or other secrets.
- Do not commit or push unless the user explicitly requests it.

## Workflow

1. Infer a concise title from the user's argument or current task. Ask only if no reliable title can be inferred.
2. Locate the repository root and collect the current branch, working-tree status, diff summary, recent commits, decisions, verification evidence, and unfinished work.
3. Create `docs/handoffs/<YYYY-MM-DD-HHmmss>-<slug>.md` using local time. Keep the slug filesystem-safe; if Korean or other non-ASCII text cannot be represented cleanly, use a short English slug. If the name already exists, add a unique suffix.
4. Write the document using the template below. `files` should contain paths reported by version control, or files changed during the session when version control has no entries.
5. Confirm the created path and summarize the highest-priority next step. Explain that a commit and push are required before another device can see the document, but do not perform them without explicit permission.

## Document Template

```markdown
---
project: {repository name}
cwd: {current working directory}
branch: {branch or none}
timestamp: {ISO-8601 timestamp with timezone}
title: {original title}
files:
  - {changed file path}
---

## 작업 주제: {title}

### 요약

{Goal and current progress in 1-3 sentences.}

### 내린 결정

- {Decision, tradeoff, and reason.}

### 남은 작업

1. {Concrete next step in priority order.}

### 검증 내역

- {Command or check and result.}

### 주의사항

- {Pitfall, blocker, failed attempt, or open question.}
```

## Completion Message

Report the title, repository, created path, changed-file count, and the command pattern the user can run to commit and push `docs/handoffs/`. Tell the user to invoke `/context-resume` in Cursor or `$context-resume` in Codex to continue.
