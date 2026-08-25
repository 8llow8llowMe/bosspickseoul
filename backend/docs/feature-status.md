# BossPickSeoul Backend Feature Status

> 다른 AI 모델이나 신규 개발자가 현재 구현 상태를 빠르게 파악하기 위한 문서.
> 각 기능의 구현 파일 경로, 엔드포인트, 주요 설계 결정을 기록한다.

---

## 서비스별 구현 완료 기능

---

### `ai-service` — AI 리포트 Feign 병렬화

**상태**: ✅ 완료

**목적**: `AiReportProcessor`의 8개 Feign 순차 호출을 `CompletableFuture` 병렬 실행으로 전환해 응답 시간 단축.

**핵심 파일**:
- `application/service/processor/AiReportProcessor.java`
  - `regionInfo` 먼저 조회 후 나머지 7개 `CompletableFuture.supplyAsync()` 병렬 실행
  - `CompletableFuture.allOf(...).join()`으로 합류
  - 각 future에 `.exceptionally(e -> fallback)` 적용

**주의사항**:
- ai-service Feign은 JWT 미전달 내부 호출 → `DelegatingSecurityContextExecutor` 불필요

---

### `ai-service` — 상권 AI 리포트 비동기 작업 모델 + 토큰 사용량 카운터 (PR-1)

**상태**: ✅ 완료 (`/commercials`, `/commercials/comparisons`, `/districts`, `/administrations` 4종 전부 비동기 전환 완료)

**목적**: LLM 호출이 길어 동기 대기 UX 가 나쁨. 캐시 hit 면 즉시 응답, miss 면 작업 ID 발급 후 백그라운드 처리, 사용자 polling. 동시에 사용자별 토큰 사용량 일별 누적해 운영 capacity 가시화.

**엔드포인트**:
- `POST /api/v1/ai-reports/commercials/{commercialCode}` — 인증 필수
  - 캐시 hit → 200 + `{submissionStatus: CACHED, commercialReport}`
  - cache miss → 202 + `{submissionStatus: ACCEPTED, jobId}`
  - 동일 사용자/요청 in-flight → 202 + 기존 jobId (멱등)
- `GET /api/v1/ai-reports/jobs/{jobId}` — 인증 필수, 본인 작업만
  - status ∈ `{PENDING, RUNNING, COMPLETED, FAILED}`
  - COMPLETED 시 `commercialReport` 포함

**핵심 파일** (모두 `domainlayer/aireport/` 하위):
- `domain/model/AiReportJob.java` — 작업 도메인 record (`requestParams: Map<String,String>` 으로 jobType 별 파라미터 보관)
- `domain/model/AiReportJobStatus.java` — PENDING/RUNNING/COMPLETED/FAILED
- `domain/model/AiReportJobType.java` — COMMERCIAL/COMMERCIAL_COMPARISON/DISTRICT/ADMINISTRATION
- `domain/model/AiUsageMeta.java` — `(modelName, promptTokens, completionTokens)`
- `application/model/AiGenerationResult.java` — `<T draft, AiUsageMeta usage>` 래퍼
- `application/port/out/AiReportJobStorePort.java` + `adapter/out/store/RedisAiReportJobStoreAdapter.java`
- `application/port/out/AiUsageCounterPort.java` + `adapter/out/store/RedisAiUsageCounterAdapter.java`
- `application/service/processor/AiReportJobProcessor.java` — 캐시 first-check / 멱등성 / SHA256 requestHash / @Async 기동
- `application/service/worker/AiReportWorker.java` — `@Async("aiReportTaskExecutor")` 비동기 처리, 상태 전이, 토큰 카운트 기록
- `global/config/AsyncConfig.java` — ThreadPoolTaskExecutor (core 4 / max 8 / queue 50)
- `global/properties/AiReportJobProperties.java` — TTL 설정
- `adapter/in/web/dto/response/AiReportSubmissionResponse.java`, `AiReportJobStatusResponse.java`

**Redis 스키마**:
- `{prefix}:ai:job:{jobId}` (TTL 24h) — `AiReportJob` JSON
- `{prefix}:ai:job:idempotency:{memberId}:{requestHash}` (TTL 24h) → jobId
- `{prefix}:ai:usage:{memberId}:{yyyy-MM-dd}` (TTL 30d) — `promptTokens / completionTokens / count`

**LLM port 시그니처 변경**:
- `AiLlmPort.generateCommercialReport(...)` 외 4개 메서드가 `AiGenerationResult<*Draft>` 반환 (기존 `*Draft` 직접 반환 → wrapper)
- Ollama 어댑터: `ChatResponse.metadata.usage` 에서 토큰 추출
- OpenAI 어댑터: 현재 단가 추적 미사용이라 `AiUsageMeta.empty()` 반환

