# Codex 역할별 에이전트 운영 가이드

## 목적

프로젝트 작업의 난이도와 위험도에 맞춰 하위 에이전트 모델을 선택한다. 단순 작업에 고비용 추론을 반복하지 않으면서도, 버그·리팩토링·아키텍처 작업에는 충분한 검토 깊이를 확보하는 것이 목적이다.

역할 정의는 저장소의 `.codex/agents/*.toml` 에 있으므로 이 저장소를 신뢰하고 여는 다른 PC 와 세션에도 동일하게 적용된다. 개인 인증·권한 설정은 저장소에 넣지 않는다.

## 운영 결론

**모든 대화에서 에이전트를 자동으로 병렬 실행하지 않는다.** 역할 파일은 항상 발견 가능하게 두고, `dev-orchestrator` 가 개발 작업을 분류해 필요한 역할만 호출한다.

- 명시 호출: Codex 에서 `$dev-orchestrator 작업 내용`
- 암시 선택: 비단순 개발 요청이 스킬 설명과 일치할 때
- 직접 요청: 특정 역할이 필요하면 `explorer 로 호출 흐름을 조사해줘` 처럼 요청

루트 `AGENTS.md` 는 oh-my-codex(OMX)가 생성한 운영 계약이고 이 저장소가 직접 관리하지 않는다. OMX 의 위임 규칙(직접 작업 우선, 필요할 때만 위임)은 그대로 유효하며, 이 문서의 역할 라우팅은 그 안에서 **어느 역할·모델을 고르는가**를 정한다.

## `.codex/` 디렉터리와 추적 범위

이 저장소의 `.codex/` 는 OMX 가 세션·인증·로그까지 함께 쓰는 로컬 디렉터리라 `.gitignore` 로 통째로 무시한다. **추적하는 것은 `.codex/agents/*.toml` 만이다.** `.codex/config.toml` 은 OMX 가 관리하는 개인 파일(WSL 경로, MCP 서버, 개인 trust 설정)이므로 커밋하지 않는다.

Codex 하위 에이전트를 쓰려면 로컬 `.codex/config.toml`(또는 `~/.codex/config.toml`)에 아래가 있어야 한다. 현재 OMX 설정에는 `[features] multi_agent = true` 가 이미 들어 있다.

```toml
[features]
multi_agent = true

[agents]
max_concurrent_threads_per_session = 4
default_subagent_model = "gpt-5.6-terra"
default_subagent_reasoning_effort = "medium"
```

- 상한 4 는 **하위 에이전트 스레드 수**이며 메인 스레드는 제외된다. 상한을 채우는 것이 목표가 아니다. 보통 읽기 전용 역할 1~2개면 충분하다.
- 역할 파일에 모델과 추론 강도가 있으면 그 값이 기본값보다 우선한다.
- 프로젝트 범위 설정은 사용자가 저장소를 신뢰한 경우에만 로드된다.

### OMX 역할과의 이름 충돌

OMX 는 `.codex/config.toml` 에 `[agents.architect]`, `[agents.explore]` 등 자체 역할을 `config_file` 로 등록한다. 이 저장소의 `.codex/agents/architect.toml` 은 **이름이 겹친다.** 어느 정의가 잡히는지는 Codex 버전의 해석 순서에 따라 다르므로, 아키텍처 작업 전에 호출된 역할이 이 문서의 고정 결정(Hexagonal 계층, `shared-commercial`, Feign 서킷)을 아는지 확인한다. 프로젝트 정의를 확실히 쓰려면 로컬 `config.toml` 의 `[agents.architect]` 테이블을 지우거나, 그 `config_file` 을 `.codex/agents/architect.toml` 로 바꾼다. 나머지 6종(`explorer`, `crud_implementer`, `implementer`, `bug_investigator`, `reviewer`, `refactorer`)은 OMX 이름과 겹치지 않는다.

## 역할과 모델

