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
- **뷰포트 영역 상한** — 한 번의 영역 조회가 읽어 오는 행 수에 타입별 상한이 있다(자치구 50 / 행정동 500 / 상권 250). 설정 키는 `app.map.viewport.max-district-areas`, `max-administration-areas`, `max-commercial-areas`(`MapViewportProperties`)이며 `application.yml` 에 기본값이 명시되어 있다. 상한 + 1 건을 읽어 넘치면 `MAP_010`(400) 으로 막으므로 폴리곤 JSON 을 전량 읽고 파싱한 뒤에 거절하지 않는다. 상권 상한이 가장 빡빡한 이유는 조회 결과가 그대로 commercial-service Feign GET 의 쿼리 파라미터가 되기 때문이다 — 상권 코드 1건당 약 24B 이고 수신 측 Tomcat 기본 `max-http-request-header-size` 가 8192B 라 약 341건에서 요청 라인이 한도를 넘는다.
- **advice 우선순위** — `RegionExceptionHandler` 가 `@Order(0)` + `basePackages = "...domainlayer.region"` 로 좁게 걸리고, `MapExceptionHandler` 가 서비스 전역 폴백이다. 이 순서가 없으면 region 엔드포인트의 파라미터 형식 오류가 `MAP_103` 으로 새어 나간다.
- **트랜잭션 경계** — map 은 Processor(`MapQueryProcessor`), region 은 Facade(`RegionWebFacade`)로 갈려 있다. map 만 commercial-service Feign 호출을 유스케이스 안에 포함해서다 — Facade 에 트랜잭션을 걸면 원격 응답을 기다리는 동안 DB 커넥션을 잡고 있게 된다. region 은 외부 I/O 가 없어 Facade 경계를 유지한다.
- **알려진 드리프트** — `AreaBoundaryEntity` · `CommercialRegionMappingEntity` 의 `NOT NULL` 수치 컬럼이 `Double` 이다(coding-conventions §9-2 는 primitive). 기존 드리프트이며 이번 범위 밖이라 후속 이슈로 남긴다.
- **동명 지역 다건** — `GET /code-lookup` 은 이름으로 코드를 찾는다. DISTINCT 는 선택된 컬럼 조합에만 걸려서 자치구가 다른 동명 행정동·동명 상권은 접히지 않고 다건으로 올라온다. 이 경우 `REGION_006`(400) 으로 응답하며, 프론트는 코드 기반 조회로 유도한다. 실데이터에 동명 항목이 실제로 존재하는지는 확인하지 못했다 — 확인 쿼리는 `backend/scripts/migration/district-service-index-runbook.sql` 에 있다.

## 지도 후보 탐색 API (1단계)

- `GET /api/v1/map/candidate-presets` — 추천 프리셋 메타데이터 목록
- `GET /api/v1/map/commercials/candidates` — 뷰포트 + 프리셋 + 우선 지표로 후보 상권 Top N 랭킹
- `GET /api/v1/map/commercials/{code}/profile` — 후보 카드 프로필 (키 지표 집계 + `policyRecommendations`)
- `GET /api/v1/map/commercials/compare-preview` — 2개 상권 경량 비교 (headline 지표 + recommendedSide)
- `GET /api/v1/map/commercials/heatmap` — `composite=true` 추가 시 프리셋 가중 합성 점수 반환. `preset` 은 필수(`MAP_002`), `priorityMetric` 은 **선택** — 미지정 시 프리셋별 기본 우선 지표가 적용된다. 기존 `metricType` 단일 지표 모드는 유지.
- 점수화는 `commercial-service`의 `CommercialCandidateQueryProcessor`가 수행한다. `district-service`는 경계 좌표를 조합해 응답을 구성한다.
- 프리셋 가중치와 compositeScore 산출 책임은 `commercial-service` 단독이다. `district-service.CandidatePresetType`은 표시용 enum만 유지한다.
- Profile 응답의 `centerLng/centerLat/boundaryCoords`는 이번 단계에선 null/빈 배열로 내려간다. 프론트엔드는 직전 candidates/heatmap 응답의 경계 정보를 재사용한다.
- Profile 응답은 commercial-service 프로필의 `policyRecommendations`(상위 5건)를 **그대로 전달**한다. 지도 프로필만 쓰던 화면이 정책을 보려고 commercial-service 를 따로 호출할 필요가 없다. commercial-service 가 정책을 못 내려주면(빈 값·null) 빈 배열로 내려간다 — 프로필 자체를 실패시키지 않는다.
- commercial-service 를 감싸는 Feign 호출(`InternalResponseSupport`)의 오류 번역: 하위 **404 는 장애가 아니라 데이터 부재** — `MAP_009`(404) 로 바꾸고 하위 응답의 `resultMessage` 를 그대로 싣는다(프론트는 재시도 대신 문구 노출). 5xx·타임아웃·서킷 오픈만 `MAP_008`(503) 이며 서킷 집계 대상이다. `keyMetrics` 수치 필드는 분기 데이터가 없는 지표만 `null` 로 내려간다(부분 강등, 이슈 #229).
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
| `MAP_008` | 503 | commercial-service 통신 불가 (5xx·타임아웃·서킷 오픈만 해당) |
| `MAP_009` | 404 | commercial-service 가 404 를 준 경우 (분기 데이터 부재 등) — `resultMessage` 에 하위 서비스 메시지를 그대로 전달 |
| `MAP_010` | 400 | 뷰포트에 들어온 영역이 타입별 상한을 넘음 (지도 확대 유도) |
| `MAP_100` | 400 | 요청 값 검증 실패 폴백 (INVALID_REQUEST) |
| `MAP_101`~`MAP_102` | 400 | topN 필드별 검증 (`MapValidationMessage`) |
| `MAP_103` | 400 | 요청 파라미터 형식 오류 (PARAMETER_TYPE_INVALID) |
| `REGION_001` | 400 | 행정동이 해당 자치구 소속이 아님 |
| `REGION_002`~`REGION_004` | 404 | 자치구/행정동/상권 코드 미존재 |
| `REGION_005` | 500 | 좌표 변환 실패 |
| `REGION_006` | 400 | 같은 이름의 지역이 여러 곳 — 코드로 조회하도록 유도 |
| `REGION_100` | 400 | 요청 값 검증 실패 폴백 (INVALID_REQUEST) — 현재 region 컨트롤러에 Bean Validation 제약이 없어 발생 경로 없음, 향후 대비 |
| `REGION_110` | 400 | 요청 파라미터 형식 오류 (PARAMETER_TYPE_INVALID) — 필드별 코드 자리(`REGION_101`~`REGION_109`)를 비워 두고 1xx 대역 마지막을 쓴다 |

## Notes

- `areaName` is the actual commercial name resolved from map and region metadata.
- `metricType`, `preset`, and `priorityMetric` use metadata objects so the frontend can reuse `code/name/description` directly.
- `selectionReason` is intended to be rendered directly in candidate cards or list UIs.
- `mode` also uses a metadata object and distinguishes single-metric heatmaps from composite recommendation heatmaps.
- Invalid heatmap mode combinations and out-of-range `topN` values are treated as `400 Bad Request`.
- Frontend usage patterns, viewport parameters, zoom-level strategy, and screen-level API flows are documented in `../map-api-frontend-guide.md`.