**프로퍼티** (`application-local.yml`):
```yaml
ai:
  report:
    job:
      ttl-seconds: 86400
      usage-ttl-seconds: 2592000
```

**의존성 추가**: `service/ai-service/build.gradle` 에 `spring-boot-starter-oauth2-resource-server` (Spring Security `@PreAuthorize`/`@AuthenticationPrincipal` 활성화)

**ErrorCode**: `AI_005` (JOB_NOT_FOUND), `AI_006` (JOB_STORE_UNAVAILABLE), `AI_008` (JOB_FAILED), `AI_009` (JOB_TIMEOUT)
인증 실패는 ai-service 가 직접 발행하지 않고 `security-core` 의 `SecurityErrorCode` 를 사용한다 (SECURITY_001 / SECURITY_006).

**리뷰 반영 (round 1)**:
- 멱등성 원자 보장: `findInFlightJobIdByRequestHash` (조회→생성 2단계) 제거 → `reserveOrGetExistingJobId` (`Redis SETNX`) 단일 호출. 동시 두 건 들어와도 한 건만 워커 디스패치.
- 좀비 작업 lazy 만료: `getJobInfo` 시 `PENDING > 30s` / `RUNNING > 5min` 자동 FAILED + idempotency 해제 (`AI_009`).
- 워커 디스패치 실패도 즉시 FAILED 처리 (이전: PENDING 영구 잔류 가능).
- 워커 초기 단계 (`findById`, RUNNING 전환) try 안으로 이동 — Redis hiccup 시 silent fail.
- 워커 종료 시 finally 블록에서 idempotency 항상 해제 (성공/실패 관계없이).
- 외부 노출 errorCode/errorMessage 는 ErrorCode 한국어 메시지만 — 원인 예외 메시지 누출 차단. AI_999 raw 코드 제거.
- 회귀 테스트 추가: `AiReportJobProcessorTest` (9 케이스) + `AiReportWorkerTest` (6 케이스).

**리뷰 반영 (round 2)**:
- **레거시 GET 4개 인증 필수화** (`@PreAuthorize("isAuthenticated()")` + `@SecurityRequirement`) — 비인증 cache miss → LLM 호출로 비용 증폭 + 공개 DoS 경로 차단 + 사용자 단위 추적 가능. (이후 4종 비동기 전환 완료와 함께 동기 GET 4개는 **완전 삭제됨**)
- **save → reserve 순서 reverse + race-loss cleanup**: PENDING 작업 entry 를 먼저 저장한 뒤 `setIfAbsent` 로 idempotency 키 발행. 패배 시 자기가 저장한 orphan 작업을 `deleteJob` 으로 즉시 제거. 결과: 외부에 노출된 idempotency 키는 항상 valid jobId 를 가리킨다.
- **결과 스냅샷 임베드**: `AiReportJob.commercialReport` 필드 신설. 워커 완료 시 `completedWithCommercialReport(report, now)` 로 결과를 job 자체에 저장. `getJobInfo` 는 캐시 의존 없이 job 스냅샷에서 직접 응답. (legacy 미임베드 작업만 cache fallback)
- **MockMvc 컨트롤러 회귀 테스트**: `AiReportWebControllerTest` (5 케이스) — POST 200 (CACHED) / 202 (ACCEPTED) / GET COMPLETED / GET 404 (다른 사용자) / GET RUNNING 응답 형태.
- 결과: ai-service 테스트 27건 (Processor 10 + Worker 6 + Controller 5 + 기존 6).

**다음 PR 후보**:
- Bucket4j rate limit (사용자별 분당 5건 / 일당 30건)
- 사용량 조회 endpoint `/usage/me` (필요 시점에)
- durable queue (Redis Streams 또는 외부 큐) 검토 — 멀티 인스턴스 운영 시

---

### `ai-service` — AI 리포트 작업 상태 SSE 스트리밍

**상태**: ✅ 완료

**목적**: 폴링(1~2초 간격)의 불필요한 요청/지연 제거. 작업 상태 변화를 서버가 push.

**엔드포인트**:
- `GET /api/v1/ai-reports/jobs/{jobId}/stream` — 인증 필수, 본인 작업만
  - `text/event-stream` 응답, `job-update` 이벤트로 상태 push
  - 25초 간격 하트비트로 프록시 idle timeout 방지
  - 존재하지 않거나 타인의 jobId 는 스트림 시작 전에 404 JSON 오류

**클라이언트 계약**:
- 브라우저 기본 `EventSource` 는 Authorization 헤더 미지원 → fetch 기반 SSE 클라이언트 사용
- SSE 우선, 연결 실패·중단 시 `GET /jobs/{jobId}` 폴링으로 폴백
- 작업 상태 응답(`AiReportJobStatusResponse`)의 `status` / `jobType` 은 `{code, name, description}` metadata 객체
- `status` 가 PENDING/RUNNING 일 때만 `progressMessages: List<String>` (진행 문구 로테이션 목록) 포함

