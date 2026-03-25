# Backend Service Playbook

## 1. 새 서비스 또는 새 컨텍스트 시작 순서

1. 서비스 책임과 컨텍스트 범위를 먼저 정리한다.
2. API 경로와 공개/인증 정책을 정리한다.
3. `domainlayer/<context>` 패키지 구조를 잡는다.
4. `WebUseCase`, `WebFacade`, `Processor`, `Port`, `Adapter`, `Presenter` 순으로 뼈대를 만든다.
5. Entity/DDL/인덱스/주석 기준을 정리한다.
6. Swagger와 예외/로그 문구를 한국어 기준으로 맞춘다.
7. compile/test/check를 수행한다.
8. 관련 `docs/`와 이슈/PR 문서를 갱신한다.

## 2. 리팩토링 순서

1. 현재 책임 분리 상태를 확인한다.
2. 경계가 어긋난 부분을 `Facade`, `Processor`, `Presenter`, `Adapter` 기준으로 나눈다.
3. 응답 DTO와 내부 `Info`를 분리한다.
4. Port 반환 타입이 `Info`나 `adapter` 타입에 묶여 있으면 `QueryResult` 또는 Domain으로 정리한다.
5. compile/test/check를 먼저 통과시킨다.
6. 문서 규칙과 맞지 않는 부분을 함께 정리한다.

## 3. 보안 / 설정 기준

- `auth-service`는 인증/인가 중심 서비스로 별도 Security 구성을 사용한다.
- 나머지 서비스는 Resource Server 기준으로 JWT claim을 해석한다.
- 서비스별 프로퍼티는 `record + @ConfigurationProperties`를 우선 검토한다.
- 하드코딩보다 목적이 드러나는 prefix 기반 설정을 우선한다.

## 4. SQL / 문서 기준

- DB 테이블을 새로 도입하면 최소한 SQL 초안 또는 엔티티 주석 기준을 남긴다.
- 인덱스, unique key, soft delete 전략, 배치 정리 전략이 있으면 문서에 함께 적는다.

## 5. 구현 후 확인

- `docs/done-checklist.md` 기준 확인
- 서비스 책임 변경 시 `docs/service-inventory.md` 갱신
- 규칙이 바뀌면 `docs/architecture-guide.md`, `docs/coding-conventions.md`, `docs/api-design-guide.md` 갱신
