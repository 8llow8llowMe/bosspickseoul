# BossPickSeoul Claude Guide

## 목적

- 이 문서는 저장소 **루트**에서 작업을 시작할 때 Claude Code 가 먼저 확인하는 엔트리다.
- 실제 규칙의 정본은 각 워크스페이스의 `docs/` 다. 이 문서는 지도 역할만 한다.
- 루트 `AGENTS.md` 는 oh-my-codex(OMX)가 생성한 **Codex 운영 계약**이다. Claude Code 는 이 문서를 엔트리로 쓴다.

## 워크스페이스

| 경로 | 대상 | 엔트리 문서 | 규칙 정본 |
|------|------|-------------|-----------|
| `backend/` | Spring MSA + Hexagonal | `backend/CLAUDE.md` | `backend/docs/*.md` |
| `frontend/` | Next.js App Router + BFF | `frontend/CLAUDE.md` | `frontend/docs/*.md`, `frontend/DESIGN.md` |

**작업 시작 시 해당 워크스페이스의 엔트리 문서를 먼저 읽는다.** 두 워크스페이스에 걸친 작업이면 양쪽 다 읽는다.

## 공통 규칙

### 파일 인코딩 (필수)

- **모든 소스 / 설정 / 문서 파일은 반드시 `UTF-8` (no BOM) 로 저장한다.**
- Windows 는 기본이 CP949 이므로 에디터/도구가 CP949 로 저장하면 한글이 깨진다. Claude Code 와 Codex 를 번갈아 쓰면 이 문제가 자주 발생한다.
- 강제 설정이 적용되어 있으니 덮어쓰지 말 것: 루트 `.editorconfig`, `.gitattributes`, `backend/build.gradle` 의 encoding.
- `git status` 에서 수정한 적 없는데 diff 가 잡히면 인코딩 문제를 의심한다.

### 커밋 / PR / 이슈 prefix

| prefix | 범위 |
|--------|------|
| `[BE]` | `backend/` 코드·문서 |
| `[FE]` | `frontend/` 코드·문서 |
| `[INFRA]` | 빌드·CI·Claude/Codex 설정·저장소 공통 설정 |

형식: `[BE] feat: 자치구 상권변화지표 데이터셋을 추가한다`. 타입은 `feat` / `fix` / `chore` / `refactor` / `docs` / `test` (`.github/pull_request_template.md` 기준). 기능별로 커밋을 나누고, 브랜치는 `<type>/<영역>/<요약>` (예: `feature/fe/simulation-step-flow`, `chore/infra/agent-orchestration`).

### 운영 원칙

- 엔트리 문서는 얇게 유지하고, 세부 규칙은 각 워크스페이스 `docs/` 에 모은다.
- 구현 중 새 규칙이 생기면 엔트리 문서보다 해당 `docs/*.md` 를 먼저 갱신한다.
- 코드 변경과 문서 변경은 같이 움직인다.
- 새 반복 패턴이 생기면 `.agents/skills/` 공용 스킬화를 검토하고 `.claude/skills/` 미러를 동기화한다.

## 스킬 / 에이전트

스킬 정본은 `.agents/skills/*` 이고 Claude Code 호환 미러는 `.claude/skills/*` 다. 관리 규칙은 [docs/agent-skills.md](docs/agent-skills.md) 를 따른다. Claude Code 에서는 `/스킬명` 으로 호출한다.

| 구분 | 백엔드 | 공통 |
|------|--------|------|
| 착수 | `backend-feature-bootstrap` | |
| 계약 점검 | `backend-api-check` | |
| 경계 점검 | `hexagonal-guard` | |
| 멀티 에이전트 | `backend-multi-agent` | |
| 개발 오케스트레이션 | | `dev-orchestrator` |
| 협업 문서 | | `issue`, `pr`, `mr` |
| 세션 인계 | | `context-handoff`, `context-resume` |

### 역할별 subagent

정의는 `.claude/agents/*.md` 이고 역할·모델·권한의 정본은 [docs/claude-agents.md](docs/claude-agents.md) 다. Codex 쪽 대응본은 [docs/codex-agents.md](docs/codex-agents.md).

| 구분 | 역할 |
|------|------|
| 공용 | `explorer`, `crud-implementer`, `implementer`, `bug-investigator`, `reviewer`, `refactorer`, `architect` |
| 백엔드 | `be-executor`, `be-hexagonal-reviewer`, `be-db-reviewer`, `be-security-reviewer` |

- 모델 배정: 설계·아키텍처는 **Fable**, 어려운 구현·버그 분석·리팩토링·최종 검토는 **Opus**, 탐색·DTO·매핑 같은 저비용 반복은 **Sonnet**.
- **세션 모델이 Fable 이면 계획은 메인이, 실행은 하위 에이전트가 한다.** 작업 분류·계획·설계 판단·결과 통합은 Fable 인 메인 실행자가 직접 하고(`architect` 를 따로 부르지 않는다), 리뷰·구현·탐색은 위 배정표대로 **Opus / Sonnet** 하위 에이전트에 위임한다. 하위 에이전트에 Fable 을 쓰지 않는다. 세션 모델이 Opus 이하면 기존 배정표를 그대로 따른다. 상세는 [docs/claude-agents.md](docs/claude-agents.md) 「세션 모델과 하위 에이전트」.
- 검토 역할은 `tools` 로 읽기 전용을 강제한다. Write/Edit 를 부여하지 않는다.
- **모든 작업을 병렬화하지 않는다.** 서로 독립적인 읽기 전용 조사·검토만 한 메시지 안에서 병렬 호출하고, 같은 파일을 고치는 쓰기 역할은 한 번에 하나만 실행한다.
- 작업 분류와 라우팅은 `dev-orchestrator` 스킬을 쓴다.
- 정의를 바꾸면 `sh scripts/check-claude-agents.sh` 와 `python scripts/sync-agent-skills.py --check` 로 검사한다.

세부 역할 조합은 `backend/docs/team-playbook.md`.
