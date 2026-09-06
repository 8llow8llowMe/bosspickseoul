# Backend Docs

## 목적

- 이 디렉터리는 `BossPickSeoul/backend` 작업의 기준 문서 모음이다.
- 백엔드 공통 규칙, 서비스별 책임, 완료 기준, 운영 체크리스트를 문서로 관리한다.
- `backend/AGENTS.md`, `backend/CLAUDE.md`는 이 문서들의 엔트리 역할만 수행한다.

## 문서 구성

- `architecture-guide.md`
  - Hexagonal 구조, 계층 책임, 패키지 템플릿, Port/Adapter 경계
- `coding-conventions.md`
  - 메서드 파라미터 줄바꿈, primitive/wrapper, MapStruct, 네이밍, Swagger, 로그/주석 규칙
- `api-design-guide.md`
  - RESTful 경로, 응답 모델, Controller -> WebUseCase -> WebFacade -> Processor -> Presenter 흐름
- `api-reference.md`
  - 서비스별 전체 엔드포인트 목록, 노출 경로(게이트웨이 경유 여부), 공통 응답 규약과 에러코드 대역
- `api-screens.md`
  - 프론트엔드 협업용. 각 API가 어떤 화면에서 쓰이는지, 호출 순서, AI 비동기 폴링 가이드
- `frontend-api-usage-guide.md`
  - 프론트엔드 구현용. 화면별 API 선택 기준, 호출 순서, lazy load/캐싱 전략
- `map-api-frontend-guide.md`
  - 지도 화면 구현용. viewport 기반 지도 API 호출법, 줌 레벨 전략, 상권 히트맵/추천/비교 응용 흐름
- `ai-report-frontend-guide.md`
  - AI 리포트 화면 구현용. 비동기 제출 + SSE/폴링 흐름, 로그인 게이팅(잠금 카드) UI, 단계 표시와 에러 처리
- `simulation-data-sources.md`
  - 창업 시뮬레이션 기준 데이터의 원천 출처(공정위/한국부동산원 API)와 base_year 재수집·적재 절차
- `simulation-frontend-guide.md`
  - 창업 시뮬레이션 화면 구현용. 입력 마법사 플로우, API 5종 요청/응답 매핑, 저장 이력, 에러 처리
- `file-upload-guide.md` — 프로필/게시글 이미지 업로드(MinIO) 계약과 설계 원칙
- `share-link-frontend-guide.md`
  - 분석 화면 공유 기능 구현용. `/api/v1/share-links/**` API 사용법, payload 저장/복원 흐름
- `auth-account-frontend-guide.md`
  - 비밀번호 재설정과 일반↔소셜 계정 연결/전환 UX 구현용. 계정 모델, 자동 연결 정책, 비밀번호 설정 흐름
- `observability-guide.md`
  - Prometheus, Grafana, Loki 기반 백엔드 관측 기준
- `backend-ai-data-infra-roadmap.md`
  - 데이터 적재, AI 리팩토링, 모니터링, 서버 역할 분리 고도화 로드맵 메모
- `competition-backend-roadmap-2027.md`
  - 2027 서울시 공모전 준비를 위한 백엔드 기능·헥사고날 구조 감사와 우선순위별 개발 백로그
- `feature-status.md`
  - 서비스별 구현 완료 기능 현황. 구현 파일 경로, 엔드포인트, 주요 설계 결정 기록
- `service-playbook.md`
  - 새 서비스, 컨텍스트 추가, 리팩토링, 문서/검증 절차
- `done-checklist.md`
  - 기능 단위 완료 기준과 QA 체크리스트
- `team-playbook.md`
  - 큰 작업에서 멀티 에이전트 역할 분리와 검증 흐름 기준
- `service-inventory.md`
  - 현재 서비스 책임, 상태, 주의점 요약
- `modules.md`
  - Gradle 멀티모듈 구성과 모듈 간 의존 방향
- `bootstrap-conventions.md`
  - 새 모듈/서비스를 만들 때의 초기 설정 관례
- `deploy-guide.md`
  - Docker Compose, Vault, Jenkins 공통 배포 모델과 파라미터 기준
- `jenkins-cicd-dev-deploy-guide.md`
  - GitHub App, webhook, Jenkins Multibranch Pipeline, Vault credential 기반 개발 배포 설정 절차
- `services/*.md`
  - 서비스별 책임과 구현 주의점

## 권장 읽기 순서

1. `../AGENTS.md`
2. `README.md`
3. `architecture-guide.md`
4. `coding-conventions.md`
5. `api-design-guide.md`
6. `api-reference.md`, `api-screens.md`, `frontend-api-usage-guide.md`, `map-api-frontend-guide.md`, `ai-report-frontend-guide.md`, `share-link-frontend-guide.md` (프론트 협업 시 우선)
7. `service-playbook.md`
8. `done-checklist.md`
9. `team-playbook.md`
10. `service-inventory.md`
11. `deploy-guide.md` 또는 `jenkins-cicd-dev-deploy-guide.md` (배포 작업 시)
12. 필요 시 `services/*.md`

## 현재 작업 원칙

- 백엔드는 공통 규칙과 서비스별 책임이 함께 유지되어야 하므로 규칙은 `docs/`에 모으고 구현 차이는 서비스 문서로 보강한다.
- 새 기능 구현 전에 API 경로, 계층 책임, 보안 방식부터 정리한다.
- 코드 변경과 문서 변경은 같이 움직여야 한다.
- 문서는 추상 지침만 적지 않고, 현재 구현 중인 서비스의 패턴을 예시로 포함한다.
- 서비스 추가나 대형 리팩토링처럼 범위가 큰 작업은 `team-playbook.md` 기준으로 역할을 나눠 검토할 수 있다.

## 스킬 사용 예시

Codex는 `$스킬명`(`.agents/skills/*`), Claude Code는 `/스킬명`(`.claude/skills/*`)으로 호출한다. 두 스택의 스킬 본문은 동일하게 유지한다.

- `/backend-api-check`, `$backend-api-check`: REST 경로, Swagger, Presenter 흐름 점검
- `/hexagonal-guard`, `$hexagonal-guard`: Hexagonal 계층 경계 점검
- `/backend-feature-bootstrap`, `$backend-feature-bootstrap`: 새 서비스/컨텍스트 시작 가이드
- `/backend-multi-agent`, `$backend-multi-agent`: 큰 작업을 역할별로 나눠 설계/구현/검증
- 자연어 요청도 가능하지만 스킬 호출 형식이 가장 확실하다.
