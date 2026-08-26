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
- `simulation`
- `analysisbookmark`
- `policy`

## 인증 방식

- 조회 API가 중심이며, 인증 필요 API만 명시적으로 보호한다.
- security-core의 `ResourceServerSecurityConfigurer` 기반으로 JWT claim을 해석하며,
  기본 permitAll + `@PreAuthorize` 명시 보호 방식을 사용한다.
- `POST /api/v1/share-links`는 **선택적 인증** —
  Bearer 토큰이 있으면 최초 공유자를 기록하고, 없어도 생성할 수 있다.
- 시뮬레이션 저장/목록(`POST·GET /api/v1/simulations/histories`)은 **인증 필수** (`@PreAuthorize("isAuthenticated()")`).
  그 외 시뮬레이션 API(계산/매장 크기/프랜차이즈 검색)는 공개다.
- 분석 보관함(`/api/v1/analysis-bookmarks/**`)은 회원 소유 데이터라 전 API **인증 필수**.

## 대표 API 패턴

- `CommercialWebController`
- `DistrictWebController`
- `AdministrationWebController` (`/api/v1/administrations`)
- `ShareLinkWebController` (`/api/v1/share-links`)
- `PolicyWebController` (`/api/v1/policies`)
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
- 지표 데이터가 없는 상권은 요청 실패가 아니라 점수 산정 제외 대상이다
  (`CommercialHeatmapQueryProcessor.buildSource`가 `CommercialException`을 잡아 빈 소스로 강등).

### 블루오션 업종 (추천 전용)

- 확정된 Top N 각 상권에 `blueOceanCategories`(최대 5개)를 붙인다 — 소속 행정동에는 많지만 해당 상권에는 적은 업종.
- 산식: `storeRate = 상권 업종 점포수 / 행정동 업종 점포수 × 100`, 상권에 없는 업종은 `1/(행정동 점포수+1) × 100`
  라플라스 보정(행정동 점포가 많을수록 더 비어 있는 것으로 평가). `storeRate` 오름차순 Top 5.
- 데이터 원천: `store_commercial`(상권 업종별) + `store_administration`(행정동 업종별) + 상권→행정동 매핑(Feign).
  새 테이블 없음. 산정 실패(지역 서비스 장애 등)는 빈 목록으로 강등되어 추천 자체는 실패하지 않는다.
- `/candidates`(지도 후보 탐색) 경로에는 붙이지 않는다 — 후보 수만큼 지역 조회가 늘어나는 것을 막기 위해 추천 경로 전용.

## CandidatePresetType 확장 (신규)

새 프리셋 2종 추가:
- `YOUTH_STARTUP` (청년창업형): 기회·혼잡 중시, 가중치 0.45/0.20/0.25/0.10
- `RE_EMPLOYMENT_STARTUP` (재취업창업형): 거주수요·안정 중시, 가중치 0.20/0.35/0.05/0.40

## 지원 정책 추천 (policy)

상권의 자치구·업종에 맞는 소상공인 지원 정책을 추천하는 컨텍스트. 게이트웨이 라우트 `/api/v1/policies`.

- `GET /api/v1/policies?districtCode=&serviceCode=&size=` — 신청 가능 정책 추천(기본 5건). 공개
- `GET /api/v1/commercials/{commercialCode}/profile` 응답의 `policyRecommendations` 에 상위 5건 동봉

**지역·업종은 null 이 "제한 없음"이다.** 전국 정책은 `district_code` 가 NULL, 전업종 정책은
`service_category_code` 가 NULL 이다. 조회는 **범위 포함** 매칭이라 자치구를 지정해도 전국 정책이 함께 나온다.

업종은 코드 앞 3자리를 대분류로 쓴다(`CS100001` → `CS1`). 접두어보다 짧은 값이 오면 업종 조건에서 제외한다 —
그대로 넣으면 아무 정책도 매칭되지 않아 빈 목록이 되기 때문이다.

정렬은 `자치구 전용 → 마감 임박순 → 상시 모집` 이고, 신청 기간이 지난 정책은 조회에서 빠진다.

- 신규 테이블: `policy` (인덱스 `idx_policy_apply_end_at_district_code_service_category_code` —
  종료 정책을 먼저 걸러내는 것이 선택도가 가장 높아 마감일을 선두에 둔다)
- 시드: `resources/db/policy-seed.sql` (14건). ⚠️ **실데이터가 아니라 계약 검증용 표본**이다.
  실데이터 적재는 `feature-status.md` 의 "정책 추천 실 데이터 연동" 참고.

