# District Service Guide

## 서비스 책임

- 자치구 / 행정동 / 상권 지역 계층 탐색
- 코드/코드명 조회
- 지도 영역 좌표 조회

## 주요 컨텍스트

- `region`
- `map`

## 인증 방식

- 대부분 조회 전용 API다.
- 필요한 경우 서비스 내부 JWT claim 기반 보호 정책을 적용한다.

## 대표 API 패턴

- `RegionWebController`
- `MapWebController`
- `RegionWebUseCase -> RegionWebFacade`
- `MapWebUseCase -> MapWebFacade`

## 지역 계층 API (`/api/v1/regions`)

- `GET /districts/{districtCode}` — 자치구 단건 조회 (코드→명칭, AI 리포트 등 내부 조회용)
- `GET /districts/{districtCode}/administrations` — 자치구 소속 행정동 목록
- `GET /districts/{districtCode}/administrations/{administrationCode}/commercials` — 행정동 소속 상권 목록
- `GET /code-lookup` — 코드/코드명 조회
- `GET /administrations/{administrationCode}` — 행정동 단건 조회
- `GET /commercials/{commercialCode}/administration` — 상권의 소속 행정동(및 자치구) 조회 (상권명 포함)

## 현재 구현 주의점

- 지역 계층 API는 `/api/v1/regions` 기준으로 일관성을 유지한다.
- 지도 영역 조회는 `map` 컨텍스트로 분리한다.
- 상권/행정동/자치구 메타 책임이 `commercial-service`로 새지 않게 주의한다.
- `commercial_region_mapping`은 상권 분석 지표가 아니라 상권-행정동-자치구 계층 및 중심 좌표 매핑의 원천이다. 따라서 `region` 컨텍스트에서 소유한다.

## 지도 후보 탐색 API (1단계)

- `GET /api/v1/map/candidate-presets` — 추천 프리셋 메타데이터 목록
- `GET /api/v1/map/commercials/candidates` — 뷰포트 + 프리셋 + 우선 지표로 후보 상권 Top N 랭킹
- `GET /api/v1/map/commercials/{code}/profile` — 후보 카드 프로필 (키 지표 집계)
- `GET /api/v1/map/commercials/compare-preview` — 2개 상권 경량 비교 (headline 지표 + recommendedSide)
- `GET /api/v1/map/commercials/heatmap` — `composite=true` 추가 시 프리셋 가중 합성 점수 반환. `preset` 은 필수(`MAP_002`), `priorityMetric` 은 **선택** — 미지정 시 프리셋별 기본 우선 지표가 적용된다. 기존 `metricType` 단일 지표 모드는 유지.
- 점수화는 `commercial-service`의 `CommercialCandidateQueryProcessor`가 수행한다. `district-service`는 경계 좌표를 조합해 응답을 구성한다.
- 프리셋 가중치와 compositeScore 산출 책임은 `commercial-service` 단독이다. `district-service.CandidatePresetType`은 표시용 enum만 유지한다.
- Profile 응답의 `centerLng/centerLat/boundaryCoords`는 이번 단계에선 null/빈 배열로 내려간다. 프론트엔드는 직전 candidates/heatmap 응답의 경계 정보를 재사용한다.
## Heatmap / Candidate Response Shape

### `GET /api/v1/map/commercials/heatmap`

- top-level metadata
  - `mode`
  - `serviceCode`
  - `periodCode`
  - `metricType`
  - `preset`
  - `priorityMetric`
  - `summary`
- item fields
  - `areaCode`
  - `areaName`
  - `centerLng`
  - `centerLat`
  - `boundaryCoords`
  - `metricType`
  - `score`
  - `grade`
  - `summaryLabel`

### `GET /api/v1/map/commercials/candidates`

- top-level metadata
  - `serviceCode`
  - `periodCode`
  - `preset`
  - `priorityMetric`
  - `topN`
  - `summary`
- item fields
  - `rank`
  - `areaCode`
  - `areaName`
  - `centerLng`
  - `centerLat`
  - `boundaryCoords`
  - `compositeScore`
  - `grade`
  - `summaryLabel`
  - `selectionReason`
  - `opportunityLabel`
  - `riskLabel`
  - `metricBreakdown`
  - `reasonTags`

## 에러코드

| 코드 | HttpStatus | 설명 |
|------|-----------|------|
| `MAP_001` | 400 | topN 범위 오류 (5~30) |
| `MAP_002` | 400 | composite=true 인데 preset 미전달 |
| `MAP_003` | 400 | composite=false 인데 metricType 미전달 |
| `MAP_004` | 400 | composite=true 에 metricType 전달 (사용 불가) |
| `MAP_005` | 400 | composite=false 에 preset 또는 priorityMetric 전달 (사용 불가) |
| `MAP_006` | 400 | 지도 뷰포트 좌표 오류 |
| `MAP_007` | 500 | 영역 경계 좌표 변환 실패 |
| `MAP_008` | 503 | commercial-service 통신 불가 |
| `MAP_100` | 400 | 요청 값 검증 실패 폴백 (INVALID_REQUEST) |
| `MAP_101`~`MAP_102` | 400 | topN 필드별 검증 (`MapValidationMessage`) |
| `MAP_103` | 400 | 요청 파라미터 형식 오류 (PARAMETER_TYPE_INVALID) |
| `REGION_001` | 400 | 행정동이 해당 자치구 소속이 아님 |
| `REGION_002`~`REGION_004` | 404 | 자치구/행정동/상권 코드 미존재 |
| `REGION_005` | 500 | 좌표 변환 실패 |

## Notes

- `areaName` is the actual commercial name resolved from map and region metadata.
- `metricType`, `preset`, and `priorityMetric` use metadata objects so the frontend can reuse `code/name/description` directly.
- `selectionReason` is intended to be rendered directly in candidate cards or list UIs.
- `mode` also uses a metadata object and distinguishes single-metric heatmaps from composite recommendation heatmaps.
- Invalid heatmap mode combinations and out-of-range `topN` values are treated as `400 Bad Request`.
- Frontend usage patterns, viewport parameters, zoom-level strategy, and screen-level API flows are documented in `../map-api-frontend-guide.md`.
