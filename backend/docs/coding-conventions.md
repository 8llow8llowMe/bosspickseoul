# Backend Coding Conventions

## 1. 메서드 시그니처

- 한 줄 길이는 **180자**를 하드랩 기준으로 관리합니다.
- 메서드 선언이나 `record` 파라미터가 180자 이하면 한 줄로 유지합니다.
- 180자를 초과하거나 가독성이 떨어지면 줄바꿈합니다.
- 줄바꿈 시에는 **의미 단위로 파라미터를 묶어** 같은 줄에 배치합니다.
  - 예: `targetType, targetCode` / `status, sortType, orderType` / `lastPostId, lastLikeCount, size` / `popularSince`
  - 파라미터 하나씩 한 줄씩 나열하는 방식은 지양합니다.
- Swagger `@Parameter(...) @RequestParam ...` 조합은 180자 이내면 **한 줄**로 작성합니다.
  - 예: `@Parameter(description = "남서쪽 경도", required = true, example = "126.90") @RequestParam double lngSW`

## 2. Primitive / Wrapper 기준

- `long`, `int`, `boolean` 같은 기본 타입은 기본적으로 primitive를 사용합니다.
- 아래 경우에만 wrapper를 사용합니다.
  - `null` 자체가 의미를 가지는 경우
  - 선택적 검색 조건이나 필터 값인 경우
  - 미설정 상태와 기본값 상태를 구분해야 하는 경우

## 3. Port / Adapter 파라미터 기준

- 단순 조회, 수정, 삭제 정도는 DTO를 만들지 않고 개별 파라미터를 우선 사용합니다.
- 조회 조건이 4개 이상이거나 `filter + sort + cursor + size`처럼 함께 움직이면 `*Criteria` 또는 `*Query` 객체로 묶습니다.
- out-port 계약은 adapter 구현 세부사항을 노출하지 않습니다.

## 4. Mapper 기준

- Entity <-> Domain 매핑은 MapStruct를 우선 사용합니다.
- 외부 API나 내부 서비스 응답은 adapter에서 `QueryResult` 또는 domain/model로 변환합니다.
- `Info -> Response` 변환은 Presenter 책임입니다.

## 5. 네이밍 기준

- Controller: `*WebController`
- UseCase: `*WebUseCase`, `*InternalUseCase`
- Facade: `*WebFacade`, `*InternalFacade`
- Processor: `*Processor`
- Presenter: `*Presenter`
- Out client interface: `*Client`
- Query result: `*QueryResult`
- Criteria: `*Criteria`
- Query object: `*Query`

## 6. Swagger / API 문서

- `@Tag`, `@Operation`, `@Parameter`, `@Schema`를 기본으로 작성합니다.
- 설명 문구는 한국어를 기본으로 합니다.
- 인증이 필요한 API는 `@SecurityRequirement`를 명시합니다.
- 내부 API는 `@Hidden` 적용을 검토합니다.

## 7. Record DTO Swagger 정렬

- `record` 기반 request / response / item DTO에서는 각 component의 `@Schema`를 component 바로 위 줄에 둡니다.
- component 사이에는 한 줄을 비워서 설명 블록이 눈에 잘 들어오도록 맞춥니다.
- validation annotation이 있으면 `@Schema` 다음 줄에 이어서 배치합니다.
- Lombok `@Builder`와 record 선언 사이에는 빈 줄을 두지 않습니다.

권장 형태:

```java
@Builder
@Schema(description = "예시 응답 DTO")
public record ExampleResponse(

    @Schema(description = "필드 1 설명")
    String field1,

    @Schema(description = "필드 2 설명")
    @NotBlank
    String field2
) {
}
```

## 8. 로그 / 예외

- 로그는 검색 가능한 영어 키 + 값 조합을 우선합니다.
- 사용자 노출 예외 메시지와 내부 로그 메시지는 분리해서 봅니다.
- 에러 코드는 서비스 컨텍스트 안에서 일관되게 관리합니다.

### 8-1. 예외 패턴 (필수)

모든 서비스는 동일한 Level 2 패턴을 따릅니다. `BadRequestException` 같은 공통 예외는 사용하지 않습니다.

