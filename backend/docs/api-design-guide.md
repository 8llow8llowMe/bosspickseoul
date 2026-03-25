# Backend API Design Guide

## 1. RESTful 경로 원칙

- 리소스 컬렉션명은 복수형을 기본으로 사용한다.
- 경로는 상위 리소스부터 하위 리소스 순으로 깊이를 표현한다.
- `regions`, `administrations`, `commercials`처럼 도메인 의미가 드러나는 이름을 사용한다.
- 비교/요약 API도 가능하면 리소스 체인 안에서 의미가 드러나도록 구성한다.

## 2. 응답 구조 원칙

- 공통 응답 래퍼는 `Response<T>`를 사용한다.
- Controller 반환은 `ResponseEntity<Response<T>>`로 통일한다.
- 중첩 응답은 `Response`, `Item`, `Presenter` 조합으로 구성한다.
- 내부용 `Info`를 외부 응답 타입으로 직접 노출하지 않는다.

## 3. Controller 스타일

- 다른 레이어를 직접 호출하지 않고 `WebUseCase`만 호출한다.
- 가능하면 아래 흐름을 유지한다.

```java
SomeResponse response = someWebUseCase.getSomething(...);
return ResponseEntity.ok().body(Response.success(response));
```

## 4. 계층 흐름

- `Controller -> WebUseCase -> WebFacade -> Processor -> Port/Adapter`
- `Info -> Presenter -> Response`
- write 흐름은 도메인 중심으로 유지하고, read 흐름은 QueryResult/Info 중심으로 유지한다.

## 5. 정렬 / 페이지네이션

- 단순 페이지보다 무한 스크롤이 맞는 영역은 `SliceResponse`를 우선 사용한다.
- 정렬은 enum 기반 RequestParam을 우선 사용한다.
  - 예: `sortType`, `orderType`
- enum을 쓰면 Swagger에서 허용값을 명확하게 보여줄 수 있다.

## 6. 보안 API 설계

- 인증 사용자 전용 API는 `@PreAuthorize`를 명시한다.
- member 식별은 JWT claim을 기준으로 처리한다.
- 클라이언트가 임의 헤더로 member 식별값을 주입하는 방식은 사용하지 않는다.
