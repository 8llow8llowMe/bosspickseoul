# Backend Coding Conventions

## 1. 메서드 시그니처

- 한 줄 길이는 **140자**를 하드랩 기준으로 관리합니다.
- 메서드 선언이나 `record` 파라미터가 140자 이하면 한 줄로 유지합니다.
- 140자를 초과하거나 가독성이 떨어지면 줄바꿈합니다.
- 줄바꿈 시에는 **의미 단위로 파라미터를 묶어** 같은 줄에 배치합니다.
  - 예: `targetType, targetCode` / `status, sortType, orderType` / `lastPostId, lastLikeCount, size` / `popularSince`
  - 파라미터 하나씩 한 줄씩 나열하는 방식은 지양합니다.

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
