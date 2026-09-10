# Claude Code 역할별 에이전트 운영 가이드

## 목적

작업의 난이도와 위험도에 맞춰 하위 에이전트(subagent)의 모델을 고른다. 단순 작업에 고비용 추론을 반복하지 않으면서, 버그·리팩토링·아키텍처 작업에는 충분한 검토 깊이를 확보하는 것이 목적이다.

이 문서는 [Codex 역할별 에이전트 운영 가이드](codex-agents.md)의 Claude Code 대응본이다. **역할 분류와 라우팅 판단은 두 호스트가 같고, 실행 수단만 다르다.** 공용 진입점은 `dev-orchestrator` 스킬이다.

정의 파일은 `.claude/agents/*.md` 이므로 이 저장소를 여는 다른 PC 와 세션에도 동일하게 적용된다. 개인 인증·권한 설정(`.claude/settings.local.json`)은 저장소에 넣지 않는다.

## 운영 결론

**모든 대화에서 에이전트를 자동으로 병렬 실행하지 않는다.** 역할 파일은 항상 발견 가능하게 두고, `dev-orchestrator` 가 개발 작업을 분류해 필요한 역할만 호출한다.

- 명시 호출: `/dev-orchestrator 작업 내용`
- 암시 선택: 비단순 개발 요청이 스킬 설명과 일치할 때
- 직접 요청: 특정 역할이 필요하면 `explorer 로 호출 흐름을 조사해줘` 처럼 요청

## Codex 설정과의 대응

| Codex | Claude Code |
|-------|-------------|
| `.codex/agents/<name>.toml` | `.claude/agents/<name>.md` |
| `name` / `description` | YAML frontmatter `name` / `description` |
| `developer_instructions` | frontmatter 아래 본문 (Markdown) |
| `model` | frontmatter `model` |
| `model_reasoning_effort` | **대응 필드 없음** — 모델 선택과 본문 지시로 흡수한다 |
| `sandbox_mode = "read-only"` | frontmatter `tools: Read, Grep, Glob, Bash` (Write/Edit 미부여) |
| `sandbox_mode = "workspace-write"` | `tools` 생략 (전체 도구 상속) |
| 동시 스레드 상한 설정 | **설정 키 없음** — 아래 병렬화 규칙으로 규율한다 |

- 이름은 각 호스트 관례를 따른다. Codex 는 snake_case(`crud_implementer`), Claude Code 는 kebab-case(`crud-implementer`)다. 역할과 모델 등급은 동일하다.
- 읽기 전용 강제는 Claude Code 에서 **도구 목록**으로 표현한다. `tools` 에 `Write`/`Edit` 를 넣지 않으면 그 역할은 파일을 고칠 수 없다. `Bash` 는 검사·테스트 실행용으로 부여하며, 본문에서 편집 금지를 명시한다.

## 역할과 모델

### 공용 역할 (Codex 7종 대응)

| 역할 | 모델 | 권한 | 사용 시점 |
|------|------|------|-----------|
| `explorer` | Sonnet | 읽기 전용 | 파일 탐색, 호출 흐름, 의존성·영향 범위 파악 |
| `crud-implementer` | Sonnet | 쓰기 | DTO·매핑·단순 검증·Swagger·설정·작은 테스트 |
| `implementer` | Opus | 쓰기 | 일반 기능과 **원인이 확정된** 버그 구현 |
| `bug-investigator` | Opus | 읽기 전용 | 어려운 버그·트랜잭션·동시성·데이터 정합성 원인 분석 |
| `reviewer` | Opus | 읽기 전용 | 최종 diff 의 정확성·회귀·보안·테스트 검토 |
| `refactorer` | Opus | 쓰기 | 동작 보존 리팩토링 구현 |
| `architect` | Fable | 읽기 전용 | 교차 모듈·MSA·보안·트랜잭션 설계 |

### 백엔드 전용 역할

`backend/docs/team-playbook.md` 가 정의한 역할의 실행 파일이다. Leader 는 메인 실행자가 맡으므로 파일이 없다.

| 역할 | 모델 | 권한 | 사용 시점 |
|------|------|------|-----------|
| `be-executor` | Opus | 쓰기 | Hexagonal 계층·Port/Adapter 실구현 |
| `be-hexagonal-reviewer` | Opus | 읽기 전용 | 계층 흐름과 Port/Adapter 경계 검토 |
| `be-db-reviewer` | Opus | 읽기 전용 | 엔티티·쿼리·인덱스·Redis 키 검토 (N+1 우선) |
| `be-security-reviewer` | Opus | 읽기 전용 | JWT·인가·게이트웨이·비밀정보 검토 (보안 변경 시에만) |