- `{Domain}ErrorCode` enum — `code`, `message`, `HttpStatus` 3 필드 고정
- `{Domain}Exception extends RuntimeException` — ErrorCode 를 주입받고 `super(errorCode.getMessage())`
- `{Domain}ExceptionHandler` (`@RestControllerAdvice`) — ErrorCode 의 HttpStatus 와 code 를 `Response.fail()` 로 변환
- 위치: `application/exception/{Domain}ErrorCode.java`, `application/exception/{Domain}Exception.java`, `adapter/in/web/exception/{Domain}ExceptionHandler.java`

```java
// 1. ErrorCode 정의
@Getter @RequiredArgsConstructor
public enum CommercialErrorCode {

    INVALID_TOP_N("COMMERCIAL_001", "topN은 5 이상 30 이하여야 합니다.", HttpStatus.BAD_REQUEST);

    private final String code;
    private final String message;
    private final HttpStatus httpStatus;
}

// 2. Exception 정의
@Getter
public class CommercialException extends RuntimeException {

    private final CommercialErrorCode errorCode;

    public CommercialException(CommercialErrorCode errorCode) {
        super(errorCode.getMessage());
        this.errorCode = errorCode;
    }
}

// 3. 처리
throw new CommercialException(CommercialErrorCode.INVALID_TOP_N);
```

공통 검증 예외 (`MethodArgumentNotValidException`, `MethodArgumentTypeMismatchException`, `ConstraintViolationException`, `HandlerMethodValidationException`) 는 각 서비스의 ExceptionHandler 에서 `{DOMAIN}_400` 코드로 처리합니다.

### 8-2. 하드코딩된 문자열 금지

반복 사용되는 상태 코드 / 구분 값은 반드시 enum 으로 정의합니다.

- grade 상태 (`HIGH/MEDIUM/LOW/INSUFFICIENT`) → `shared.enums.GradeLevel`
- 상권 변화 지표 (`LL/LH/HL/HH`) → `domain.enums.ChangeIndicatorCode`
- 비교 우위 (`LEFT/RIGHT/TIE`) → `application.model.ComparisonWinnerSide`

API 응답에서 enum 을 문자열로 내보낼 때는 `enum.name()` 을 사용하여 기존 계약을 유지합니다.

## 9. 엔티티 / 영속성

- 필드 설명이 필요한 엔티티는 `@Comment`를 사용합니다.
- 단일 PK를 우선하고, N:N 관계는 중간 테이블을 분리합니다.
- 삭제 전략과 복구 요구사항에 맞춰 명시적으로 선택합니다.

## 10. Internal Client 규칙

- Spring 백엔드 서비스 간 조회 / 연동은 기본적으로 `FeignClient`를 사용합니다.
- Feign 인터페이스는 전용 패키지 안에서 `*Client` 이름을 사용합니다.
  - 예: `CommercialAnalysisClient`, `RegionAnalysisClient`
- `adapter/out/client`의 adapter는 Feign 응답을 바로 사용하지 않고 `QueryResult` 또는 domain/model로 변환합니다.
- `url`, per-client `configuration`은 꼭 필요한 사유가 없으면 기본값으로 추가하지 않습니다.
- timeout, 공통 헤더 정책은 가능한 한 `spring.cloud.openfeign.client.config` 같은 공통 설정으로 관리합니다.

## 11. Enum Metadata 규칙

- enum metadata는 기존 코드베이스와 맞춰 기본 설명 필드명을 `description`으로 통일합니다.
- enum이 UI 표시용 이름을 별도로 가져야 하면 `name`보다 `displayName`을 우선합니다.
  - 이유: Java enum은 이미 `name()`을 제공하므로 `displayName`이 더 명확합니다.
- 점수 해석용 설명이 필요하면 `scoreDescription`을 사용합니다.
- `code` 필드는 `enum.name()`만으로 충분하지 않을 때만 추가합니다.

권장 enum 필드:

- `displayName`
- `description`
- `scoreDescription`
- `sortOrder`

응답 DTO에서는 enum metadata를 가능한 한 별도 metadata 객체로 묶습니다.

권장 형태:

```json
{
  "metricType": {
    "code": "OPPORTUNITY_SCORE",
    "name": "기회도",
    "description": "매출, 소비력, 유동인구, 개업률 등을 종합한 상권 기회 지표입니다.",
    "scoreDescription": "점수가 높을수록 현재 업종 기준 진입 기회가 높습니다."
  }
}
```