## 창업 시뮬레이션 (simulation)

자치구·업종·매장 조건으로 예상 창업 비용을 계산하는 컨텍스트. 게이트웨이 라우트 `/api/v1/simulations/**`.

- `GET /api/v1/simulations/store-sizes?serviceCode=` — 업종별 소/중/대 매장 크기(㎡·평). 공개
- `GET /api/v1/simulations/franchisees?serviceCode=&keyword=&lastId=` — 브랜드 검색, 커서(lastId) 기반 최대 10건. 공개
- `POST /api/v1/simulations/reports` — 시뮬레이션 계산. 공개
- `POST /api/v1/simulations/histories` / `GET /api/v1/simulations/histories?page=&size=` — 결과 저장/목록. **인증 필수**

### 산식 (내부 계산은 원 단위, 응답은 만원)

```
면적단위 = (int)(storeSize / 3.3)
월임대료 = 면적단위 × 자치구 3.3㎡당 임대료(1층/1층외 구분, simulation_rent)
보증금   = 월임대료 × 10
프랜차이즈: 부담금 = totalLevy×1000, 인테리어 = interior×1000  (simulation_franchisee, 천원 단위)
비프랜차이즈: 인테리어 = 면적단위 × 같은 업종 unitArea 평균 × 1000, 부담금 없음
총비용   = 월임대료 + 보증금 + 인테리어 + (부담금)
유사 프랜차이즈 Top5 = |후보 총비용 − 내 총비용| 오름차순
  (후보 총비용 = (가입비+교육비+보증금+기타+인테리어)×1000 + 동일 조건 임대·보증)
성별·연령 분석 = sales_district(기준 분기) 남/여 비중 + 연령 상위 3
성수기/비성수기 = 기준 분기 연도의 분기별 매출 최대/최소 분기 → 표준 분기-월 매핑(1분기=1~3월)
```

### 데이터·설계 노트

- 신규 테이블 4종: `simulation_rent`(자치구 임대료 26행), `simulation_service_type`(업종 기준 30행),
  `simulation_franchisee`(프랜차이즈 비용 11,442행), `simulation_history`(회원 저장 이력)
- 시드: `resources/db/simulation-seed.sql`(rent+service_type),
  `backend/scripts/data-migration/simulation-franchisee-seed.sql`(대용량이라 스크립트 위치).
  생성기: `backend/scripts/data-migration/convert_v1_simulation_seed.py` (V1 덤프 → V2 시드).
- **기준 연도(base_year) 버전 관리**: 기준 데이터 3종은 `base_year` 컬럼으로 연도별 공존 적재하고,
  조회는 `app.simulation.data-base-year` 설정(기본 2024)의 활성 연도만 사용한다.
  재수집 시 새 연도로 적재 → 설정값 전환 → 기존 연도는 롤백용으로 유지.
  응답(`dataBaseYear`)과 저장 이력에 기준 연도가 노출된다.
- **재수집 출처(원천)**:
  - 프랜차이즈 비용: 공정거래위원회 가맹사업정보제공시스템(franchise.ftc.go.kr) 정보공개서 —
    공공데이터포털 OpenAPI "가맹정보 정보공개서 목록 조회", "업종별 창업비용 현황"
  - 자치구 임대료: 한국부동산원 상업용부동산 임대동향조사(R-ONE, reb.or.kr) 분기별 지역별 임대료(소규모/중대형 상가),
    서울열린데이터광장 "서울시 매장용빌딩 임대료" 통계
  - 권리금 수준: 한국부동산원 상업용부동산 임대동향조사 내 권리금 현황
- V1 대비 정비: 자치구를 코드로 받음(코드명 X), `floorType` enum(FIRST_FLOOR/OTHER, 문자열 "1층" 비교 제거),
  프랜차이즈를 franchiseeId 로 지정(브랜드명 문자열 X), 분기-월 매핑을 표준으로 정정,
  "월 최소 목표 매출"(보증금 오표시) 필드는 제공하지 않음.
- 성별·연령/성수기 분석은 기준 데이터가 없으면 오류 대신 null 로 응답한다.

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

## 분석 보관함 (analysisbookmark)

- 회원이 보고 있는 분석 화면 상태를 만료 없이 저장해 두고 다시 여는 개인 보관함.
  게이트웨이 라우트 `/api/v1/analysis-bookmarks/**`, 전 API 인증 필수.
