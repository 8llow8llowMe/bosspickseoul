# Commercial Service Guide

## 서비스 책임

- 상권 상세 분석 조회
- 자치구 단위 분석 조회
- 상권/지역 요약 분석 API 제공

## 주요 컨텍스트

- `commercial`
- `district`
- `sharelink`
- `administration`
- `category`
- `commercialsummary`
- `ranking`

## 인증 방식

- 조회 API가 중심이며, 인증 필요 API만 명시적으로 보호한다.
- security-core의 `ResourceServerSecurityConfigurer` 기반으로 JWT claim을 해석하며,
  기본 permitAll + `@PreAuthorize` 명시 보호 방식을 사용한다.
- 현재 인증 필수 API는 없다. `POST /api/v1/share-links`는 **선택적 인증** —
  Bearer 토큰이 있으면 최초 공유자를 기록하고, 없어도 생성할 수 있다.

## 대표 API 패턴

- `CommercialWebController`
- `DistrictWebController`
- `AdministrationWebController` (`/api/v1/administrations`)
- `ShareLinkWebController` (`/api/v1/share-links`)
- `CommercialWebUseCase -> CommercialWebFacade`
- `DistrictWebUseCase -> DistrictWebFacade`

## 현재 구현 주의점

- `Info -> Presenter -> Response` 흐름을 유지한다.
- 지역 계층 API와 겹치는 책임은 `district-service`와 분리한다.
- 상권의 소속 행정동/자치구 메타는 직접 DB로 소유하지 않고 `CommercialRegionQueryPort`를 통해 `district-service`에서 조회한다.
- REST 경로는 `commercials`, `regions` 기준 일관성을 우선한다.

## 후보 탐색 처리 (1단계)

- `CommercialHeatmapQueryProcessor.getAllMetricScores(...)` — 한 번의 소스 조회로 4개 지표(OPPORTUNITY/RISK/CONGESTION/RESIDENT_POPULATION)를 동시 산출한다. `getHeatmapScores`는 이 결과를 단일 지표로 필터링해 재사용한다.
- `CommercialCandidateQueryProcessor.getTopCandidates(...)` — `CandidatePresetType` 가중치와 우선 지표 보정으로 compositeScore 를 계산하고 Top N 을 반환한다. RISK_SCORE 는 composite 기여분에서 `100 - score` 로 반전 적용한다.
- `CommercialCandidateQueryProcessor.getCompositeHeatmapScores(...)` — 동일한 가중치 공식으로 **전체 상권 리스트**의 복합 점수를 반환한다. 히트맵 composite 모드의 소스다. `ScoreMetricMetadata` 의 `code` 는 `COMPOSITE_<PRESET>` 로 합성 발급한다.
- `CommercialProfileQueryProcessor.getProfile(...)` — 단일 상권의 집계 지표(매출/유동인구/점포/개폐업률/거주인구/소득/시설) + 자치구·행정동 메타를 반환한다. 점수는 포함하지 않는다.
- `CommercialComparePreviewQueryProcessor.getPreview(...)` — 기존 `CommercialComparisonQueryProcessor.compareCommercials(...)` 결과를 재사용해 6개 headline 지표 + recommendedSide 만 프로젝션한다.
- 내부용 엔드포인트 (`@Hidden`, 총 5개): `/commercials/heatmap`, `/commercials/candidates`, `/commercials/heatmap-composite`, `/commercials/{code}/profile`, `/commercials/compare-preview`. 외부 노출은 district-service `/api/v1/map/commercials/...` 만 사용한다.
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
  - `breakdown: List<MetricBreakdownItem>` (composite 모드에서 지표별 기여 상세, 단일 지표 모드는 null)

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

## 공유 링크 (sharelink)

- 분석 화면을 상대방에게 공유하기 위한 단축 코드 발급/해석 컨텍스트. 자세한 프론트 연동은
  `docs/share-link-frontend-guide.md` 참고.
- `POST /api/v1/share-links` (선택적 인증) — `{shareType, payload}`로 base62 8자 공유 코드 발급.
  payload는 백엔드가 해석하지 않는 opaque JSON 객체(정규화 후 2000자 이하)다.
  Bearer 토큰이 있으면 최초 공유자(memberId)를 기록하고, 비로그인 생성이면 null로 남는다.
- `GET /api/v1/share-links/{shareCode}` (공개) — shareType 메타데이터 + payload 반환.
  프론트가 shareType별 URL 템플릿에 payload를 합쳐 최종 진입 URL을 조립한다.
- 중복 방지: `SHA-256(shareType | 정렬된 payload JSON)` 해시 unique. 같은 화면 상태를 다시
  공유하면 기존 코드의 만료 시각만 연장한다 (기본 TTL `app.share-link.ttl-days` = 90일).
- 새 화면을 공유 대상으로 추가할 때는 `ShareTargetType`에 상수 하나만 추가하면 된다.
- 만료 링크는 `410 SHARE_LINK_002`, 미존재 코드는 `404 SHARE_LINK_001`로 응답한다.