프론트 연동 상세는 `ai-report-frontend-guide.md` 참고.

---

### `commercial-service` — 분석 화면 공유 링크

**상태**: ✅ 완료

**목적**: 분석 화면 상태를 단축 코드로 공유. 백엔드는 payload 를 해석하지 않고 저장/반환만 담당, 화면 복원은 프론트 책임.

**엔드포인트**:
- `POST /api/v1/share-links` — **선택적 인증** (Bearer 토큰 있으면 최초 공유자 기록, 없어도 생성 가능)
- `GET /api/v1/share-links/{shareCode}` — 공개 (인증 불필요)

**설계 결정**:
- `sharelink` 컨텍스트 — commercial-service 의 유일한 write 컨텍스트
- `ShareTargetType` 5종: `COMMERCIAL_ANALYSIS` / `DISTRICT_ANALYSIS` / `ADMINISTRATION_ANALYSIS` / `COMMERCIAL_COMPARISON` / `AI_REPORT`
- `shareCode`: base62 8자, TTL 90일 — 만료 시 `410`, 미존재 시 `404`
- `payload`: 백엔드가 해석하지 않는 JSON 객체, 정규화(key 정렬) 후 2000자 이하
- 동일 상태 재공유 시 기존 코드 재사용 + 만료 연장 (공유 버튼 연타에 안전)

**ErrorCode**: `SHARE_LINK_001~006` (비즈니스) + `SHARE_LINK_101~102` (필드 검증). 폴백/파라미터 타입 불일치는 `COMMERCIAL_100` / `COMMERCIAL_102` 재사용.

프론트 연동 상세는 `share-link-frontend-guide.md` 참고.

---

### `commercial-service` — 분석 화면 보관함

**상태**: ✅ 완료

**목적**: 회원이 보고 있는 분석 화면 상태(조건 포함)를 만료 없이 저장/복원하는 개인 보관함. payload 계약은 공유 링크와 동일해 프론트가 payload 빌더를 재사용한다.

**엔드포인트** (`/api/v1/analysis-bookmarks`, 전부 인증 필수):
- `POST /` — `{shareType, payload, bookmarkName?}` 저장, 동일 상태 재저장 `409` (dataBody 에 `existingBookmarkId`), 상한 초과 `400`
- `GET /?shareType=&page=&size=` — 본인 보관함 최신순 페이지 (size 1~50, shareType 선택 필터)
- `PATCH /{bookmarkId}` — 이름 수정 (null/공백이면 이름 제거)
- `DELETE /{bookmarkId}` — 본인 항목 삭제, 타인 항목은 `404` (존재 여부 비노출)

**설계 결정**:
- `analysisbookmark` 컨텍스트 — 공유 링크(`sharelink`)와 별도 테이블 `analysis_bookmark`.
  공유 링크는 만료(TTL 90일)와 전역 payloadHash unique(최초 공유자 기록) 구조라 회원 소유 보관함에 부적합.
- 정규화(key 정렬)·해시(`SHA-256(shareType | canonical payload)`)·2000자 제한·`ShareTargetType` 5종은
  공유 링크와 공용 컴포넌트(`SharePayloadCanonicalizer`)로 동일 규칙 보장
- 중복 방지: `(memberId, payloadHash)` unique — 회원별로만 중복 차단.
  동시 저장 경합은 유니크 제약 위반을 핸들러가 동일한 409 로 변환
- 회원당 저장 상한 `app.analysis-bookmark.max-per-member` (기본 100)
- 응답 `bookmarkId` 는 문자열 (Snowflake 값의 JS 정밀도 손상 방지)
- 목록 정렬 `createdAt desc, id desc` — 동일 시각 행의 페이지 경계 중복/누락 방지
- 수정/삭제는 소유자 조건 포함 단일 UPDATE/DELETE (엔티티 로딩 없음)
- id 는 Snowflake — prod DDL 은 `scripts/migration/analysis-bookmark-table-runbook.sql`
- 엔티티 자체 즐겨찾기(auth-service 회원 북마크)와 역할 구분: 보관함은 "조건까지 포함한 화면 상태" 저장

**ErrorCode**: `ANALYSIS_BOOKMARK_001~006` (미존재 404 / 중복 409 / payload·타입 검증 400 / 상한 초과 400) + 검증 `ANALYSIS_BOOKMARK_101~105`

프론트 연동 상세는 `share-link-frontend-guide.md`의 "분석 보관함" 섹션 참고.

---

### `commercial-service` — 상권 트렌드 분석 API

