# Backend Coding Conventions

## 1. 메서드 시그니처

- 하드랩은 160자를 기준으로 한다.
- 메서드, 생성자, `record` 파라미터가 160자 안에 들어오면 한 줄로 유지한다.
- 160자를 넘기거나 가독성이 분명히 나빠질 때만 줄바꿈한다.

## 2. Primitive / Wrapper 기준

- `long`, `int`, `boolean` 등은 기본적으로 primitive를 사용한다.
- 아래 경우에만 wrapper를 사용한다.
  - `null` 자체가 의미 있는 경우
  - 선택적 커서 / 필터 값
  - 미전달 상태와 기본값 상태를 구분해야 하는 경우

예:
- `memberId`, `postId`, `commentId`, `size`: primitive
- `lastLikeCount`: nullable 의미가 있으면 wrapper 허용

## 3. Port / Adapter 파라미터 기준

- 단순 저장 / 수정 / 삭제는 과도한 DTO를 만들지 않고 개별 파라미터를 유지한다.
- 조회 조건이 4개 이상이거나 `filter + sort + cursor + size`가 함께 오면 `*Criteria` 또는 `*Query` 객체로 묶는다.
- out-port 계약은 adapter 구현 세부사항을 노출하지 않는다.

## 4. Mapper 기준

- Entity <-> Domain 매핑은 MapStruct를 우선 사용한다.
- 외부 API / 내부 서비스 응답은 adapter에서 `QueryResult`로 변환한다.
- `Info -> Response`는 Presenter가 담당한다.

## 5. 네이밍 기준

- Controller: `*WebController`
- UseCase: `*WebUseCase`, `*InternalUseCase`
- Facade: `*WebFacade`, `*InternalFacade`
- Processor: `*Processor`
- Presenter: `*Presenter`
- Out client interface: `*Client`
- Query result: `*QueryResult`
- Criteria: `*Criteria`

## 6. Swagger / API 문서

- `@Tag`, `@Operation`, `@Parameter`, `@Schema`를 기본으로 작성한다.
- 설명은 한국어를 기본으로 한다.
- 인증이 필요한 API는 `@SecurityRequirement`를 명시한다.
- 내부 API는 `@Hidden`을 검토한다.

## 7. 로그 / 예외

- 로그는 검색 가능한 영어 키 + 값 조합을 우선한다.
- 사용자 노출 예외 메시지와 내부 로그 메시지는 분리해서 본다.
- 에러 코드는 서비스 컨텍스트 안에서 일관되게 관리한다.

## 8. 엔티티 / 영속성

- 필드 설명이 필요한 엔티티는 `@Comment`를 사용한다.
- 단일 PK를 우선하고, N:N 관계는 중간 테이블을 분리한다.
- 삭제 전략은 요구사항에 맞춰 명시적으로 선택한다.

## 9. Internal Client 규칙

- Spring 백엔드 서비스 간 동기 조회/연동은 기본적으로 `FeignClient`를 사용한다.
- Feign 인터페이스는 전용 패키지 안에서 `*Client` 이름을 사용한다.
  - 예: `CommercialAnalysisClient`, `RegionAnalysisClient`
- `adapter/out/client`의 adapter는 Feign 응답을 언래핑한 뒤 `QueryResult` 또는 domain/model로 변환한다.
- `url`, per-client `configuration`은 꼭 필요한 사유가 없으면 기본값으로 추가하지 않는다.
- timeout, 공통 호출 정책은 가능한 한 `spring.cloud.openfeign.client.config` 같은 공통 설정으로 관리한다.