세부 규칙:

- metadata 객체 안에서는 `code`, `name`, `description`을 기본으로 사용합니다.
- 점수 해석 문구가 필요할 때만 `scoreDescription`을 추가합니다.
- flat 구조가 불가피하면 `metricTypeCode`, `metricTypeName`처럼 도메인 접두어를 붙입니다.
- 이미 `metricType` 객체 안에 들어 있다면 `metricTypeDescription`보다 `description`을 우선합니다.

예시:

- `roleCode`, `roleDescription`
- `metricType.code`, `metricType.name`, `metricType.description`, `metricType.scoreDescription`

## 12. Internal Client / Port Naming

이 절은 **카테고리별로** 아웃바운드 포트 이름을 정리한다. 각 카테고리는 전송/구현 디테일이 아니라 **책임**으로 구분한다.

### 12-1. 크로스 서비스 Feign 포트 (inter-service)

서비스 간 HTTP 호출에 해당한다.

- Feign interface: `*Client`
  - 위치: `adapter/out/client/feign/`
  - 예: `CommercialHeatmapClient`
- Out port: 책임으로 명명 (전송 기술 금지)
  - Read-only: `*QueryPort`
  - State-changing: `*CommandPort`
- Adapter: `*ClientAdapter`
  - 위치: `adapter/out/client/`
  - 하나의 adapter 가 여러 port 를 구현해도 응집도가 유지되면 분리하지 않는다.
- 어댑터에서 application 으로 넘기는 타입: `*QueryResult`
- Feign-only raw DTO 가 필요할 때만 `adapter/out/client/feign/dto` 에 두고 `*FeignResponse` 또는 `*ClientResponse` 사용.

권장 구조:

```text
application/port/out/CommercialHeatmapQueryPort
adapter/out/client/CommercialHeatmapClientAdapter
adapter/out/client/feign/CommercialHeatmapClient
application/port/out/query/CommercialHeatmapScoresQueryResult
```

### 12-2. JPA 저장소 포트 (persistence)

데이터베이스 영속성 포트.

- Port: `*RepositoryPort`
  - 위치: `application/port/out/`
  - 예: `SalesCommercialRepositoryPort`, `ChangeCommercialRepositoryPort`
- Adapter: `*RepositoryAdapter` 또는 `*PersistenceAdapter`
  - 위치: `adapter/out/persistence/`
- 어댑터에서 넘기는 타입: domain/model (MapStruct 매퍼 거침)

> community-service 의 `CommunityPostPort`, `CommunityCommentPort` 등은 레거시 네이밍을 유지한다.
> 새 포트를 추가할 때는 `*RepositoryPort` 를 따른다.

### 12-3. 인프라 특화 포트 (Redis / LLM / Geo / JDBC 배치 등)

도메인 의미를 그대로 표현한 이름을 사용한다. 전송 기술을 접두사로 붙여도 그 기술이 도메인 성격을 드러낼 때만 허용.

- 예: `AiLlmPort`, `AiReportCachePort`, `JwtTokenStorePort`, `CoordinateTransformPort`
- JDBC 배치 전용 포트는 `*BulkPort` 또는 `*CommandPort` 사용.
  (batch-service 의 `AreaBoundaryJdbcPort` 는 레거시 — 향후 작업 시 `AreaBoundaryBulkPort` 로 정리 예정.)

## 13. Method Signature Wrapping

- Method declarations and invocations follow a hard wrap of `180` characters.
- If the full signature fits within `180` characters, keep it on one line.
- Do not force one-parameter-per-line wrapping when the signature still fits comfortably on one line.
- When wrapping is required, group closely related parameters on the same line when possible instead of splitting every parameter onto its own line.

Preferred:

```java
public CandidateCommercialsResponse getTopCandidates(
    String periodCode, String serviceCode, List<String> commercialCodes, CandidatePresetType preset,
    CommercialHeatmapMetricType priorityMetric, Integer topN
) {
}
```

Also preferred when it fits:

```java
public CommercialProfileQueryResult getCommercialProfile(String commercialCode, String serviceCode, String periodCode) {
}
```