**상태**: ✅ 완료

**엔드포인트**: `GET /api/v1/commercials/{commercialCode}/trend`

| 파라미터 | 필수 | 설명 |
|----------|------|------|
| `serviceCode` | ✅ | 업종 코드 |
| `metricType` | ✅ | `SALES` / `FOOT_TRAFFIC` / `STORE` |
| `periodCode` | 기본 `20233` | 기준 최신 분기 코드 |
| `periodCount` | 기본 `4`, 최대 `8` | 조회 분기 수 |

**응답 필드**: `commercialCode`, `serviceCode`, `metricType`, `trendDirection` (INCREASE/DECREASE/STAGNANT), `periods[]` (periodCode, value, changeRate)

**핵심 파일**:
- `application/service/processor/CommercialTrendQueryProcessor.java` — 분기 코드 역산 + DB 조회 + 방향 판정
- `adapter/in/web/dto/response/CommercialTrendResponse.java`
- `adapter/in/web/dto/item/CommercialTrendItemDto.java`

**설계 결정**:
- 분기 코드 역산: `"20234"` → `["20214","20221",...]` 유틸 내장
- 방향 판정: 기존 `PeriodTrendType` enum 재사용
- STORE 타입은 개폐업 건수 기준 추이 반환

---

### `commercial-service` — 업종별 상권 추천 API

**상태**: ✅ 완료

**엔드포인트**: `GET /api/v1/commercials/recommendations/by-service`

| 파라미터 | 필수 | 설명 |
|----------|------|------|
| `serviceCode` | ✅ | 업종 코드 (프리셋 자동 선택에 사용) |
| `commercialCodes` | ✅ | 상권 코드 목록 |
| `periodCode` | 기본 `20233` | 기준 분기 코드 |
| `topN` | 기본 `5`, 범위 `5~30` | 추천 상위 N |

**serviceCode → 프리셋 매핑** (`CommercialCandidateQueryProcessor.resolvePresetFromServiceCode`):
- `CS1*` (음식업) → `AGGRESSIVE_OPPORTUNITY` (공격형)
- `CS2*` (서비스업) → `STABLE_LOW_RISK` (안정형)
- 그 외 → `BALANCED` (균형형)

**응답**: 기존 `CandidateCommercialsResponse` 재사용 (rank, compositeScore, reasonTags 포함)

**핵심 파일**:
- `CommercialCandidateQueryProcessor.getTopCandidatesByService()` — preset 자동 선택 후 기존 파이프라인 위임
- `CommercialWebFacade.getRecommendationsByService()`

---

### `commercial-service` — 상권 프로필 API 고도화

**상태**: ✅ 완료

**변경 내용**:
- `CommercialProfileResponse`에 `periodCode`, `serviceCode` 추가 (어떤 분기·업종 기준인지 명시)
- `CommercialProfileKeyMetricsItem`에 파생 인사이트 3개 추가 (기존에 로드된 데이터에서 derive, 추가 DB 쿼리 없음):
  - `peakSalesTimeSlot` — 6개 시간대 중 매출 가장 높은 시간대 (예: `"17시~21시"`)
  - `peakFootTrafficTimeSlot` — 유동인구 피크 시간대
  - `dominantSalesAgeGroup` — 매출 주 연령대 (예: `"30대"`)
- `CommercialProfileQueryProcessor` — `peakIndex()` 유틸로 계산, 상수 배열로 label 매핑

**영향 파일**:
- `application/info/profile/CommercialProfileInfo.java`
- `application/info/profile/CommercialProfileKeyMetricsInfo.java`
- `adapter/in/web/dto/response/CommercialProfileResponse.java`
- `adapter/in/web/dto/item/CommercialProfileKeyMetricsItem.java`
- `application/service/processor/CommercialProfileQueryProcessor.java`

---

### `commercial-service` — Composite 히트맵 지표별 세부 점수 추가

**상태**: ✅ 완료

**변경 내용**:
- `CommercialHeatmapScoreItem`에 `breakdown: List<MetricBreakdownItem>` 추가 (nullable)
- 복합 히트맵(`/heatmap-composite`) 응답에서 각 상권의 개별 지표 점수(기회도·위험도·혼잡도·거주수요) 포함
- 단일 지표 히트맵(`/heatmap`)은 `breakdown: null` 유지 — 하위 호환성 보장

**영향 파일**:
- `application/info/heatmap/CommercialHeatmapScoreInfo.java`
- `adapter/in/web/dto/item/CommercialHeatmapScoreItem.java`
- `application/service/processor/CommercialCandidateQueryProcessor.java`

---

### `commercial-service` — CandidatePresetType 확장

**상태**: ✅ 완료

`CandidatePresetType` enum에 2개 상수 추가:

