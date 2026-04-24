# NowDoBoss Backend Feature Status

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
target_code  VARCHAR(20) NOT NULL   -- area_commercial FK 없음 (서비스 간 DB 분리)
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
- `area_commercial` FK 미참조 — 서비스 간 DB 결합 방지. `target_code` 문자열만 저장.
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

## 미구현 / 보류 기능

---

### `commercial-service` — 정책 추천 실 데이터 연동

**상태**: ⏸ 보류

**이유**:
1. 실제 정책 데이터 스크래퍼 미구축 (서울시 소상공인지원센터, K-Startup 등 외부 API/크롤링 필요)
2. 수집 데이터 구조 확인 후 DB 스키마 재설계 필요
3. 코드 골격은 별도 브랜치 또는 재설계 시 새로 작성

**재개 시 필요한 작업**:
1. 정책 데이터 수집 스크래퍼 구현 (별도 batch-service 또는 외부 스크립트)
2. 수집 결과 기반 `policy` 테이블 스키마 정규화 설계
   - 지원 유형 분류, 지역 범위 계층 구조, 기간 파싱 등 검토
3. `policy` 도메인 전체 스택 재구현 (entity → port → processor → controller)
4. 시드 SQL 작성 및 적재
5. `CommercialProfileResponse`에 정책 추천 목록 재통합 (`policyRecommendations` 필드)

**현재 `CommercialProfileResponse` 상태**: `policyRecommendations` 필드 제거됨 (재추가 필요)

---

## API 엔드포인트 요약

### `commercial-service` (`/api/v1/commercials`)

| Method | Path | 설명 | 인증 |
|--------|------|------|------|
| GET | `/{code}/trend` | 상권 분기별 트렌드 분석 | 불필요 |
| GET | `/recommendations/by-service` | 업종 기반 상권 자동 추천 | 불필요 |

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