`implementer` 와 `be-executor` 는 둘 다 쓰기 역할이다. 백엔드 작업은 규칙이 더 두꺼운 `be-executor` 를 우선하고, `implementer` 는 FE 나 양쪽에 걸친 작업, 문서 갱신을 동반한 일반 구현에 쓴다.

### 프론트엔드 전용 역할

**아직 만들지 않았다.** FE 작업은 공용 역할(`explorer`·`implementer`·`reviewer`)을 쓰고, 프로세스는 `frontend/CLAUDE.md` 의 superpowers 흐름(명세 → 계획 → 구현 → 검증)을 따른다. FE 전용 역할(명세·API 계약·디자인·테스트 등)이 필요해지면 별도 이슈로 정한다.

### 세션 모델과 하위 에이전트

위 표는 **하위 에이전트**의 모델이다. 메인 실행자(사용자와 대화하는 세션)의 모델은 사용자가 고르며, 그에 따라 역할이 갈린다.

| 세션 모델 | 메인 실행자가 직접 하는 것 | 하위 에이전트로 넘기는 것 |
|-----------|----------------------------|---------------------------|
| **Fable** | 작업 분류, 계획(plan), 설계·아키텍처 판단, 결과 통합, 최종 판단. `architect` 를 따로 부르지 않는다 — 같은 모델을 두 번 쓰는 셈이다 | 탐색(`explorer` Sonnet), 구현(`crud-implementer` Sonnet · `implementer`/`be-executor` Opus), 검토(`reviewer`·`be-*-reviewer` Opus), 버그 분석(`bug-investigator` Opus), 리팩토링(`refactorer` Opus) |
| **Opus 이하** | 분류·계획·통합 | 위 표 그대로. 설계가 필요하면 `architect`(Fable) 를 부른다 |

규칙은 셋이다.

1. **하위 에이전트에 Fable 을 쓰지 않는다.** Fable 은 되돌리기 비싼 판단(설계·범위·트레이드오프)에 쓰는 모델이고, 그 판단은 메인이 맥락을 가장 많이 들고 있을 때 해야 한다. 하위 에이전트는 맥락을 잘라 받으므로 Fable 을 줘도 그만큼 나오지 않는다.
2. **실행은 위임한다.** 세션이 Fable 이어도 diff 를 만드는 손과 diff 를 읽는 눈은 Opus/Sonnet 하위 에이전트다. 메인이 직접 구현해도 되는 것은 `dev-orchestrator` SIMPLE 의 「위임 비용이 더 큰 한 줄 변경」뿐이다.
3. **모델을 낮추지 않는다.** 하위 에이전트 모델은 역할표가 정한다. 세션이 Fable 이라는 이유로 `reviewer` 를 Sonnet 으로 내리지 않고, 세션이 Sonnet 이라는 이유로 `implementer` 를 Sonnet 으로 내리지 않는다. 비용을 줄이려면 호출 횟수를 줄인다(형식적 탐색·검토 생략).

호출 방법은 그대로다 — `Agent` 도구의 `subagent_type` 으로 역할을 고르면 `.claude/agents/*.md` 의 `model` 이 붙는다. `model` 을 호출 시점에 덮어쓰지 않는다.

### 모델 가용성

`fable` 을 쓸 수 없는 계정에서는 `architect` 가 세션 기본 모델로 떨어지거나 호출이 거절될 수 있다. 아키텍처 작업을 시작하기 전에 `.claude/agents/architect.md` 의 `model` 을 팀이 합의한 대체 모델(`opus`)로 조정하거나, 제한을 메인 실행자에게 보고한다.

## 작업별 라우팅

| 작업 | 기본 흐름 | 병렬화 |
|------|-----------|--------|
| 단순 CRUD | `crud-implementer` → 대상 테스트 | 없음 |
| 일반 기능 (BE) | 필요 시 `explorer` → `be-executor` → 위험할 때 `be-hexagonal-reviewer` | 보통 없음 |
| 일반 기능 (FE·공통) | 필요 시 `explorer` → `implementer` → 위험할 때 `reviewer` | 보통 없음 |
| 어려운 버그 | `bug-investigator` + `explorer` → 원인 확정 → `implementer`/`be-executor` → `reviewer` | 앞의 읽기 역할만 |
| 리팩토링 | `explorer` + `reviewer` → 범위 확정 → `refactorer` → `reviewer` | 최초 읽기 역할만 |
| 아키텍처 | `architect` + `explorer` → 설계 확정 → 단일 구현자 → `reviewer` | 설계·탐색만 |
| DB/쿼리 구조 변경 | `be-executor` → `be-db-reviewer` + `be-hexagonal-reviewer` | 검토 역할만 |
| 보안/인증 변경 | `be-executor` → `be-security-reviewer` + `be-hexagonal-reviewer` | 검토 역할만 |
| 대형 기능 | `backend-multi-agent` 로 발견 작업 분리 → 통합 계획 → 순차 구현 | 독립적인 읽기 역할만 |

