# AI Service Guide

## 서비스 책임

- 상권 / 자치구 / 행정동 분석 데이터를 기반으로 AI 리포트를 생성한다.
- LLM 연동, 프롬프트 구성, 구조화 응답 파싱을 담당한다.
- AI 리포트 캐시를 관리한다.
- 내부 서비스 조회 결과를 AI 리포트 입력 데이터로 조합한다.

## 주요 컨텍스트

- `aireport`

## 인증 방식

- 외부 공개 API는 서비스 보안 정책에 맞춰 보호한다.
- 내부 서비스 간 호출 계약은 out adapter에서 캡슐화한다.
- 내부 분석 데이터 조회는 `FeignClient -> Adapter -> QueryResult` 흐름을 따른다.

## 대표 API 패턴

- `AiReportWebController`
- `AiReportWebUseCase -> AiReportWebFacade`
- `AiReportProcessor`
- `AiLlmPort`, `AiReportCachePort`, `*AnalysisQueryPort`
- `AiReportPresenter`

## 현재 구현 주의점

- `Info -> Presenter -> Response` 흐름을 유지한다.
- 내부 서비스 응답은 `adapter/out/client`에서만 해석하고, application에는 `QueryResult`만 전달한다.
- Spring 백엔드 서비스 간 동기 HTTP 호출은 기본적으로 `FeignClient`를 사용한다.
- 외부 LLM 연동은 provider 특성에 따라 `Spring AI` 또는 `WebClient`를 선택할 수 있지만, port 경계 밖으로 세부 구현을 노출하지 않는다.
- 프롬프트 포맷터, 구조화 응답 파서, 캐시 키 규칙을 함께 관리한다.
- 조회 전략과 사용자 경험 기준은 `backend/docs/services/ai-service-strategy.md`를 따른다.
## Current Public APIs

- `GET /api/v1/ai-reports/commercials/{commercialCode}`
- `GET /api/v1/ai-reports/commercials/comparisons`
- `GET /api/v1/ai-reports/districts/{districtCode}`
- `GET /api/v1/ai-reports/administrations/{administrationCode}`

## Response Shape Notes

### Commercial Comparison AI Report

- response DTO: `CommercialComparisonAiReportResponse`
- fields
  - `summary`
  - `recommendedSide`
  - `recommendedReasons`
  - `riskComparison`
  - `timeSlotInsight`
  - `customerSegmentInsight`
  - `operationStrategy`
  - `businessInsight`
  - `generatedAt`

### `recommendedSide` Rule

- current AI comparison response uses a string value
- allowed values
  - `LEFT`
  - `RIGHT`
  - `BALANCED`
- upstream comparison service may use `TIE`, but ai-service normalizes that case to `BALANCED` before prompting the LLM

## Integration Notes

- comparison AI response does not currently use metadata object shape for `recommendedSide`
- frontend should treat `recommendedSide` as a string enum in the AI comparison response
- comparison preview and comparison detail APIs still use metadata objects on the commercial-service side