| 상수 | 표시명 | 기본 우선 지표 | 가중치 (기회/위험/혼잡/거주) |
|------|--------|---------------|--------------------------|
| `YOUTH_STARTUP` | 청년창업형 | OPPORTUNITY_SCORE | 0.45 / 0.20 / 0.25 / 0.10 |
| `RE_EMPLOYMENT_STARTUP` | 재취업창업형 | RESIDENT_POPULATION_SCORE | 0.20 / 0.35 / 0.05 / 0.40 |

---

### `district-service` — CandidatePresetType 동기화

**상태**: ✅ 완료

`district-service`의 `CandidatePresetType`(히트맵 API용 응답 메타데이터)에 동일한 2개 상수 추가:
- `YOUTH_STARTUP` (청년창업형, defaultPriorityMetric: OPPORTUNITY_SCORE)
- `RE_EMPLOYMENT_STARTUP` (재취업창업형, defaultPriorityMetric: RESIDENT_POPULATION_SCORE)

`district-service` 버전은 가중치 필드 없음 — 점수 계산은 `commercial-service`에서 수행하고 `district-service`는 메타데이터 제공만 담당.

---

### `auth-service` — 상권 북마크 시스템

**상태**: ✅ 완료

**엔드포인트**:
- `POST /api/v1/members/me/bookmarks` — 북마크 추가
- `DELETE /api/v1/members/me/bookmarks/{bookmarkId}` — 북마크 삭제
- `GET /api/v1/members/me/bookmarks` — 북마크 목록 (커서 페이지네이션)

**DB 테이블**: `member_bookmark`
```sql
id           BIGINT PK (Snowflake)
member_id    BIGINT NOT NULL
target_type  VARCHAR(20) NOT NULL   -- COMMERCIAL / ADMINISTRATION / DISTRICT
target_code  VARCHAR(20) NOT NULL   -- commercial_region_mapping FK 없음 (서비스 간 DB 분리)
target_name  VARCHAR(80) NOT NULL   -- 스냅샷 저장
created_at   DATETIME NOT NULL
UNIQUE(member_id, target_type, target_code)
INDEX(member_id, created_at)
```

**핵심 파일 (`domainlayer/member/`)**:
- `domain/enums/MemberBookmarkTargetType.java` — `COMMERCIAL / ADMINISTRATION / DISTRICT`
- `adapter/out/persistence/entity/MemberBookmarkEntity.java`
- `adapter/out/persistence/repository/MemberBookmarkRepository.java` — Spring Data 파생 쿼리 기반 커서 페이지네이션
- `application/service/MemberBookmarkWebFacade.java`
- `adapter/in/web/controller/MemberBookmarkWebController.java`
- `adapter/in/web/exception/MemberExceptionHandler.java` — `MemberException`, `BookmarkException` 통합 처리

**설계 결정**:
- `commercial_region_mapping` FK 미참조 — 서비스 간 DB 결합 방지. `target_code` 문자열만 저장.
- 커서 페이지네이션: QueryDSL 없이 Spring Data 파생 쿼리 2개로 구현 (`firstPage` vs `nextPage`)

---

### `community-service` — 게시글 조회수 + 검색

**상태**: ✅ 완료

**조회수**:
- `community_post` 테이블 `view_count BIGINT DEFAULT 0` 컬럼 추가
- `GET /api/v1/community/posts/{postId}` 호출 시 자동 +1 (경쟁 조건 허용, 데모 수준)
- 응답 `CommunityPostDetailResponse`에 `viewCount` 필드 추가

**검색 엔드포인트**: `GET /api/v1/community/posts/search`

| 파라미터 | 설명 |
|----------|------|
| `keyword` | 제목 또는 본문 포함 검색 (OR 조건) |
| `sortType` | LATEST / POPULAR |
| `orderType` | ASC / DESC |
| `lastPostId` | 커서 |
| `lastLikeCount` | POPULAR 정렬 커서 |
| `size` | 기본 10 |

**핵심 파일**:
- `CommunityPostCustomRepositoryImpl` — `containsIgnoreCase(keyword)` OR 조건 추가
- `CommunityCommandProcessor.incrementViewCount()` — 조회수 증가 전용 메서드
- `CommunityPostWebFacade.getPost()` — `@Transactional(readOnly=false)` 변경 + 조회수 증가 호출

---

### `community-service` — 대댓글 (depth 1 고정)

**상태**: ✅ 완료

**DB 변경**: `community_comment` 테이블에 `parent_comment_id BIGINT NULL` 컬럼 + 인덱스 추가

**요청**: `POST /api/v1/community/posts/{postId}/comments`
```json
{ "parentCommentId": 123456, "content": "대댓글 내용" }
```
- `parentCommentId` 생략 시 최상위 댓글

