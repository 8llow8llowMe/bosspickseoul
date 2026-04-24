# Commercial Service Guide

## 서비스 책임

- 상권 상세 분석 조회
- 자치구 단위 분석 조회
- 상권/지역 요약 분석 API 제공

## 주요 컨텍스트

- `commercial`
- `district`

## 인증 방식

- 조회 API가 중심이며, 인증 필요 API만 명시적으로 보호한다.
- JWT claim 해석은 서비스 내부 Security 기준을 따른다.

## 대표 API 패턴

- `CommercialWebController`
- `DistrictWebController`
- `CommercialWebUseCase -> CommercialWebFacade`
- `DistrictWebUseCase -> DistrictWebFacade`

## 현재 구현 주의점

- `Info -> Presenter -> Response` 흐름을 유지한다.
- 지역 계층 API와 겹치는 책임은 `district-service`와 분리한다.
- REST 경로는 `commercials`, `regions` 기준 일관성을 우선한다.

## 후보 탐색 처리 (1단계)

- `CommercialHeatmapQueryProcessor.getAllMetricScores(...)` — 한 번의 소스 조회로 4개 지표(OPPORTUNITY/RISK/CONGESTION/RESIDENT_POPULATION)를 동시 산출한다. `getHeatmapScores`는 이 결과를 단일 지표로 필터링해 재사용한다.
- `CommercialCandidateQueryProcessor.getTopCandidates(...)` — `CandidatePresetType` 가중치와 우선 지표 보정으로 compositeScore 를 계산하고 Top N 을 반환한다. RISK_SCORE 는 composite 기여분에서 `100 - score` 로 반전 적용한다.
- `CommercialCandidateQueryProcessor.getCompositeHeatmapScores(...)` — 동일한 가중치 공식으로 **전체 상권 리스트**의 복합 점수를 반환한다. 히트맵 composite 모드의 소스다. `ScoreMetricMetadata` 의 `code` 는 `COMPOSITE_<PRESET>` 로 합성 발급한다.
- `CommercialProfileQueryProcessor.getProfile(...)` — 단일 상권의 집계 지표(매출/유동인구/점포/개폐업률/거주인구/소득/시설) + 자치구·행정동 메타를 반환한다. 점수는 포함하지 않는다.
- `CommercialComparePreviewQueryProcessor.getPreview(...)` — 기존 `CommercialComparisonQueryProcessor.compareCommercials(...)` 결과를 재사용해 6개 headline 지표 + recommendedSide 만 프로젝션한다.
- 내부용 엔드포인트 (`@Hidden`): `/commercials/candidates`, `/commercials/heatmap-composite`, `/commercials/{code}/profile`, `/commercials/compare-preview`. 외부 노출은 district-service `/api/v1/map/commercials/...` 만 사용한다.
- `CandidatePresetType` 는 `CodeNameDescribable` 을 구현하며 가중치는 `application/model` 안에만 존재한다. adapter 계층으로 새지 않도록 유지.
## Hidden Heatmap / Candidate Response Shape

### `GET /api/v1/commercials/heatmap`

- top-level metadata
  - `mode`
  - `serviceCode`
  - `periodCode`
  - `metricType`
  - `preset`
  - `priorityMetric`
  - `summary`
- item fields
  - `commercialCode`
  - `commercialName`
  - `metricType`
  - `score`
  - `grade`
  - `summaryLabel`

### `GET /api/v1/commercials/candidates`

- top-level metadata
  - `serviceCode`
  - `periodCode`
  - `preset`
  - `priorityMetric`
  - `topN`
  - `summary`
- item fields
  - `rank`
  - `commercialCode`
  - `commercialName`
  - `compositeScore`
  - `grade`
  - `summaryLabel`
  - `selectionReason`
  - `opportunityLabel`
  - `riskLabel`
  - `metricBreakdown`
  - `reasonTags`

## 트렌드 분석 (신규)

- `GET /api/v1/commercials/{commercialCode}/trend`
- 파라미터: `serviceCode` (필수), `metricType` (SALES|FOOT_TRAFFIC|STORE), `periodCode` (기본 20233), `periodCount` (1~8, 기본 4)
- `CommercialTrendQueryProcessor` — 분기 코드 역산 → DB 조회 → `PeriodTrendType` 방향 판정
- 응답: `trendDirection` (INCREASE/DECREASE/STAGNANT), `periods[]` (periodCode, value, changeRate)

## 업종별 상권 자동 추천 (신규)

- `GET /api/v1/commercials/recommendations/by-service`
- 파라미터: `serviceCode` (필수), `commercialCodes` (필수), `periodCode` (기본 20233), `topN` (기본 5)
- `CommercialCandidateQueryProcessor.resolvePresetFromServiceCode()` — CS1* → AGGRESSIVE_OPPORTUNITY, CS2* → STABLE_LOW_RISK, 기타 → BALANCED
- 기존 `getTopCandidates()` 파이프라인 재사용, 응답 shape 동일 (`CandidateCommercialsResponse`)

## CandidatePresetType 확장 (신규)

새 프리셋 2종 추가:
- `YOUTH_STARTUP` (청년창업형): 기회·혼잡 중시, 가중치 0.45/0.20/0.25/0.10
- `RE_EMPLOYMENT_STARTUP` (재취업창업형): 거주수요·안정 중시, 가중치 0.20/0.35/0.05/0.40

## 정책 추천 (보류)

- `policy` 도메인 전체 제거됨 (스크래퍼 및 스키마 재설계 후 재구현 예정)
- `CommercialProfileResponse`에서 `policyRecommendations` 필드 제거됨
- 재개 시 `docs/feature-status.md` "미구현 / 보류 기능" 섹션 참고

## Notes

- Hidden commercial endpoints return the same metadata-rich contract that district-service uses for public map responses.
- `commercialName` is populated from actual analysis source data, not from the code placeholder.
- `metricBreakdown.metricType` also follows the shared metadata object convention.
- `mode` uses a metadata object so callers can render heatmap mode labels without hard-coded enum text.
- Invalid `topN` values are treated as `400 Bad Request` instead of silent clamping at the API boundary.