- payload 포맷·정규화(key 정렬)·해시 규칙(`SHA-256(shareType | 정렬된 payload JSON)`, 2000자 제한)과
  `ShareTargetType`(화면 5종)은 **공유 링크와 동일 규칙을 재사용**한다. 규칙의 단일 기준점은
  `sharelink/application/support/SharePayloadCanonicalizer` 로, 두 컨텍스트가 같은 컴포넌트를 쓴다.
  프론트는 공유 링크에 쓰는 payload 를 그대로 저장하면 되고, 복원도 동일한 URL 템플릿 조립 방식을 쓴다
  (`docs/share-link-frontend-guide.md`).
- 공유 링크를 직접 재사용하지 않고 별도 테이블(`analysis_bookmark`)을 두는 이유:
  ① 공유 링크는 TTL(90일)+정리 스케줄러로 **만료**되지만 보관함은 만료가 없어야 한다.
  ② 공유 링크의 payloadHash 는 **전역 unique**(최초 공유자만 기록)라 회원 소유 모델과 맞지 않는다.
  보관함은 `(memberId, payloadHash)` unique 로 회원별 중복만 막는다.
- `POST /api/v1/analysis-bookmarks` — `{shareType, payload, bookmarkName?}` 저장.
  같은 화면 상태 재저장은 409 이며, 실패 응답 dataBody 의 `existingBookmarkId` 로 기존 항목을 알려준다
  (동시 저장 경합은 DB 유니크 제약 + `DataIntegrityViolationException` 핸들러가 같은 409 로 변환, 이때는 dataBody 없음).
  회원당 저장 상한(`app.analysis-bookmark.max-per-member`, 기본 100)을 넘으면 400.
- `GET /api/v1/analysis-bookmarks?shareType=&page=&size=` — 본인 보관함 최신순 페이지 (size 1~50).
  `shareType` 은 선택 필터. 정렬은 `createdAt desc, id desc` — 같은 시각 행이 페이지 경계에서
  중복/누락되지 않도록 id(Snowflake, 시간순 유니크)를 2차 정렬로 둔다.
- `PATCH /api/v1/analysis-bookmarks/{bookmarkId}` — 이름 수정. null/공백이면 이름 제거.
- `DELETE /api/v1/analysis-bookmarks/{bookmarkId}` — 본인 항목 삭제.
  수정/삭제 모두 소유자 조건을 쿼리에 포함한 단일 UPDATE/DELETE 로 처리하고,
  타인 항목은 존재 여부를 숨기려 미존재와 동일하게 404.
- 응답의 `bookmarkId` 는 **문자열**이다 — Snowflake 값이 JS `Number.MAX_SAFE_INTEGER` 를 넘어
  숫자로 내려주면 브라우저에서 정밀도가 손상된다.
- id 는 Snowflake 생성 (AUTO_INCREMENT 아님). prod DDL 은
  `backend/scripts/migration/analysis-bookmark-table-runbook.sql` 수동 적용.
- 자치구/행정동/상권 **엔티티 자체**의 즐겨찾기는 auth-service 회원 북마크
  (`/api/v1/members/me/bookmarks`, `MemberBookmarkTargetType`)가 담당한다.
  보관함은 "조건까지 포함한 화면 상태" 저장이라는 점에서 역할이 다르다.

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
| `RankingErrorCode` | `RANKING_001`~`RANKING_002` | 저장소 연결 불가 503 / 조회 개수 400 (영역 타입 오류는 공통 COMMERCIAL_102). 검증 대역은 `RANKING_101` (`RankingValidationMessage`) |
| `SimulationErrorCode` | `SIMULATION_001`~`SIMULATION_004` | 업종/임대료/프랜차이즈 미존재 404, 프랜차이즈 미선택 400. 검증 대역은 `SIMULATION_101`~`SIMULATION_109` (`SimulationValidationMessage`) |
| `AnalysisBookmarkErrorCode` | `ANALYSIS_BOOKMARK_001`~`ANALYSIS_BOOKMARK_006` | 미존재 404 / 중복 저장 409(dataBody 에 기존 항목 아이디) / payload·타입 검증 400 / 저장 상한 초과 400. 검증 대역은 `ANALYSIS_BOOKMARK_101`~`ANALYSIS_BOOKMARK_105` (`AnalysisBookmarkValidationMessage`) |

## Notes

- Hidden commercial endpoints return the same metadata-rich contract that district-service uses for public map responses.
- `commercialName` is populated from actual analysis source data, not from the code placeholder.
- `metricBreakdown.metricType` also follows the shared metadata object convention.
- `mode` uses a metadata object so callers can render heatmap mode labels without hard-coded enum text.
- Invalid `topN` values are treated as `400 Bad Request` instead of silent clamping at the API boundary.
