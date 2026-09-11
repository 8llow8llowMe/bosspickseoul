# 에이전트 공용 스킬 관리

## 목적

BossPickSeoul 프로젝트 스킬을 Claude Code, Codex, Cursor 에서 같은 내용으로 사용한다. 프로젝트 고유 규칙의 정본은 기존처럼 각 워크스페이스의 `docs/` 이며, 스킬은 해당 규칙을 작업별로 불러오는 진입점이다.

## 디렉터리와 호출 방식

| 대상 | 발견 경로 | 호출 방식 |
|------|-----------|-----------|
| Codex | `.agents/skills/<name>/SKILL.md` | `$name` |
| Cursor | `.agents/skills/<name>/SKILL.md` | `/name` |
| Claude Code | `.claude/skills/<name>/SKILL.md` | `/name` |

- `.agents/skills/` 를 공용 정본으로 사용한다.
- `.claude/skills/` 는 Claude Code 가 발견할 수 있도록 같은 파일을 유지하는 호환 미러다.
- 두 디렉터리의 스킬 이름, 파일 집합, 파일 내용은 byte 단위로 같아야 한다. **예외**는 `context-handoff` / `context-resume` 두 개다 — Claude Code 판은 툴 이름과 한국어 프롬프트가 다르게 설계돼 있어 두 판을 따로 유지한다.
- `.agents/skills/` 에는 OMX(oh-my-codex)가 로컬에 설치하는 스킬도 함께 놓이지만 `.gitignore` 로 무시된다. 추적되는 프로젝트 스킬은 `.gitignore` 의 예외 목록과 `scripts/sync-agent-skills.py` 의 목록이 정한다.

## 추적되는 프로젝트 스킬

| 구분 | 스킬 |
|------|------|
| 착수 | `backend-feature-bootstrap` |
| 계약 점검 | `backend-api-check` |
| 경계 점검 | `hexagonal-guard` |
| 멀티 에이전트 | `backend-multi-agent` |
| 개발 오케스트레이션 | `dev-orchestrator` |
| 협업 문서 | `issue`, `pr`, `mr` — GitHub/GitLab **라벨은 붙이지 않는다.** Cursor·Codex·Claude Code 동일. 라벨은 사람이 단다 |
| 세션 인계 | `context-handoff`, `context-resume` (호스트별 별도 판) |

## 변경 절차

1. `.agents/skills/<name>/` 의 스킬을 수정하거나 추가한다.
2. 새 스킬이면 `.gitignore` 의 `.agents/skills/` 와 `.claude/skills/` 예외 목록, `scripts/sync-agent-skills.py` 의 `MIRRORED_SKILLS` 에 이름을 추가한다.
3. 아래 명령으로 Claude Code 미러를 갱신한다.

   ```bash
   python scripts/sync-agent-skills.py --write
   ```

4. 아래 명령으로 파일 집합, 내용, frontmatter, 링크, UTF-8 no BOM, `.gitignore` 예외를 검사한다.

   ```bash
   python scripts/sync-agent-skills.py --check
   ```

5. 이름과 설명이 실제 사용 시점을 구분하는지 확인한다. 상세 규칙은 `docs/` 에 두고 `SKILL.md` 에는 작업 흐름과 필요한 문서 링크만 둔다.

## 호스트 독립성

- 스킬 본문에 특정 호스트의 도구 이름을 필수 전제로 두지 않는다.
- 병렬 역할 분리가 필요하면 현재 호스트가 제공하는 subagent/agent 기능을 사용한다.
- agent 기능이 없으면 메인 실행자가 같은 역할을 순서대로 수행한다.
- 구현 파일은 한 실행자만 수정하고 Reviewer 역할은 읽기 전용으로 유지한다.
- 외부 상태를 변경하거나 위험한 명령을 실행할 권한은 스킬 호출만으로 확대되지 않는다.

## 개발 오케스트레이션

`dev-orchestrator` 는 CRUD, 일반 기능, 버그, 리팩토링, 아키텍처, 대형 기능을 분류해 필요한 역할만 선택하는 공용 진입점이다. 항상 여러 에이전트를 호출하지 않고 독립적인 읽기 전용 작업만 선택적으로 병렬화한다.

프로젝트 범위 역할 파일과 모델 배정의 정본은 호스트별로 나뉜다.

| 호스트 | 역할 파일 | 정본 문서 | 검사 |
|--------|-----------|-----------|------|
| Codex | `.codex/agents/*.toml` | [Codex 역할별 에이전트 운영 가이드](codex-agents.md) | `tomllib` 파싱 |
| Claude Code | `.claude/agents/*.md` | [Claude Code 역할별 에이전트 운영 가이드](claude-agents.md) | `sh scripts/check-claude-agents.sh` |

**작업 분류와 라우팅 판단은 두 문서가 같다.** 다른 것은 실행 수단(TOML 설정 vs Markdown frontmatter), 모델 이름, 읽기 전용 강제 방식(`sandbox_mode` vs `tools`)뿐이다. Cursor 처럼 전용 역할 파일이 없는 호스트에서는 같은 스킬의 작업 분류를 쓰되 해당 호스트의 역할 위임 기능에 맞춰 실행하고, 기능이 없으면 메인 실행자가 순서대로 수행한다.

## 인코딩

- 모든 `SKILL.md`, 에이전트 정의, 참고 문서, 스크립트는 UTF-8 no BOM 으로 저장한다.
- Windows PowerShell 5 는 UTF-8 no BOM 스크립트의 한글 리터럴을 CP949 로 오해할 수 있다. 외부 API 에 한글을 보낼 때는 Python 또는 UTF-8 처리가 명시된 런타임을 사용하고, 저장 후 다시 조회해 왕복 검증한다.