## 분석 인기 순위 (ranking)

- 사용자가 많이 조회한 상권/자치구/행정동 실시간 인기 순위 (인기 검색어 방식).
- `GET /api/v1/analysis-rankings?areaType=COMMERCIAL|DISTRICT|ADMINISTRATION&size=10` (공개)
  — 응답: `{areaType(metadata), windowHours, rankings[{rank, areaCode, areaName?, viewCount}]}`
- 파이프라인: 분석 조회 Facade → `AnalysisViewEventPort`(Kafka `bosspick.analysis-events`)
  → `AnalysisViewEventKafkaListener` → Redis ZSET 시간 버킷(`{prefix}:ranking:analysis:{TYPE}:{yyyyMMddHH}`,
  TTL window+2h) → 조회 시 최근 `app.ranking.window-hours`(기본 24h) 버킷 ZUNIONSTORE.
- 이벤트 발행 지점(화면당 1회 대표 API): 상권=`/{code}/foot-traffic`, 자치구=`/{code}` 상세, 행정동=`/{code}` 상세.
- **장애 격리 계약**: `AnalysisViewEventPort` 구현체는 절대 예외를 던지지 않는다.
  producer `max.block.ms=1000` 으로 브로커 다운 시에도 분석 API 지연은 최대 1초 이내이며 이벤트만 유실된다.
  `app.ranking.enabled=false`(기본)면 Kafka producer/consumer 빈이 아예 등록되지 않는다.
  컨슈머는 해석 불가/집계 실패 이벤트를 로그만 남기고 건너뛴다 (poison 재시도 루프 방지).
- Redis 장애 시 인기 순위 조회만 `503 RANKING_001` 로 응답하고 나머지 분석 API 는 영향 없다.
- **집계 성능**: 조회 결과는 고정 키(`{prefix}:ranking:analysis:agg:{TYPE}`)에 20초 TTL 로 캐시해
  매 요청마다 윈도우 버킷 전체를 ZUNIONSTORE 하지 않는다. 집계 쓰기는 파이프라인으로 묶어
  이벤트 1건당 Redis 왕복을 1회로 유지한다.
- **컨슈머 유실 (설계상 허용)**: `auto-offset-reset: latest` 이므로 **컨슈머가 내려가 있는 동안
  발행된 이벤트는 복구하지 않는다.** 인기 순위는 부가 데이터이고, 과거 이벤트를 소급 집계하면
  "최근 N시간" 윈도우 의미가 흐려지기 때문이다. 정확한 조회수 집계가 필요해지면 별도 적재 경로를
  둔다 (이 파이프라인을 재사용하지 않는다).
- **조회 어뷰징 방어는 미구현 (추후 추가)**: 같은 사용자가 새로고침을 반복하면 그대로 카운트가 오른다.
  이벤트에 조회 주체 식별자(로그인 memberId / 비로그인 IP 해시)가 없어 dedup 기준을 만들 수 없기 때문이다.
  도입하려면 ① 이벤트에 viewer 식별자 추가 ② 집계 시 `{prefix}:ranking:dedup:{TYPE}:{code}:{viewer}`
  SETNX(60초)로 중복 무시 순서로 확장한다. 식별자 확보가 web 계층 의존을 만들므로 설계 결정이 선행돼야 한다.

## 에러코드 (대역 요약)

컨텍스트별 ErrorCode enum 을 각각 유지한다. 상세 메시지는 각 enum 이 단일 기준점이다.

| Enum | 대역 | 비고 |
|------|------|------|
| `CommercialErrorCode` | `COMMERCIAL_002`~`COMMERCIAL_012` | 도메인 에러 (미존재 404, 통신 불가 503 등) + 검증 `COMMERCIAL_100`/`COMMERCIAL_102` |
| `DistrictErrorCode` | `DISTRICT_001`~`DISTRICT_003` | 지표 미존재 404, 분기 코드 형식 400 |
| `AdministrationErrorCode` | `ADMINISTRATION_001`~`ADMINISTRATION_003` | 행정동 지출/매출/점포 미존재 404 |
| `CommercialSummaryErrorCode` | `COMMERCIAL_SUMMARY_001`~`COMMERCIAL_SUMMARY_002` | 요약 매출/지출 미존재 404 |
| `ShareLinkErrorCode` | `SHARE_LINK_001`~`SHARE_LINK_006` | 미존재 404 / 만료 410 / payload 검증 400 / 코드 생성 실패 500. 검증 대역은 `SHARE_LINK_101`~`SHARE_LINK_102` (`ShareLinkValidationMessage`) |
| `RankingErrorCode` | `RANKING_001`~`RANKING_002` | 저장소 연결 불가 503 / 조회 개수 400 (영역 타입 오류는 공통 COMMERCIAL_102) |

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