**응답 구조** (`CommunityCommentsResponse`):
```json
{
  "comments": [
    {
      "commentId": 1, "content": "...", "replies": [
        { "commentId": 2, "parentCommentId": 1, "content": "..." }
      ]
    }
  ]
}
```

**depth 1 제한 검증** (`CommunityCommandProcessor.validateParentComment`):
1. 부모 댓글이 동일 게시글 소속인지 확인
2. 부모 댓글의 `parentCommentId != null` → 대댓글의 대댓글 시도 → `INVALID_TARGET_TYPE` 예외
3. 부모 댓글 상태 `ACTIVE` 확인

**계층 조립**: DB 조회는 `postId` 기준 flat list → Presenter에서 in-memory 그룹핑

---

### `community-service` — 신고 모더레이션 워크플로우

**상태**: ✅ 완료

**엔드포인트** (MANAGER 권한 필요):
- `GET /api/v1/moderation/reports` — 미처리(`PENDING`) 신고 목록
- `PATCH /api/v1/moderation/reports/{reportId}` — 신고 처리

**처리 요청**:
```json
{ "decision": "APPROVE_AND_HIDE" }
```
- `APPROVE_AND_HIDE`: 신고 대상 post/comment를 `DELETED`로 변경 + 신고 `APPROVED` 처리
- `DISMISS`: 신고만 `DISMISSED` 처리, 대상 컨텐츠는 유지

**DB 변경**: `community_report` 테이블에 컬럼 추가
```sql
status                 VARCHAR(20) NOT NULL DEFAULT 'PENDING'  -- PENDING/APPROVED/DISMISSED
resolved_at            DATETIME NULL
resolved_by_member_id  BIGINT NULL
INDEX(status)
```

**새 도메인 파일**:
- `domain/enums/ReportStatus.java` — `PENDING / APPROVED / DISMISSED`
- `domain/enums/ModerationDecision.java` — `APPROVE_AND_HIDE / DISMISS`

**핵심 파일**:
- `application/service/processor/ModerationCommandProcessor.java` — 신고 처리 + 대상 숨김 (COMMENT 숨김 시 부모 게시글 commentCount 감소 포함)
- `application/service/processor/ModerationQueryProcessor.java` — Port 접근 캡슐화 (Hexagonal 경계 준수)
- `application/service/ModerationWebFacade.java` — 신고 + 대상 컨텐츠 하이드레이션 후 Presenter 위임
- `adapter/in/web/controller/ModerationWebController.java` — `@PreAuthorize("hasAuthority('MANAGER')")`
- `adapter/in/web/dto/response/ModerationReportItem.java` — `targetTitle`, `targetPreview`, `targetAuthorId` 추가

**버그 수정**:
- `CommunityQueryProcessor.getFeed()` — `targetType` null 시 `targetCode`도 null 정규화 (고아 필터 차단)

---

### `commercial-service` — 창업 시뮬레이션

**상태**: ✅ 완료 (백엔드) / ⏸ 프론트 미연결

**목적**: 업종·매장 크기·프랜차이즈 조건으로 창업 비용과 예상 수익을 계산해 리포트로 제공.

**엔드포인트**:
- `GET /api/v1/simulations/store-sizes` — 업종별 소/중/대 매장 크기(㎡·평), 공개
- `GET /api/v1/simulations/franchisees` — 프랜차이즈 브랜드 검색(`keyword`, `serviceCode`, 커서), 공개
- `POST /api/v1/simulations/reports` — 리포트 생성(저장 없음), 공개
- `POST /api/v1/simulations/histories` — 결과를 내 이력에 저장, 인증 필요
- `GET /api/v1/simulations/histories` — 내 이력 목록, 인증 필요

**설계 결정**:
- **생성과 저장을 분리** — 로그인 없이 결과를 볼 수 있고, 저장하려는 시점에만 인증을 요구한다.
  가입 전에 가치를 먼저 보여주기 위한 선택이다.
- 조회 3종은 공개, 이력 2종만 `@PreAuthorize("isAuthenticated()")`

**ErrorCode**: `SIMULATION_001~004` (비즈니스) + `SIMULATION_100~101` (검증)

**⚠️ 프론트 연결 필요**: 프론트에 화면 컴포넌트(`simulation-form-page`, `simulation-report-page`,
`simulation-compare-page`)가 이미 있으나, 라우트가 `SimulationUnavailablePage` 를 렌더한다.
`src/lib/api/simulation.ts` 가 V1 경로(`/simulation/store`, `/simulation/franchisee`,
`/simulation`, `/simulation/save`)를 호출하고 있어 위 V2 경로로 교체해야 한다.
프론트가 대기 상태로 전환한 시점(`df626c33`, 2026-07-28)보다 백엔드 API 가 나중에 들어와 생긴 공백이다.

