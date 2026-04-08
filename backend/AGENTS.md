# NowDoBoss Backend Agent Guide

## 1. 목적

- 이 문서는 `backend/` 영역 작업을 시작할 때 가장 먼저 보는 엔트리 문서다.
- 상세 규칙은 `backend/docs/` 하위 문서를 따른다.
- 목표는 MSA + Hexagonal 구조를 유지하면서도 서비스별 구현 규칙과 완료 기준이 흔들리지 않게 하는 것이다.

## 2. 읽는 순서

작업 시작 전 아래 문서를 순서대로 확인한다.

1. `docs/README.md`
2. `docs/architecture-guide.md`
3. `docs/coding-conventions.md`
4. `docs/api-design-guide.md`
5. `docs/service-playbook.md`
6. `docs/done-checklist.md`
7. `docs/team-playbook.md`
8. `docs/service-inventory.md`
9. 필요 시 `docs/services/*.md`

## 3. 작업 원칙

- 규칙의 단일 기준은 `backend/docs/*.md`다.
- 공통 규칙은 `AGENTS.md`에 다시 복붙하지 않는다.
- 새 서비스나 새 컨텍스트를 추가할 때는 구현 전에 관련 문서를 먼저 갱신한다.
- 서비스별 차이가 큰 내용만 `docs/services/*.md`로 분리한다.
- 구현 완료 전에 `docs/done-checklist.md` 기준으로 자체 점검한다.
- 범위가 큰 작업이나 구조 리팩토링은 `docs/team-playbook.md` 기준으로 역할을 나눠 진행할 수 있다.

## 4. 빠른 판단 기준

- 계층 책임이 헷갈리면 `docs/architecture-guide.md`
- 메서드 파라미터, primitive/wrapper, 네이밍이 헷갈리면 `docs/coding-conventions.md`
- REST 경로나 Swagger 기준이 헷갈리면 `docs/api-design-guide.md`
- 새 기능/서비스 부트스트랩이면 `docs/service-playbook.md`
- 서비스별 책임/주의점을 확인하려면 `docs/services/*.md`

## 5. 스킬 사용 기준

- REST/Swagger/Presenter 점검은 `.agents/skills/backend-api-check`
- Hexagonal 경계 점검은 `.agents/skills/hexagonal-guard`
- 새 기능/서비스 시작은 `.agents/skills/backend-feature-bootstrap`
- 큰 백엔드 작업을 역할별로 나눌 때는 `.agents/skills/backend-multi-agent`

### 사용 예시

- `$backend-api-check`
- `$hexagonal-guard`
- `$backend-feature-bootstrap`
- `$backend-multi-agent`
- 자연어로 요청해도 되지만 `$스킬명` 형식이 가장 확실하다.

## 6. 문서 갱신 규칙

- 공통 규칙 변경: `docs/architecture-guide.md`, `docs/coding-conventions.md`, `docs/api-design-guide.md`
- 완료 기준 변경: `docs/done-checklist.md`
- 멀티 에이전트 운영 기준 변경: `docs/team-playbook.md`
- 서비스 책임 변경: `docs/service-inventory.md`, `docs/services/*.md`
- `AGENTS.md`는 읽기 순서와 엔트리 역할이 바뀔 때만 수정한다.