## 병렬화 규칙

Claude Code 에서 병렬 실행은 **한 메시지 안에 여러 Agent 호출을 넣는 것**이다. 메시지를 나눠 보내면 순차 실행된다.

병렬화해도 되는 작업:

- 저장소 탐색과 의존성 분석
- API·테스트 공백·로그 조사
- 아키텍처·보안·DB 검토
- 서로 파일과 외부 상태를 바꾸지 않는 읽기 전용 검토

병렬화하지 않는 작업:

- 같은 파일이나 같은 공개 계약 편집
- DB 스키마와 공유 도메인 객체 변경
- 여러 구현자가 하나의 기능을 동시에 수정하는 작업
- 커밋·푸시·이슈·PR 생성 같은 저장소 통합 작업

동시 실행은 **읽기 전용 역할 2~3개**를 상한으로 본다. 상한을 채우는 것이 목표가 아니며, 보통 1~2개면 충분하다.

**하위 에이전트는 다시 하위 에이전트를 생성하지 않는다.** 모든 역할 파일에 이 금지가 들어 있다. 추가 위임이 필요하면 메인 실행자가 작업 경계를 다시 나눈다.

## 결과를 다루는 방법

- **검토 보고를 그대로 믿지 않는다.** 근거(파일·행·증거)가 없는 지적은 메인 실행자가 확인한 뒤 반영한다.
- 하위 에이전트가 "검증을 통과했다" 고 보고해도, 최종 완료 보고 전에 메인 실행자가 검증 명령을 한 번 더 돌린다.
- 역할 간 지적이 충돌하면 해당 워크스페이스 `docs/*.md` 를 정본으로 판정한다.

## 완료 조건

1. 요청한 동작이 구현되었다.
2. 영향 범위가 컴파일되고 관련 테스트가 통과했다.
3. 필요한 수준의 최종 검토가 끝났다.
4. CRITICAL/HIGH 지적이 해결되었다.
5. 불필요한 변경과 겹치는 동시 편집이 없다.
6. 실제 실행한 검증과 남은 위험을 메인 실행자가 보고한다.

## 프로젝트 스킬과의 관계

- `dev-orchestrator` — 전체 작업 분류와 역할·모델 선택 (공용 진입점)
- `backend-multi-agent` — 백엔드 대형 작업의 역할 구성
- `backend-feature-bootstrap`, `backend-api-check`, `hexagonal-guard` — 착수와 구현 후 계약·경계 검증
- `issue`, `pr`, `mr`, `context-handoff`, `context-resume` — 협업 문서와 세션 인계

`dev-orchestrator` 가 기존 스킬을 대체하지 않는다. 먼저 비용과 실행 순서를 정하고, 필요한 프로젝트 전문 스킬을 결합한다.

## 검증

에이전트 정의를 바꾸면 다음을 확인한다.

```bash
sh scripts/check-claude-agents.sh    # frontmatter, name↔파일명, model, 읽기 전용 권한, BOM, gitignore 추적
python scripts/sync-agent-skills.py --check
git diff --check
```

`check-claude-agents.sh` 는 Python 이 아니라 sh 로 쓰여 있다. Python 이 없는 PC(Microsoft Store 스텁만 있으면 `python` 이 exit 49 로 죽는다)에서도 Git Bash 만 있으면 돈다.

**읽기 전용 역할을 추가하면 스크립트의 `read_only_roles` 목록에도 이름을 넣는다.** `tools` 를 생략한 에이전트는 전체 도구를 상속해 조용히 쓰기 권한을 갖게 되는데, 목록에 없으면 그것을 아무도 잡지 못한다.

새 역할을 추가하면 이 문서의 표와 `dev-orchestrator` 스킬의 역할 표를 함께 갱신한다. `.gitignore` 는 `.claude/*` 를 통째로 무시하고 `.claude/agents/` 만 예외로 열어 두므로, 새 파일이 추적되는지 `git status` 로 확인한다.

## 주의: 다른 저장소 에이전트와의 충돌

같은 사람이 여는 다른 저장소(예: 혼디가개)에 이름이 같은 프로젝트 스코프 에이전트가 있다. 정의는 저장소별로 분리돼 있어 섞이지 않지만, 사용자 전역(`~/.claude/agents/`)에 같은 이름을 두면 프로젝트 정의와 겹친다. **이 저장소의 프로젝트 스코프 정의가 우선한다.** 역할이 `shared-travel`·`/internal/v1`·반려견 도메인을 말하면 다른 저장소의 에이전트를 읽고 있는 것이다.

## 공식 문서

- [Claude Code Subagents](https://docs.claude.com/en/docs/claude-code/sub-agents)
- [Claude Code Settings](https://docs.claude.com/en/docs/claude-code/settings)
