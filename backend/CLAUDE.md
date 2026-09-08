# BossPickSeoul Backend Claude Guide

## 목적

- 이 문서는 `backend/` 작업 시 Claude Code가 먼저 확인하는 요약 엔트리다.
- 실제 규칙의 단일 기준은 `backend/docs/*.md`다.

## 우선 확인 문서

1. `docs/README.md`
2. `docs/architecture-guide.md`
3. `docs/coding-conventions.md`
4. `docs/api-design-guide.md`
5. `docs/service-playbook.md`
6. `docs/done-checklist.md`

## 운영 원칙

- `AGENTS.md`, `CLAUDE.md`는 엔트리 문서다.
- 세부 규칙은 `docs/`에 모은다.
- 구현 중 새 규칙이 생기면 엔트리 문서보다 해당 `docs/*.md`를 먼저 갱신한다.
- 서비스별 차이는 `docs/services/*.md`에 정리한다.

## 스킬 / 에이전트

- 스킬은 `/스킬명` 으로 호출한다 — 착수 `backend-feature-bootstrap`, 계약 점검 `backend-api-check`, 경계 점검 `hexagonal-guard`, 대형 작업 역할 구성 `backend-multi-agent`, 작업 분류·역할 선택 `dev-orchestrator`.
- 역할별 subagent 는 `.claude/agents/*.md` 에 있다. 백엔드 구현은 `be-executor`, 검토는 `be-hexagonal-reviewer` / `be-db-reviewer` / `be-security-reviewer` (읽기 전용). 공용 역할과 모델 배정의 정본은 `../docs/claude-agents.md`, 역할 조합은 `docs/team-playbook.md`.
- 모든 작업을 병렬화하지 않는다. 독립적인 읽기 전용 검토만 한 메시지 안에서 병렬 호출하고, 같은 파일을 고치는 쓰기 역할은 하나만 실행한다.

## 파일 인코딩 규칙 (필수)

- **모든 소스 / 설정 / 문서 파일은 반드시 `UTF-8` (no BOM) 로 저장한다.**
- Windows 는 기본이 CP949 이므로 에디터/도구가 CP949 로 저장하면 한글이 깨진다. Claude Code 와 Codex 를 번갈아 쓰면 이 문제가 자주 발생한다.
- 강제 설정이 이미 적용되어 있으니 덮어쓰지 말 것:
  - `.editorconfig` — `charset = utf-8`
  - `.gitattributes` — `*.java working-tree-encoding=UTF-8`
  - `build.gradle` — `options.encoding = 'UTF-8'` (subprojects 공통)
- 새 파일을 만들 때 한글을 포함한다면 `Write` 툴로 UTF-8 기본 저장을 유지한다.
- `git status` 에서 수정된 적 없는데 diff 가 잡히면 인코딩 문제를 의심하고 `file <파일>` 로 확인한다.