---

### `commercial-service` — 실시간 인기 순위

**상태**: ✅ 완료

**목적**: 분석 화면 조회 이벤트를 모아 인기 지역 순위를 제공.

**엔드포인트**:
- `GET /api/v1/analysis-rankings` — 최근 조회 기준 인기 지역 순위, 공개

**설계 결정**:
- **발행과 조회를 분리** — 조회 API 는 Redis Sorted Set 만 읽으므로 `RANKING_ENABLED` 와 무관하게
  항상 동작한다. 파이프라인이 꺼져 있으면 빈 순위가 나올 뿐 장애가 아니다.
- `RANKING_ENABLED=false`(기본)면 Kafka producer/consumer 빈이 등록되지 않아 브로커 없이도 기동한다.
  producer 자리는 `NoOpAnalysisViewEventAdapter` 가 채운다.
- **인기 순위는 유실 허용 부가 데이터** — producer 는 `acks=1`, `max.block.ms=1000` 으로 두어
  브로커 장애가 분석 API 응답을 막지 않는다. 발행 실패는 WARN 로그만 남기고 흡수한다.
- 토픽(`bosspick.analysis-events`)은 기동 시 `KafkaAdmin` 이 생성한다(`RankingTopicConfig`).
  브로커의 `auto.create.topics.enable` 과 무관한 admin API 를 쓴다.

**ErrorCode**: `RANKING_001~002`

배포 시 필요한 Vault key 는 `deploy-guide.md` 의 "인기 순위(Kafka) 활성화 시 필요한 key" 참고.

---

### `auth-service` / `community-service` — 이미지 업로드

**상태**: ✅ 완료 (백엔드) / ⏸ 프론트 미연결

**엔드포인트**:
- `POST /api/v1/members/me/profile-image` — 프로필 이미지 업로드(`multipart/form-data`), 인증 필요
- `DELETE /api/v1/members/me/profile-image` — 프로필 이미지 삭제, 인증 필요
- `POST /api/v1/community/posts/images` — 게시글 이미지 업로드(`multipart/form-data`), 인증 필요

**설계 결정**:
- 저장소는 MinIO. 업로드 응답으로 공개 URL 을 돌려주고, 본문/프로필에는 URL 만 저장한다.
- 업로드 상한은 환경변수로 조정한다: `MULTIPART_MAX_FILE_SIZE`(기본 5MB),
  `MULTIPART_MAX_REQUEST_SIZE`(기본 30MB). 두 서비스 compose 에 배선되어 있다.

**⚠️ 프론트 연결 필요**: 커뮤니티 편집기는 "이미지 첨부 · 준비 중"으로 비활성이고,
프로필 화면은 `profileImageUrl` 을 표시만 하며 업로드/삭제 배선이 없다.

---

### `commercial-service` — 지원 정책 추천

**상태**: ✅ 완료 (도메인·API·시드) / ⏸ 실데이터 연동은 별도

**목적**: 상권의 자치구·업종에 맞는 소상공인 지원 정책을 추천.

**엔드포인트**:
- `GET /api/v1/policies` — 자치구·업종 조건 추천 (`districtCode`, `serviceCode`, `size` 기본 5), 공개
- `GET /api/v1/commercials/{commercialCode}/profile` 응답의 `policyRecommendations` 에 상위 5건 포함

**설계 결정**:
- **null 이 "제한 없음"** — 전국 정책은 `districtCode` 가 null, 전업종 정책은 `serviceCategoryCode` 가 null 이다.
  별도 "전체" 코드를 두면 조회 조건이 "특정 값 OR 전체코드" 두 갈래로 갈라져 인덱스와 쿼리가 복잡해진다.
- **범위 포함 매칭** — 자치구를 지정해도 지역 제한이 없는 정책이 함께 나온다. 사용자는 "내가 받을 수 있는 것"을
  보려는 것이지 "내 자치구에만 있는 것"을 보려는 게 아니다.
- **업종은 대분류(앞 3자리)로 매칭** — `CS100001` → `CS1`. 정책은 세부 업종까지 나누지 않는다.
  값이 접두어보다 짧으면 조건에서 제외한다. 짧은 값을 그대로 넣으면 아무것도 매칭되지 않아 빈 목록이 되기 때문이다.
- **정렬: 자치구 전용 → 마감 임박순 → 상시 모집** — 구체적인 정책이 유용하고, 기한이 있는 쪽이 급하다.
- 프로필 통합은 Facade 가 조합한다. 요청에는 자치구가 없고 상권 코드만 오므로,
  프로필이 확정한 `districtCode` 로 정책을 조회한다.