| 역할 | 모델 | 추론 | 권한 | 사용 시점 |
|------|------|------|------|-----------|
| `explorer` | `gpt-5.6-terra` | medium | read-only | 파일 탐색, 호출 흐름, 의존성 파악 |
| `crud_implementer` | `gpt-5.6-terra` | medium | workspace-write | 명확한 CRUD·DTO·매핑·검증·작은 테스트 |
| `implementer` | `gpt-5.6-sol` | medium | workspace-write | 일반 기능과 원인이 확정된 버그 구현 |
| `bug_investigator` | `gpt-5.6-sol` | high | read-only | 어려운 버그·트랜잭션·동시성·보안 원인 분석 |
| `reviewer` | `gpt-5.6-sol` | high | read-only | 최종 diff 의 정확성·회귀·보안·테스트 검토 |
| `refactorer` | `gpt-5.6-sol` | high | workspace-write | 동작 보존 리팩토링 구현 |
| `architect` | `gpt-6-astra` | high | read-only | 교차 모듈·MSA·보안·트랜잭션 설계 |

모델 접근 권한은 계정과 배포 상태에 따라 다를 수 있다. `gpt-6-astra` 를 사용할 수 없는 계정에서는 아키텍처 작업을 시작하기 전에 `.codex/agents/architect.toml` 의 모델을 팀이 합의한 대체 모델로 조정하거나 메인 실행자에게 제한을 보고한다.

백엔드 전용 역할(`be-executor`, `be-hexagonal-reviewer`, `be-db-reviewer`, `be-security-reviewer`)은 Claude Code 에만 파일이 있다. Codex 에서 `backend-multi-agent` 를 쓸 때는 `.claude/agents/be-*.md` 본문을 역할 프롬프트로 읽어 `implementer`/`reviewer` 에 전달하거나 메인 실행자가 순차 수행한다.

## 작업별 라우팅

| 작업 | 기본 흐름 | 병렬화 |
|------|-----------|--------|
| 단순 CRUD | `crud_implementer` → 대상 테스트 | 없음 |
| 일반 기능 | 필요 시 `explorer` → `implementer` → 위험할 때 `reviewer` | 보통 없음 |
| 어려운 버그 | `bug_investigator` + `explorer` → 원인 확정 → `implementer` → `reviewer` | 앞의 읽기 역할만 |
| 리팩토링 | `explorer` + `reviewer` → 범위 확정 → `refactorer` → `reviewer` | 최초 읽기 역할만 |
| 아키텍처 | `architect` + `explorer` → 설계 확정 → 단일 구현자 → `reviewer` | 설계·탐색만 |
| 대형 기능 | `backend-multi-agent` 로 발견 작업 분리 → 통합 계획 → 순차 구현 | 독립적인 읽기 역할만 |

## 병렬화 규칙

병렬화해도 되는 작업:

- 저장소 탐색과 의존성 분석
- API·테스트 공백·로그 조사
- 아키텍처·보안 검토
- 서로 파일과 외부 상태를 바꾸지 않는 읽기 전용 검토

병렬화하지 않는 작업:

- 같은 파일이나 같은 공개 계약 편집
- DB 스키마와 공유 도메인 객체 변경
- 여러 구현자가 하나의 기능을 동시에 수정하는 작업
- 커밋·푸시·이슈·PR 생성 같은 저장소 통합 작업

하위 에이전트는 원칙적으로 다른 하위 에이전트를 생성하지 않는다. 추가 위임이 필요하면 메인 실행자가 작업 경계를 다시 나눈다.

## 프로젝트 스킬과의 관계

- `dev-orchestrator`: 전체 작업 분류와 모델·역할 선택
- `backend-multi-agent`: 백엔드 대형 작업의 DB·Hexagonal·Security 역할 구성
- `backend-feature-bootstrap`, `backend-api-check`, `hexagonal-guard`: 착수와 구현 후 계약·경계 검증

`dev-orchestrator` 가 기존 스킬을 대체하지 않는다. 먼저 비용과 실행 순서를 정하고, 필요한 프로젝트 전문 스킬을 결합한다.

## 검증

설정을 변경하면 다음을 확인한다.

```bash
python -c "import pathlib,tomllib; [tomllib.loads(p.read_text(encoding='utf-8')) for p in pathlib.Path('.codex/agents').glob('*.toml')]"
python scripts/sync-agent-skills.py --check
git diff --check
```

추가로 모든 `.toml`, `SKILL.md`, 문서가 UTF-8 no BOM 인지 확인한다.

## 공식 문서

- [Codex Subagents](https://developers.openai.com/codex/subagents)
- [Codex Configuration Reference](https://developers.openai.com/codex/config-reference)
- [OpenAI 모델 선택 가이드](https://developers.openai.com/api/docs/models/gpt)
