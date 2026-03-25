# Backend Docs

## 목적

- 이 디렉터리는 `NowDoBoss-V2/backend` 작업의 기준 문서 모음이다.
- 백엔드 공통 규칙, 서비스별 책임, 완료 기준을 한 곳에서 관리한다.
- `backend/AGENTS.md`, `backend/CLAUDE.md`는 이 문서들의 엔트리 역할만 한다.

## 문서 구성

- `architecture-guide.md`
  - Hexagonal 구조, 계층 책임, 패키지 템플릿, Port/Adapter 경계
- `coding-conventions.md`
  - 메서드 시그니처, primitive/wrapper, MapStruct, 네이밍, Swagger, 로그/주석 규칙
- `api-design-guide.md`
  - RESTful 경로, 응답 모델, Controller -> WebUseCase -> Facade -> Processor -> Presenter 흐름
- `service-playbook.md`
  - 새 서비스/컨텍스트 추가, 리팩토링, 문서/검증 절차
- `done-checklist.md`
  - 기능 단위 완료 기준과 QA 체크리스트
- `service-inventory.md`
  - 현재 서비스 책임, 상태, 주의점 요약
- `services/*.md`
  - 서비스별 책임과 구현 주의점

## 권장 읽기 순서

1. `../AGENTS.md`
2. `README.md`
3. `architecture-guide.md`
4. `coding-conventions.md`
5. `api-design-guide.md`
6. `service-playbook.md`
7. `done-checklist.md`
8. `service-inventory.md`
9. 필요 시 `services/*.md`

## 현재 작업 원칙

- 백엔드는 공통 규칙보다 서비스별 편차가 생기기 쉬우므로, 규칙은 `docs/`에 모으고 구현은 서비스 문서로 보강한다.
- 새 기능 구현 전에는 API 경로, 계층 책임, 보안 방식부터 정리한다.
- 코드 컨벤션과 문서 컨벤션은 같이 움직여야 한다.
- 문서는 추상 원칙만 적지 않고, 현재 구현 중인 서비스 패턴을 예시로 포함한다.

## 스킬 사용 예시

- `$backend-api-check`: REST 경로, Swagger, Presenter 흐름 점검
- `$hexagonal-guard`: Hexagonal 계층 경계 점검
- `$backend-feature-bootstrap`: 새 서비스/컨텍스트 시작 가이드
- 자연어 요청도 가능하지만, `$스킬명` 형식이 가장 안정적이다.