**ErrorCode**: `POLICY_001~002` (비즈니스) + `POLICY_101` (검증). 폴백/타입 불일치는 `COMMERCIAL_100` / `COMMERCIAL_102` 재사용.

**시드**: `resources/db/policy-seed.sql` — 14건. ⚠️ **실데이터가 아니라 도메인·API 계약 검증용 표본**이다.
전지역/업종한정/자치구한정 세 갈래를 모두 포함해 매칭·정렬을 확인할 수 있게 구성했다.

---

## 미구현 / 보류 기능

---

### `commercial-service` — 정책 추천 실 데이터 연동

**상태**: ⏸ 보류 (도메인은 완료, **실데이터 수집만 남음**)

도메인·API·시드는 아래 "지원 정책 추천"으로 완료했다. 남은 것은 실제 정책 데이터 확보 하나다.

**남은 이유**:
1. 실제 정책 데이터 스크래퍼 미구축 (서울시 소상공인지원센터, K-Startup 등 외부 API/크롤링 필요)
2. 기관마다 응답 형식이 달라 정규화 매핑이 필요하다

**재개 시 필요한 작업**:
1. 공공 API 조사 및 키 발급 (서울열린데이터광장 / K-Startup 등)
2. `batch-service` 에 적재 job 구현 — `AreaBoundaryImportJobConfig` + `Tasklet` 패턴을 그대로 따르면 된다
3. 기관 응답을 `PolicySupportType` 5종과 `districtCode`/`serviceCategoryCode` 규칙으로 정규화
4. 시드 데이터(`policy-seed.sql`) 제거 또는 실데이터로 교체

**스키마 변경은 필요 없을 전망**이다. `policy` 테이블은 기관 응답 형태에 종속되지 않게 설계했고,
적재 job 이 정규화를 담당하면 도메인·API 는 그대로 쓸 수 있다.

---

## API 엔드포인트 요약

### `commercial-service` (`/api/v1/commercials`)

| Method | Path | 설명 | 인증 |
|--------|------|------|------|
| GET | `/{code}/trend` | 상권 분기별 트렌드 분석 | 불필요 |
| GET | `/recommendations/by-service` | 업종 기반 상권 자동 추천 | 불필요 |
| POST | `/api/v1/share-links` | 분석 화면 공유 링크 생성 | 선택 |
| GET | `/api/v1/share-links/{shareCode}` | 공유 코드 해석 | 불필요 |
| POST | `/api/v1/analysis-bookmarks` | 분석 화면 보관함 저장 | ✅ |
| GET | `/api/v1/analysis-bookmarks` | 내 보관함 목록 (최신순 페이지, shareType 필터) | ✅ |
| PATCH | `/api/v1/analysis-bookmarks/{bookmarkId}` | 보관함 이름 수정 | ✅ |
| DELETE | `/api/v1/analysis-bookmarks/{bookmarkId}` | 보관 항목 삭제 | ✅ |

### `ai-service` (`/api/v1/ai-reports`)

| Method | Path | 설명 | 인증 |
|--------|------|------|------|
| POST | `/commercials/{commercialCode}` | 상권 AI 리포트 비동기 제출 (cache hit 200 / miss 202 + jobId) | ✅ |
| POST | `/commercials/comparisons` | 상권 비교 AI 인사이트 비동기 제출 | ✅ |
| POST | `/districts/{districtCode}` | 자치구 AI 리포트 비동기 제출 | ✅ |
| POST | `/administrations/{administrationCode}` | 행정동 AI 리포트 비동기 제출 | ✅ |
| GET | `/jobs/{jobId}` | 작업 상태/결과 조회 (폴링, 본인 작업만) | ✅ |
| GET | `/jobs/{jobId}/stream` | 작업 상태 SSE 스트림 (본인 작업만) | ✅ |

### `auth-service` (`/api/v1/members`)

| Method | Path | 설명 | 인증 |
|--------|------|------|------|
| POST | `/me/bookmarks` | 북마크 추가 | ✅ |
| DELETE | `/me/bookmarks/{id}` | 북마크 삭제 | ✅ |
| GET | `/me/bookmarks` | 북마크 목록 | ✅ |

### `community-service` (`/api/v1/community`)

| Method | Path | 설명 | 인증 |
|--------|------|------|------|
| GET | `/posts/search` | 키워드 게시글 검색 | 불필요 |
| GET | `/posts/{id}` | 게시글 상세 (조회수 +1) | 불필요 |
| POST | `/posts/{id}/comments` | 댓글/대댓글 작성 | ✅ |

### `community-service` (`/api/v1/moderation`)

| Method | Path | 설명 | 인증 |
|--------|------|------|------|
| GET | `/reports` | 미처리 신고 목록 | ✅ MANAGER |
| PATCH | `/reports/{id}` | 신고 처리 결정 | ✅ MANAGER |
