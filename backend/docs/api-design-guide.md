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

## 7. 비동기 작업 패턴

LLM 호출 등 응답이 길어지는 작업은 다음 패턴을 따른다 (참조: `ai-service` 의 `POST /api/v1/ai-reports/commercials/{code}`).

- **제출 endpoint** — 가능한 동사 없는 RESTful 경로 사용, `POST {resource}`
  - 캐시/즉시 응답 가능 → `200 OK` + 결과
  - 작업 큐잉 필요 → `202 Accepted` + jobId
  - 동일 사용자/요청 in-flight 일 때는 기존 jobId 재사용 (멱등)
- **상태 조회 endpoint** — `GET /jobs/{jobId}`
  - 본인 작업만 조회 가능 (다른 사용자 jobId 는 `404` 로 응답해 존재 자체 노출 차단)
- **응답 DTO** — `submissionStatus` 또는 `status` 필드로 분기 표현. 결과 페이로드는 status 별 nullable
  - 상태/타입 필드는 raw enum 문자열 대신 `{code, name, description}` metadata 객체(`CodeNameDescriptionMetadata`)로
    내려 프론트가 그대로 표시할 수 있게 한다 (`coding-conventions.md` §11)
- **워커** — 서비스별 전용 `ThreadPoolTaskExecutor` 빈 + `@Async("<빈이름>")` 사용. 글로벌 default(`applicationTaskExecutor`) 공유 금지
  - **빈 이름 규칙**: `{도메인}{용도}TaskExecutor` camelCase (예: `aiReportTaskExecutor`). Spring Boot 가 `ThreadPoolTaskExecutor` 빈을 자동 계측하며 **빈 이름을 그대로 Micrometer `executor_*` 메트릭의 `name` 태그로 노출**한다. 이 `name` 이 Grafana `Executor / Thread Pool` 대시보드의 범례(`{service} / {name}`)가 되므로, 이름만으로 서비스·용도가 드러나게 짓는다.
  - **thread name prefix 규칙**: 빈 이름과 대응되는 읽기 쉬운 kebab (예: 빈 `aiReportTaskExecutor` → prefix `ai-report-worker-`). thread dump / 로그와 대시보드를 상호 대조하기 위함이다.
  - **풀 사이징 / 종료**: `corePoolSize` / `maxPoolSize` / `queueCapacity` 를 명시하고, graceful shutdown(`setWaitForTasksToCompleteOnShutdown(true)` + `setAwaitTerminationSeconds(...)`)을 설정한다.
- **상태 저장** — Redis Hash / String + TTL 24h. JPA 가 없는 서비스는 Redis 로 충분, 장기 audit 필요 시 DB 추가
- **idempotency 키** — `{prefix}:{domain}:job:idempotency:{memberId}:{requestHash}` 패턴. requestHash 는 `SHA256(jobType | param1=v1 | ...)` 앞 32자
- **에러** — Exception → ErrorCode 매핑은 동기 endpoint 와 동일 패턴 사용, 단 작업 실패는 200 OK + `status=FAILED` + `errorCode/errorMessage` 로 응답 (HTTP 5xx 가 아님)
