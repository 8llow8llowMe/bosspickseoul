# Community Service Guide

## 서비스 책임

- 자치구 / 행정동 / 상권 대상 게시판형 커뮤니티
- 게시글, 댓글, 좋아요, 신고, 통합 피드 제공

## 주요 컨텍스트

- `community`

## 인증 방식

- 조회는 공개. 게시글 목록·검색·상세는 **선택 인증**이다 — 토큰이 있으면 조회자 본인의 좋아요 여부(`liked`)만 채운다
  (아래 「목록 응답 viewCount·liked (선택 인증)」)
- 작성/수정/삭제/좋아요/신고는 인증 사용자 기준
- JWT claim을 서비스 내부에서 해석한다

## 대표 API 패턴

- `CommunityPostWebController`
- `CommunityCommentWebController`
- `CommunityReportWebController`
- `CommunityPostWebUseCase -> CommunityPostWebFacade`
- `CommunityCommentWebUseCase -> CommunityCommentWebFacade`
- `CommunityReportWebUseCase -> CommunityReportWebFacade`

## 현재 구현 주의점

- 게시글/댓글은 소프트 삭제 기준을 사용한다.
- 게시글 목록/피드는 `SliceResponse` 기반 무한 스크롤을 우선한다.
- 상권별 게시글은 `GET /api/v1/community/posts?targetType=COMMERCIAL&targetCode={code}` 로 조회한다. Post 엔티티는 `commercialCode` 직속 필드 대신 `targetType + targetCode` 일반화 구조를 사용하며, `idx_community_post_target_status_id (targetType, targetCode, status, id)` 인덱스가 뒷받침한다.
- No-offset 커서는 LATEST 정렬에서 `id`, POPULAR 정렬에서 `(likeCount, id)` 복합 커서를 쓴다. `lastPostId == 0` 은 초기 로드 관례다.
- 커서 목록 조회 포트는 Spring Data `Slice` 가 아니라 `application/port/out/query/SliceQueryResult`
  를 돌려준다. 커서 목록에 필요한 건 내용과 다음 페이지 존재 여부 둘뿐이라, 영속성 프레임워크 타입은
  adapter 안에서 끝낸다 (`architecture-guide.md` Port/Adapter 규칙).
- 좋아요/신고 저장 흐름은 `domain -> entity -> repository.save -> entity -> domain` 패턴을 유지한다.
- **좋아요/신고 중복은 조회 검사와 DB 유니크 제약으로 2중 방어한다.** 조회 검사만으로는 동시 요청이
  둘 다 통과하므로, 마지막 방어선은 유니크 제약(`uk_community_post_like_...`,
  `uk_community_comment_like_...`, `uk_community_report_target_kind_target_id_reporter_member_id`)이다.
  제약 위반은 `CommunityExceptionHandler` 가 409 로 변환한다 — 좋아요는 `COMMUNITY_013`,
  신고는 기존 `COMMUNITY_009`. 그 외 제약 위반은 원인을 감추지 않도록 그대로 500 으로 남긴다.
- 정렬 파라미터는 enum 기반 `sortType`, `orderType` 기준을 따른다. `CommunitySortType` 과 `OrderType` 은 모두 `CodeNameDescribable` 을 구현한다 (`displayName` 필드 + metadata 변환).
- 커뮤니티 대상(자치구/행정동/상권) 검증·명칭 조회는 **district-service 실조회(Feign)** 다
  (`CommunityTargetMetaClientAdapter` → `/api/v1/regions/**`). 지역 메타는 직접 DB 로 소유하지 않는다.
  - 이전의 로컬 참조 테이블(`commercial_region_mapping`) 방식은 서비스별 DB 분리 후 복제본을 채우는
    절차가 없어 dev 에서 모든 대상 검증이 `COMMUNITY_004` 로 떨어졌고, 시딩으로 채우면 지역 데이터
    갱신 때마다 원천과 불일치가 생기므로 원천 실조회로 전환했다 (commercial-service 와 동일 원칙).
  - 미존재 코드(district 404)는 `COMMUNITY_004 TARGET_NOT_FOUND`, district-service 통신 불가/서킷
    오픈은 `503 COMMUNITY_014` 로 응답한다. 서킷브레이커 설정은 commercial-service 와 동일하다.
  - Feign 대상 Eureka 등록명은 `feign-client.target-services.district-service:
    ${DISTRICT_SERVICE_APP_NAME}` 이다. **배포 env 와 community compose environment 에
    `DISTRICT_SERVICE_APP_NAME`(dev 는 `district-service-dev`) 가 있어야 한다.** 빠지면
    Feign 기동이 `Service id not legal hostname (${DISTRICT_SERVICE_APP_NAME})` 로 실패한다.
  - 기존 로컬 테이블은 사용하지 않으므로 정리 런북
    `scripts/migration/community-region-reference-drop-runbook.sql` 로 제거한다.

## 작성자 표시 (닉네임/프로필 — auth-service 실조회)

- 게시글 목록/검색/상세/좋아요 목록/댓글 응답에 `writerNickname`·`writerProfileImageUrl` 을 내려준다.
  회원 데이터의 원천인 **auth-service 실조회(Feign)** 다 (`CommunityMemberSummaryClientAdapter` →
  `GET /api/v1/members/summaries?memberIds=...`, 페이지당 작성자 ID 를 distinct 해서 일괄 1회 호출).
  닉네임을 스냅샷으로 소유하지 않는 이유는 지역 메타와 동일하다 — 닉네임 변경/탈퇴 마스킹("탈퇴회원")이
  지연 없이 반영되고, 이중 관리 불일치를 만들지 않는다.
- **강등 정책**: 작성자 표시는 부가 정보다. auth-service 통신 불가(어댑터의 `503 COMMUNITY_016`)는
  `CommunityWriterSummaryProcessor` 가 흡수해 작성자 필드만 null 로 내리고 목록/상세 응답은 성공시킨다
  — 대상 검증(쓰기 경로의 필수 검증, 503 전파)과 다른 정책이다. 미존재 회원도 null.
  FE 는 null 이면 대체 문구(예: "알 수 없음")를 쓴다.
- 서킷브레이커 인스턴스 `auth-service` 추가, dev/prod 는 `feign-client.target-services.auth-service:
  ${AUTH_SERVICE_APP_NAME}` — **배포 env 와 community compose environment 에
  `AUTH_SERVICE_APP_NAME`(auth 의 Eureka 등록명, dev 는 `auth-service-dev`) 가 있어야 한다.**

## 분석 첨부 (비교 초안 → 게시글 배선)

- 상권 비교 초안 응답의 `analysisType`·`analysisRefCode`·`analysisRefName`·`analysisSnapshotKey` 를
  게시글 작성 요청(`POST /community/posts`)이 그대로 되돌려 받아 `community_post` 에 저장하고,
  상세 응답(`GET /posts/{postId}`)이 다시 내려준다 — FE 가 게시글에서 비교 화면 재진입 UI 를 만들 수 있다.
- 4필드는 전부 **선택**이다. 비교 초안에서 넘어온 글에만 값이 있고 일반 글은 null.
  `analysisType` 값이 유효하지 않으면 `400 COMMUNITY_015`, 길이 검증은 `COMMUNITY_120~122`.
- prod DDL: `scripts/migration/community-post-analysis-columns-runbook.sql` 수동 적용 (dev 는 ddl-auto).

## 게시글 조회수 (신규)

- `community_post` 테이블에 `view_count BIGINT DEFAULT 0` 추가
- `GET /api/v1/community/posts/{postId}` 호출 시 `CommunityCommandProcessor.incrementViewCount()` 자동 실행
- `CommunityPostWebFacade.getPost()` — `@Transactional`(기본값, 쓰기 트랜잭션) 적용 (조회수 쓰기 포함)
- 조회수는 `ACTIVE` 조건의 DB 산술 UPDATE로 증가시킨다. 변경 전 엔티티 전체를 다시 저장하지 않아 동시 좋아요·본문 수정·삭제를 덮어쓰지 않는다. 삭제가 먼저 완료되면 기존 `COMMUNITY_005`(404)를 반환한다.

## 목록 응답 viewCount·liked (선택 인증)

- 게시글 목록(`GET /posts`, 대상별 관련 글 포함)·검색(`/posts/search`) 항목 `CommunityPostSummaryItem` 과 좋아요 목록(`/posts/liked`)
  항목 `CommunityLikedPostItem` 에 `viewCount`(long)·`liked`(Boolean) 를, 상세 `CommunityPostDetailResponse` 에 `liked` 를 싣는다 (#471).
  - `viewCount` — 게시글 조회 수. 상세 진입 때마다 +1 되는 값을 목록에서도 그대로 보여 준다.
  - `liked` — 조회자 **본인**의 좋아요 여부. 로그인이면 `true`/`false`, **비로그인이면 `null`**. "안 누름"(false)과 "알 수 없음"(null)을 구분한다.
  - 좋아요 목록의 `liked` 는 본인이 좋아요한 글만 모은 목록이라 추가 조회 없이 항상 `true` 다. FE 타입(`CommunityLikedPost = CommunityPostSummary & { likedAt }`)과 모양을 맞추기 위한 필드다.
  - 작성·수정 응답(같은 상세 DTO)도 인증 요청이라 `true`/`false` 로 채운다.
- 선택 인증: 목록·검색·상세 컨트롤러는 `@PreAuthorize` 없이 `@AuthenticationPrincipal MemberLoginActive` 를 null 허용으로 받아
  `Long viewerMemberId` 로 바꿔 유스케이스에 넘긴다 (선례: commercial-service `POST /api/v1/share-links`). 조회자는 JWT claim 으로만 정한다.
- 일괄 조회: `CommunityViewerLikeProcessor` 가 쪽의 postId 를 모아 `CommunityPostLikeRepositoryPort.findLikedPostIds(memberId, postIds)` 를
  **1회** 부른다 — `memberId = ? and postId in (...)` 로 postId 만 프로젝션하는 정적 JPQL(`CommunityPostLikeRepository.findLikedPostIds`)이다.
  게시글마다 존재 확인을 부르면 쪽 크기만큼 왕복이 생긴다(coding-conventions §9-7). 비로그인이거나 빈 쪽이면 조회하지 않는다.
  상세는 좋아요 토글이 쓰는 단건 존재 확인(`exists`)을 재사용한다. 두 쿼리 모두 `uk_community_post_like_post_id_member_id`·
  `idx_community_post_like_member_id` 가 받친다.
  - 테스트: 이 JPQL 은 H2 슬라이스 `CommunityPostLikeRepositoryTest` 가 실제 스키마로 검증한다 — 다른 회원의 좋아요·범위 밖 postId 는 빠지고,
    같은 글을 여러 회원이 좋아요해도 조회자 몫 한 건만 나온다 (아래 「JPA 슬라이스 테스트」). 일괄 1회 호출·비로그인 생략은 `CommunityViewerLikeProcessorTest`.
- 비로그인/안 누름 구분은 `application/model/CommunityViewerLikes` 값 객체(`anonymous()`, `of(Set)`, `likedOf(postId)`)가 맡는다.
  Presenter 는 `likedOf` 결과를 옮기기만 한다.
- **주의: 공개 경로라도 만료·위조·폐기된 토큰을 보내면 401 이다.** 게이트웨이 `JwtAuthApiGatewayFilter`(블랙리스트·회원 revocation 포함)와
  서비스 resource server(`BearerTokenAuthenticationFilter`)가 `Authorization: Bearer` 가 있으면 경로와 무관하게 검증하기 때문이다.
  FE 는 비로그인 상태(재발급 실패 포함)에서 토큰을 보내지 않아야 한다 — 남은 만료 토큰 때문에 공개 목록까지 401 로 깨진다.

## 인기 글 기간 필터

- 목록(`GET /posts`)·검색(`/posts/search`)·좋아요 목록(`/posts/liked`)에 `period` 파라미터를 둔다 (#472).
  값은 `domain/enums/CommunityPopularPeriod`(`CodeNameDescribable`) — `WEEK`(최근 7일), `MONTH`(최근 30일), `ALL`(전체 기간).
  - **`sortType=POPULAR` 일 때만 적용한다.** `LATEST` 에서는 받아도 무시한다(Swagger 설명에 명시).
  - **기본값은 `WEEK`** 다. 이전에는 `CommunityQueryProcessor.POPULAR_LOOKBACK_DAYS = 7` 하드코딩으로 인기순에 최근 7일 작성 글만 나왔다.
    파라미터를 생략한 기존 호출(FE 인기 탭·우 레일)이 그대로 동작하도록 이 값을 기본으로 남겼다. 전체 기간은 `period=ALL` 로 요청한다.
  - 잘못된 값(`period=YEAR` 등)은 `sortType` 과 같은 enum 바인딩 실패 경로라 `400 COMMUNITY_117`(PARAMETER_TYPE_INVALID)이다.
    바인딩은 Spring enum 변환(대소문자 구분)이라 `sortType` 처럼 대문자 상수명을 보낸다.
- **롤링 기간이다.** 달력 주·월이 아니라 요청 시각에서 기간을 뺀다(`CommunityPopularPeriod.since(now)`, `ALL` 은 null). 기간 길이는 enum 이 가진다.
- **기준은 작성 시각(`createdAt`)이다.** "기간 안에 받은 좋아요 수"로 정렬하려면 `community_post_like` 를 기간으로 집계해야 한다. 그 집계값은
  저장된 `likeCount` 가 아니어서 `(likeCount, id)` 커서와 인덱스(`idx_community_post_status_like_count_id`)를 쓸 수 없으므로 채택하지 않았다.
- 흐름: Controller(`@RequestParam(defaultValue = "WEEK")`) → Facade → `CommunityQueryProcessor` 가 `period.since(now)` 로 Criteria 의
  `popularSince` 를 만든다(Feed·Search·Liked 3종, `ALL` 이면 null). `CommunityPostCustomRepositoryImpl.applyCursorCondition` 은 POPULAR 이고
  `popularSince != null` 일 때만 `createdAt >= popularSince` 를 붙인다. 호출처가 없는 `getBoardPosts` 경로는 시그니처를 유지한 채 `WEEK` 를 쓴다.
- 인덱스 (새 인덱스 없음):
  - 전체 피드·검색 + POPULAR: `idx_community_post_status_like_count_id (status, likeCount, id)` 역순으로 정렬을 인덱스가 처리한다.
    `ALL` 은 잔여 조건이 없어 `size + 1` 건을 읽으면 끝난다. `WEEK`/`MONTH` 는 `createdAt` 을 잔여 조건으로 거른다 — 인덱스에 없는 컬럼이라
    행마다 PK 조회가 붙고, 기간 밖 고(高)좋아요 글이 많을수록 기간 안 글을 채울 때까지 스캔이 길어진다. 현재 규모에서는 문제 되지 않으며,
    커지면 `(status, createdAt)` 계열 인덱스 + 정렬 분리를 검토한다.
  - 대상 필터(`targetType`·`targetCode`) + POPULAR: `idx_community_post_target_status_id (targetType, targetCode, status, id)` 로 게시판을
    거른 뒤 likeCount 정렬은 filesort 다. 게시판 단위라 행 수가 작아 받아들인다.
- 커서 연속성: 하한은 요청마다 현재 시각으로 다시 계산한다. 쪽을 넘기는 사이 경계를 넘어 기간 밖으로 나간 글은 다음 쪽에서 빠질 수 있지만,
  `(likeCount, id)` 커서가 엄격 감소라 **같은 글이 두 번 나오지는 않는다**. 쪽 사이 좋아요 수 변동으로 생기는 누락·순서 흔들림은 기존 커서의 한계 그대로다.
- 테스트: `CommunityPopularPeriodTest`(하한 계산), `CommunityQueryProcessorPopularPeriodTest`(Criteria 전달),
  `CommunityPostWebControllerPopularPeriodTest`(기본값·바인딩·`COMMUNITY_117`). QueryDSL 조건은 H2 슬라이스
  `CommunityPostCustomRepositoryImplTest`(`popularSinceExcludesOlderPostsOnlyWhenPresent` — 하한 경계 포함, null 이면 전체, 하한을 건 채 커서로 이어 읽어도
  중복·누락 없음, LATEST 는 하한 무시)가 매 빌드 검증한다. 검색·좋아요 목록의 하한도 같은 클래스가 본다. 같은 내용의 MySQL 판
  `CommunityRepositoryMySqlConcurrencyTest.popularFeedAppliesPeriodLowerBoundOnlyWhenPresentAndKeepsCursorOrder` 는 `COMMUNITY_TEST_DB_URL` 이 있을 때만 돈다.

## 게시글 말머리

- 게시글에 말머리(주제 분류)를 붙인다 (#470). 값은 `domain/enums/CommunityPostCategory`(`CodeNameDescribable`).

  | code | 표시명(`name`) | FE 작성 도움 칩 |
  |------|---------------|----------------|
  | `QUESTION` | 질문 | 질문해요 |
  | `EXPERIENCE` | 경험 공유 | 경험 나눠요 |
  | `TOGETHER` | 같이 해요 | 같이 해요 |
  | `NEWS` | 동네 소식 | (칩 없음) |

- **「말머리 없음」을 허용한다.** 컬럼(`community_post.category VARCHAR(20)`)은 nullable 이고 기존 글은 null 이다.
  어느 값으로 채워도 사실이 아니므로 마이그레이션 기본값도, 기존 행 갱신도 없다.
- 요청 문자열은 `CommunityPostCategory.from` 으로 파싱한다 — 대소문자 무시(`toUpperCase(Locale.ROOT)`), 잘못된 값은
  `400 COMMUNITY_017 INVALID_POST_CATEGORY`. 작성·수정 본문과 목록 필터가 같은 코드를 쓴다. null/blank 는 「말머리 없음」(필터면 「전체」)이다.
  `sortType`·`period` 처럼 Spring enum 바인딩(`COMMUNITY_117`)이 아니라 `targetType` 과 같은 String + Processor 파싱이다 — 말머리 오류를
  자기 코드로 구분한다. 작성(`createPost`)과 `getFeed` 는 대상 실조회(district-service 원격 호출) 전에 파싱한다. 다만 목록에 대상 필터가 함께
  오면 Facade 의 게시판 메타 조회(`getTargetMeta`)가 `getFeed` 보다 먼저라 원격 호출 1회 뒤에 400 이 난다(기존 순서 유지).
- **작성** `POST /posts` — 선택 필드 `category`. `CreatePostCommand` → `CommunityCommandProcessor.createPost` 가 파싱해 저장한다.
- **수정** `PATCH /posts/{postId}` — 선택 필드 `category` 는 **「수정 후 값」**이다. 이 API 는 title/content 필수에 `imageKeys` 가
  「수정 후 남길 목록」인 전체 교체 방식이라, **`category` 를 생략하거나 null 로 보내면 말머리를 지운다.**
  **수정 화면은 현재 말머리(상세 응답 `category.code`)를 항상 다시 보내야 한다** (Swagger 설명에 명시).
  - 저장은 기존 본문 수정 조건부 UPDATE(`CommunityPostRepository.updateContentIfActive` — `ACTIVE`·작성자 조건, 제목·본문·말머리·수정 시각만 SET)에
    함께 넣었다. 엔티티 전체 save 로 바꾸지 않아 동시 좋아요·조회수·댓글 수를 덮지 않는다 (아래 「상태 변경 동시성」).
  - 말머리 파싱은 소유자 검증 뒤다 — 남의 글에는 값 오류보다 `COMMUNITY_007`(403)이 먼저 나간다.
- **응답** — 목록·검색 항목 `CommunityPostSummaryItem`, 상세 `CommunityPostDetailResponse`(작성·수정 응답 포함), 좋아요 목록 항목
  `CommunityLikedPostItem` 에 `category: {code, name, description}`(말머리 없으면 null). `analysisType` 과 같은 결이다.
- **목록 필터** — `GET /posts` 에만 `category` 쿼리를 둔다. 비어 있으면 필터 없음(말머리 없는 글 포함 전체).
  대상 필터(`targetType`·`targetCode`)·`sortType`·`period`·커서(`lastPostId`·`lastLikeCount`)와 함께 동작한다.
  흐름: Controller(`@RequestParam(required = false) String category`) → Facade → `CommunityQueryProcessor.getFeed` 가 파싱해
  `CommunityFeedCriteria.category` 로 넘기고 → `CommunityPostCustomRepositoryImpl.findFeedPostsNoOffset` 이 null 이 아닐 때만 `category.eq` 를 붙인다.
  - **검색(`/posts/search`)·좋아요 목록(`/posts/liked`)에는 필터를 넣지 않았다** (이슈 범위 밖). 응답 항목에는 `category` 가 실린다.
  - 호출처 없는 `getBoardPosts`/`findBoardPostsNoOffset` 경로는 시그니처를 바꾸지 않았다.
- 인덱스: `idx_community_post_status_category_id (status, category, id)` 1개만 추가했다.
  - 전체 피드 + 말머리 + 최신순(`where status, category order by id`) — 이 인덱스가 거르기와 정렬을 모두 처리한다(filesort 없음).
  - 대상 필터 + 말머리 — 기존 `idx_community_post_target_status_id (targetType, targetCode, status, id)` 로 게시판을 거르고 category 는 잔여 조건이다.
    게시판 단위라 행이 적어 받아들인다.
  - 인기순 + 말머리 — 기존 `idx_community_post_status_like_count_id (status, likeCount, id)` 로 정렬하고 category 는 잔여 조건이다.
    말머리 비중이 작으면 채울 때까지 스캔이 길어질 수 있다. `period` 의 createdAt 잔여 조건과 같은 판단(정렬을 인덱스로 처리하는 편)이며,
    커지면 `(status, category, likeCount, id)` 를 검토한다.
- prod DDL: `scripts/migration/community-post-category-runbook.sql` 을 **애플리케이션 배포 전에** 수동 적용한다 (dev/local 은 ddl-auto).
  새 버전은 모든 조회에서 category 컬럼을 읽으므로 컬럼이 먼저 있어야 한다. 기존 행 갱신은 없다.
  런북은 알고리즘을 명시하고(INSTANT / INPLACE, LOCK=NONE) information_schema 로 확인한 뒤 실행해 여러 번 돌려도 안전하다. 롤백 순서도 런북에 있다.
- dev/local 의 ddl-auto 는 `@Enumerated(STRING)` 컬럼에 값 목록 CHECK 를 붙일 수 있다(Hibernate 6 + MySQL 8.0.16+). 런북으로 만든 prod 에는 없다.
  **말머리 값을 추가할 때는 dev 의 `SHOW CREATE TABLE community_post` 를 먼저 확인한다** — CHECK 가 있으면 새 값 INSERT 가 dev 에서만 실패한다.
- 테스트: `CommunityPostCategoryTest`(파싱·표시명), `CommunityEnumLocaleTest`(터키어 로케일 — QUESTION·EXPERIENCE 에 'i' 가 있다),
  `CommunityCommandProcessorPostCategoryTest`(작성 파싱, 수정 조건부 UPDATE 전달·null 로 지움, 403 우선),
  `CommunityQueryProcessorPostCategoryTest`(Criteria 전달, 잘못된 값은 원격 호출 전 거절), `CommunityPostWebControllerPostCategoryTest`
  (바인딩, 실제 체인 `COMMUNITY_017`), `CommunityPostPresenterCategoryTest`(null ↔ metadata). QueryDSL 필터·커서는 H2 슬라이스
  `CommunityPostCustomRepositoryImplTest.feedFiltersByCategoryTogetherWithTargetFilterAndCursors`(대상 필터·최신/인기 커서·기간 하한 조합),
  JPQL 수정은 `CommunityPostRepositoryTest`(말머리 교체·null 로 지움·카운터 보존·DELETED/남의 글 0건)가 매 빌드 검증한다.
  MySQL 판(`CommunityRepositoryMySqlConcurrencyTest` 의 `feedFiltersByCategoryTogetherWithTargetFilterAndCursors`·`contentEditReplacesCategoryAndNullClearsIt`)은
  `COMMUNITY_TEST_DB_URL` 이 있을 때만 돈다.

## 게시글 검색 (신규)

- `GET /api/v1/community/posts/search`
- 파라미터: `keyword`, `sortType`, `orderType`, `period`(인기순 기간, 기본 `WEEK`), `lastPostId`, `lastLikeCount`, `size` (기본 10)
- `CommunityPostCustomRepositoryImpl` — `title.containsIgnoreCase(keyword).or(content.containsIgnoreCase(keyword))`
- 기존 `executeSliceQuery`, `applyCursorCondition` 패턴 재사용

## 상권 비교 draft (신규)

- `POST /api/v1/community/posts/drafts/commercial-comparisons` — 상권 비교 결과를 바탕으로 게시글 초안(제목/본문)을 생성한다.
- 요청: `CommunityCommercialComparisonDraftRequest` — `targetType` / `targetCode` / `leftCommercialCode` / `rightCommercialCode` / `serviceCode` / `periodCode` (전 필드 필수, `COMMUNITY_113`~`COMMUNITY_116` 검증)
- **`@PreAuthorize` 없음 = 비인증 호출 가능.** "작성/수정/삭제/좋아요/신고는 인증 사용자 기준" 원칙의 예외다.
  draft 생성은 게시글을 저장하지 않고 초안 텍스트만 반환하며, 실제 게시글 작성(`POST /posts`)은 여전히 인증 필수다.

## 좋아요 (신규)

- `POST /api/v1/community/posts/{postId}/likes` — 게시글 좋아요 토글 (등록/취소, 인증 필수)
- `POST /api/v1/community/posts/{postId}/comments/{commentId}/likes` — 댓글 좋아요 토글 (인증 필수)
- `GET /api/v1/community/posts/liked` — 현재 사용자가 좋아요한 게시글 목록 (인증 필수, 커서 페이지네이션)

## 대댓글 (신규, depth 1 고정)

- `community_comment` 테이블에 `parent_comment_id BIGINT NULL` + `idx_community_comment_parent_comment_id` 추가
- `POST /api/v1/community/posts/{postId}/comments` — `parentCommentId` 옵션 필드 추가
- depth 1 고정: `CommunityCommandProcessor.validateParentComment()` 에서 3중 검증 (게시글 소속 / 최상위 여부 / ACTIVE 상태)
- 계층 조립: DB flat list → `CommunityCommentPresenter`에서 in-memory groupBy
- 응답: `CommunityCommentItem.replies[]` 에 `CommunityReplyItem` 목록 포함

## 신고 사유 코드

- 신고에 사유 코드를 둔다 (#473). 값은 `domain/enums/CommunityReportReasonCode`(`CodeNameDescribable`).
  `SPAM`(스팸·홍보) · `ABUSE`(욕설·비방) · `PRIVACY`(개인정보 노출) · `FALSE_INFO`(거짓 정보) · `ETC`(기타).
  표시명은 FE `frontend/src/lib/community/report-reason.ts` 의 `COMMUNITY_REPORT_REASONS` 와 글자까지 같다(가운뎃점 U+00B7).
- **요청** `POST /api/v1/community/reports`
  - `reasonCode`(문자열, 대소문자 무시). 신규 클라이언트는 필수로 보낸다. 호환 기간 동안만 선택이다.
  - `detail`(선택, 500자 이하 — `COMMUNITY_124`). `reasonCode` 가 `ETC` 면 필수(`COMMUNITY_123`).
  - `reason`(deprecated). `reasonCode` 가 없을 때만 읽는 호환 필드. 500자(`COMMUNITY_111`)는 유지하고 필수(`COMMUNITY_110`)는 「둘 중 하나」로 바뀌었다.
  - `reasonCode`·`reason` 이 둘 다 비면 기존 `COMMUNITY_110`.
  - 잘못된 `reasonCode` 는 `400 COMMUNITY_018`. `sortType` 같은 Spring enum 바인딩(`COMMUNITY_117`)이 아니라 String + `from` 이다.
    요청 본문 enum(`targetKind`)은 잘못된 값이 JSON 파싱 단계에서 실패해 이 코드 체계로 나가지 않기 때문이다(`category`·`analysisType` 과 같은 선택).
  - 요청 모양 규칙(110·123)은 필드 하나로 정할 수 없어 레코드의 `@AssertTrue` 메서드(`isReasonPresent`·`isEtcDetailPresent`, `@JsonIgnore`·`@Schema(hidden = true)`)
    로 둔다 — 필드별 코드 대역(1xx)에 두려고 Processor 예외 대신 Bean Validation 을 썼다. 저장소에 선례가 없던 방식이라 MockMvc 테스트로 동작을 확인했다.
    오류 항목의 `field` 는 메서드 이름에서 나온 `reasonPresent`·`etcDetailPresent` 다(선언 필드 뒤에 정렬된다). 클라이언트는 `code` 로 분기한다.
  - 잘못된 사유 코드는 입력 값 오류라 대상 조회(게시글·댓글) 전에 거른다.
- **해석**은 `domain/model/CommunityReportReason.resolve` 가 한다.
  - `reasonCode` 가 있으면 그 코드이고 `detail` 은 trim, 비면 null. `reason` 은 무시한다.
  - 없으면 레거시. trim 한 `reason` 이 `[라벨] 상세` 이고 라벨이 표시명이면 그 코드, 나머지를 trim 해 detail(비면 null).
    접두가 없거나 모르는 라벨이면 `ETC` 이고 detail 은 reason 전체. 레거시 경로에는 「ETC 는 상세 필수」를 강제하지 않는다.
- **저장** — `community_report.reason_code VARCHAR(20) NOT NULL DEFAULT 'ETC'`, `detail VARCHAR(500) NULL`.
  기존 `reason`(NOT NULL 500)은 남긴다. 의미는 「레거시 사유 원문」(deprecated, 후속 정리 대상)이다.
  레거시 요청은 받은 reason(trim), 신규 요청은 detail 이 있으면 detail, 없으면 코드 표시명을 넣는다. 읽기는 `reasonCode`·`detail` 로 한다.
  - 엔티티 `reasonCode` 는 `status` 와 같은 관례(`@Enumerated(STRING)` + `columnDefinition = "varchar(20) default 'ETC'"`)다. 이전 버전 INSERT 와 컬럼 추가 전 행을
    DB 기본값이 살린다(H2 슬라이스 `legacyRowGetsColumnDefaults`). `columnDefinition` 이 타입을 대신해 H2 DDL 에는 값 목록 enum 타입·CHECK 가 없다 —
    MySQL dev 도 같을 것으로 보지만 확인하지 않았다. 사유 코드를 추가할 때는 말머리와 같이 dev 의 `SHOW CREATE TABLE community_report` 를 먼저 본다.
  - 롤백 주의: 신규 요청 중 상세가 있던 행은 `reason` 에 상세만 있다. 새 컬럼을 지우면 그 행의 사유 코드는 되살릴 수 없다(런북 롤백 절).
- **모더레이션** — 목록 항목에 `reasonCode` metadata 와 `detail`(nullable). `reason` 은 deprecated 로 유지한다.
  `GET /api/v1/moderation/reports` 의 선택 쿼리 `reasonCode`. 비면 전체 PENDING, 잘못된 값은 `COMMUNITY_018`.
  파생 쿼리 `findByStatusAndReasonCodeOrderByCreatedAtAsc`. PENDING 은 처리되면 빠지는 작은 집합이라 새 인덱스는 두지 않고
  기존 `idx_community_report_status` 로 거른 뒤 `reasonCode` 는 잔여 조건이다.
  사유별 집계 API 는 이번에 만들지 않는다. F2 운영 화면 착수 때 GROUP BY 엔드포인트를 검토한다.
  - 선택 필터를 QueryDSL 이 아니라 **파생 쿼리 두 개 중 고르는 방식**(필터 없음 `findPendingReports` / 있음 `findPendingReportsByReasonCode`)으로
    둔 것은 coding-conventions §9-6 「동적 조건 → QueryDSL」의 예외다. 조건이 하나라 두 SQL 이 모두 고정이고 `(:p IS NULL OR …)` 안티패턴도 아니다.
    필터가 하나 더 붙으면(F2: 대상 종류·기간 등) 분기가 2^n 으로 늘어나므로 `CommunityReportCustomRepository`(QueryDSL) + 슬라이스 테스트로 옮긴다.
- **prod** 는 `scripts/migration/community-report-reason-code-runbook.sql`. 2절(컬럼 추가, `ALGORITHM=INSTANT`)은 **애플리케이션 배포 전**,
  3절(접두 문자열 백필)은 **배포 후**에 실행한다(배포 전에 돌려도 되지만 그 사이 이전 버전이 넣은 행이 ETC 로 남는다 — 재실행 안전).
  **dev 에도 3절을 실행한다.** ddl-auto 는 컬럼만 만들고 기존 행을 `ETC`·detail NULL 로 둔다.
  백필은 라벨마다 `reason LIKE '[라벨]%'` 행의 접두를 `CHAR_LENGTH` 만큼 떼어 옮기고, 접두가 없거나 모르는 라벨은 detail = reason 이다.
  MySQL `LIKE` 의 특수문자는 `%`·`_` 뿐이라 `[` `]` 는 글자 그대로 비교되고, `CHAR_LENGTH`·`SUBSTRING` 은 utf8mb4 글자 단위다(런북 주석).
- 테스트: `CommunityReportReasonCodeTest`(파싱·018·표시명이 FE 라벨 5개와 같음)·`CommunityReportReasonTest`(신규·레거시 해석)·`CommunityEnumLocaleTest`(PRIVACY·FALSE_INFO),
  `CommunityCommandProcessorReportReasonTest`(저장 값·018 이 대상 조회 전·중복·404 유지), `CommunityReportWebControllerReasonCodeTest`(110·123·124·111·018 봉투, 레거시 성공),
  `ModerationWebControllerReasonCodeTest`(필터 바인딩·실제 체인·018), `ModerationPresenterReasonCodeTest`. 파생 쿼리와 컬럼 기본값·nullable detail 은 H2 슬라이스
  `CommunityReportRepositoryTest`. 백필 SQL 은 MySQL 문법·콜레이션에 기대므로 슬라이스로 검증하지 않고 런북 4절 확인 쿼리로 본다.

## 신고 모더레이션 워크플로우 (신규)

- `GET /api/v1/moderation/reports` — PENDING 신고 목록 (MANAGER only, 선택 `reasonCode` 필터 — 위 「신고 사유 코드」)
  - 응답에 `targetTitle`, `targetPreview` (최대 100자), `targetAuthorId` 포함 — 매니저가 DB 직접 조회 없이 트리아지 가능
  - 대상 컨텐츠는 **종류별 `in` 절 2번**으로 모아 온다 (`ModerationQueryProcessor.findReportTargets`).
    신고를 순회하며 건당 조회하면 신고 수만큼 왕복이 생긴다 (coding-conventions §9-7).
  - 이미 삭제된 대상은 `targetTitle`·`targetPreview`·`targetAuthorId` 가 `null` 이다. 신고는 남고 대상만
    사라지는 경우가 있어 없는 것을 오류로 다루지 않는다.
- `PATCH /api/v1/moderation/reports/{reportId}` — `{ "decision": "APPROVE_AND_HIDE" | "DISMISS" }` (MANAGER only)
- `community_report` 테이블에 `status`, `resolved_at`, `resolved_by_member_id` 컬럼 + `idx_community_report_status` 추가
- `APPROVE_AND_HIDE` 시 대상 post/comment 상태를 `DELETED`로 변경
  - COMMENT 숨김은 `ACTIVE -> DELETED` 조건부 UPDATE가 성공한 요청만 부모 게시글의 `comment_count`를 DB에서 0 이하로 내려가지 않게 감소시킨다. 중복 숨김/삭제로 이중 감소하지 않는다.
- 신규 컨트롤러: `ModerationWebController` — `@PreAuthorize("hasAuthority('MANAGER')")`
- 신규 enum: `ReportStatus` (PENDING/APPROVED/DISMISSED), `ModerationDecision` (APPROVE_AND_HIDE/DISMISS)
- 아키텍처: `ModerationWebFacade`는 `CommunityReportPort`를 직접 주입하지 않고 `ModerationQueryProcessor`를 통해 접근
- 게이트웨이 라우트: `/api/v1/moderation/**` 는 `community-service-moderation` 라우트로 community-service 에 간다
  (`cloud/api-gateway` 의 `application-local.yml`·`application-dev.yml`·`application-prod.yml`). 권한은 `@PreAuthorize("hasAuthority('MANAGER')")` 가 막는다.

## 피드 필터 일관성 (버그 수정)

- `CommunityQueryProcessor.getFeed()` — `targetType`이 null일 때 `targetCode`도 null로 정규화해 DB 쿼리에 고아 필터가 전달되지 않도록 수정

## 에러코드

| 대역 | 코드 | 설명 |
|------|------|------|
| 도메인 | `COMMUNITY_001`~`COMMUNITY_018` | 대상/정렬 타입 400, 게시글·댓글·신고 미존재 404, 권한 403, 중복 신고·기처리 신고 409, `013` 동시 반응 409, `014` 지역 서비스 통신 불가 503, `015` 분석 첨부 타입 400, `016` 회원 서비스 통신 불가 503(조회 경로는 강등), `017` 말머리 400, `018` 신고 사유 코드 400(신고 본문·모더레이션 필터) |
| 검증 폴백 | `COMMUNITY_100` | 요청 값 검증 실패 폴백 (INVALID_REQUEST) |
| 검증 필드별 | `COMMUNITY_101`~`COMMUNITY_116`, `COMMUNITY_118`~`COMMUNITY_124` | `CommunityValidationMessage` 가 단일 기준점. `COMMUNITY_113`~`COMMUNITY_116` 은 상권 비교 draft 전용 (좌/우 상권 코드, 서비스 코드, 분기 코드), `118` 이미지 장수, `119` 조회 개수, `120`~`122` 분석 첨부 길이, `123` 기타 사유 상세 필수, `124` 신고 상세 500자. `110` 은 #473 부터 「reasonCode·reason 중 하나 필수」 |
| 타입 오류 | `COMMUNITY_117` | 요청 파라미터 형식 오류 (PARAMETER_TYPE_INVALID) |

## 게시글 이미지 (MinIO)

- `POST /api/v1/community/posts/images` (multipart `imageFiles`, 인증 필수, 최대 5장) — 업로드 후
  **키만 발급**한다. 게시글 연결은 작성/수정 요청의 `imageKeys` 로 이뤄진다.
- 저장 구조: `community_post_image` 테이블(1:N, `postId`/`imageKey`/`sortOrder`)로 분리했다.
  `CommunityPost` record 에 필드를 넣으면 위치 인자로 재생성하는 7곳이 모두 바뀌기 때문이다.
- 수정 시 `imageKeys` 는 **수정 후 남길 목록**이다. 빠진 기존 이미지는 연결 해제 후 커밋 이후 삭제된다.
- 소유권 검증: 키에 `memberId` 가 포함되어 있어 `ObjectKeyFactory.validateOwnership` 이
  남이 올린 파일을 자기 게시글에 붙이는 것을 차단한다 (`STORAGE_006`).
- 목록 응답에는 첫 장을 `thumbnailUrl` 로 내려준다. 게시글별 개별 조회 대신 `IN` 조회로 N+1 을 피한다.
- 게시글 소프트 삭제 시 이미지 객체는 유지된다(복구 가능성). 미참조 객체 회수는 후속 배치 과제다.
- 상세 계약은 `docs/file-upload-guide.md` 참고.

## 상태 변경 동시성

- 게시글 본문 수정(제목·본문·말머리), 조회수·좋아요·댓글 수 변경, 소프트 삭제는 각 필드만 조건부 UPDATE한다. JPA bulk UPDATE 전 flush, 이후 영속성 컨텍스트 clear로 대기 중인 쓰기를 보존하고 갱신 값을 다시 읽는다.
- 좋아요 등록/취소와 카운터 변경은 같은 쓰기 트랜잭션에서 수행한다. 동시 등록은 기존 DB 유니크 제약으로 방어한다. 취소는 bulk DELETE의 실제 삭제 건수가 1일 때만 감소하며, 다른 요청이 먼저 취소했다면 `COMMUNITY_013`(409)을 반환한다.
- 본문 수정·좋아요·댓글 작성 중 대상이 먼저 삭제되면 기존 404 오류로 전체 트랜잭션을 롤백한다. 조회 이후 삭제 경합에서 진 요청은 추가 상태 변경 없이 끝난다(처음 조회할 때부터 삭제 상태라면 기존 404 유지).
- 신고 결정은 `PENDING` 조건부 UPDATE를 선점한 요청만 대상을 숨긴다. 경쟁에서 진 요청은 `COMMUNITY_012`(409)를 반환하며, 신고 결정과 대상 숨김은 같은 트랜잭션으로 커밋/롤백한다.
- 좋아요 응답의 `liked`는 전후 전체 카운트 비교가 아니라 해당 요청의 등록/취소 결과에서 결정한다. 다른 사용자의 동시 반응으로 전체 카운트가 바뀌어도 사용자 상태를 잘못 표시하지 않는다.
- Processor 회귀 테스트는 오래된 조회 값 대신 DB 갱신 결과 반환, 동시 취소의 카운터 보호, 중복 댓글 삭제/신고 처리, 삭제와 경합 시 오류를 검증한다. `CommunityRepositoryMySqlConcurrencyTest`는 실제 MySQL의 REPEATABLE READ 트랜잭션으로 병렬 카운터 증가, 오래된 조회 이후 본문 수정, 삭제 후 복구 방지, 동시 좋아요 취소 단일 승자, 실패한 카운터 전이의 롤백을 검증한다.
### MySQL 동시성 통합 테스트 실행

- 기존 MySQL JDBC 의존성만 사용한다. `COMMUNITY_TEST_DB_URL`이 없으면 통합 테스트는 건너뛴다.
- 반드시 폐기 가능한 `p0_test` 스키마를 사용한다. 테스트는 `create-drop`으로 테이블을 생성/삭제하며 다른 DB 이름은 거부한다.
- 환경 변수: `COMMUNITY_TEST_DB_URL=jdbc:mysql://127.0.0.1:13306/p0_test?allowPublicKeyRetrieval=true&useSSL=false`, `COMMUNITY_TEST_DB_USERNAME=root`, `COMMUNITY_TEST_DB_PASSWORD`는 테스트 DB 비밀번호.
- 실행: `./gradlew :service:community-service:test --tests '*CommunityRepositoryMySqlConcurrencyTest' --rerun-tasks` (backend 디렉터리).

## JPA 슬라이스 테스트

QueryDSL 커스텀 조건·커서와 JPQL 은 컴파일로 검증되지 않는다(coding-conventions §9-6). MySQL 판은 env 가 있을 때만 돌아 로컬·CI 에서
한 번도 실행되지 않았으므로, 매 빌드 도는 H2 슬라이스를 둔다. 구조는 commercial-service 와 같다.

- **애노테이션**: 테스트에는 `@DataJpaTest` 대신 `@CommunityDataJpaTest`(`src/test/.../global/config`) 하나만 붙인다.
  `@DataJpaTest` + `@ActiveProfiles(DataJpaSliceTestConfig.PROFILE)`(`slice-test`) 메타 애노테이션이다. DB 는 임베디드 H2 로 바뀌고 스키마는 엔티티로 매번 새로 만든다.
- **슬라이스 빈**: `global/config/DataJpaSliceTestConfig`(`@TestConfiguration`, `@Import(QuerydslConfigurer)`)를
  `src/test/resources/META-INF/spring/org.springframework.boot.test.autoconfigure.orm.jpa.AutoConfigureDataJpa.imports` 에 등록해 모든 JPA 슬라이스에 붙인다.
  `CommunityPostCustomRepositoryImpl` 이 `JPAQueryFactory` 를 생성자로 받는 리포지터리 프래그먼트라, 이 빈이 없으면 게시글과 무관한 리포지터리 테스트까지
  컨텍스트 로딩에서 죽는다. 커스텀 구현이 새 빈을 생성자로 받게 되면 여기에 추가한다. 자체 설정으로 뜨는 `CommunityRepositoryMySqlConcurrencyTest` 에도
  붙지만 그쪽도 `QuerydslConfigurer` 를 import 해 같은 설정 클래스로 합쳐진다.
- **프로필 격리**: 슬라이스는 앱 클래스의 `@EnableFeignClients` 까지 올린다. `SPRING_PROFILES_ACTIVE=dev` 만 있고 `DISTRICT_SERVICE_APP_NAME`·
  `AUTH_SERVICE_APP_NAME` 이 없으면 `application-dev.yml` 플레이스홀더가 풀리지 않아 `Service id not legal hostname (${AUTH_SERVICE_APP_NAME})` 로
  컨텍스트가 죽는다(격리를 빼면 이 오류로 재현된다). `slice-test` 가 env 프로필과 기본 `local` 프로필을 가리고, 이 이름의 `application-*.yml` 은 두지 않는다.
  GitHub Actions(env 없음)·Jenkins(Vault env 전체) 양쪽에서 같은 설정으로 뜬다.
- **테스트** (`adapter/out/persistence/repository`):
  - `custom/CommunityPostCustomRepositoryImplTest` — 최신순 DESC/ASC id 커서, `lastPostId=0` 첫 쪽, `size + 1` hasNext 판정, 인기순 likeCount 동률
    `(likeCount, id)` 커서(#471 커서 불변), `popularSince` 하한 경계·null 이면 전체(#472), 말머리 + 대상 필터 + 커서(#470), DELETED 제외(피드·검색·좋아요 목록),
    검색 keyword(제목·본문, 대소문자 무시, `%`·`_` 글자 그대로), 좋아요 목록 회원 서브쿼리. 쪽 크기를 바꿔 가며 끝까지 이어 읽어 중복·누락이 없는지 본다.
  - `CommunityPostLikeRepositoryTest` — `findLikedPostIds`.
  - `CommunityPostRepositoryTest` — `updateContentIfActive`(제목·본문·말머리 교체, null 로 지움, 카운터·작성 시각 보존, DELETED·남의 글 0건,
    flush 전 저장분 반영과 `clearAutomatically` 뒤 재조회).
  - `CommunityReportRepositoryTest` — 모더레이션 파생 쿼리 `findByStatusAndReasonCodeOrderByCreatedAtAsc`(PENDING + 사유 코드, 처리된 신고·다른 사유 제외,
    `createdAt` 오름차순)와 기존 `findByStatusOrderByCreatedAtAsc`, nullable·500자 detail, 사유 코드 없이 들어간 행(JDBC INSERT)이 DB 기본값 `ETC` 로 읽히는지(#473).
  - 데이터는 엔티티 빌더로 고정 id·고정 시각을 넣는다(Snowflake·현재 시각 의존 없음). 각 테스트는 슬라이스 트랜잭션으로 롤백된다.
- **H2 한계**: MySQL 에서만 확인되는 동작은 여전히 `CommunityRepositoryMySqlConcurrencyTest` 몫이다 — 동시 카운터 갱신·REPEATABLE READ 격리·동시 좋아요
  취소 단일 승자, MySQL 콜레이션에 따른 대소문자·문자 비교, 실행계획(인덱스 사용 여부). 컬럼 정의도 다르다 — H2 에서는 Hibernate 가 `@Enumerated(STRING)`
  컬럼을 H2 네이티브 `enum(...)` 타입으로 만들어 MySQL 의 `varchar(20)` + 값 목록 CHECK 와 같지 않다. 말머리 값 추가 때의 CHECK 확인은 슬라이스로 대신할 수 없고
  위 「게시글 말머리」대로 dev 의 `SHOW CREATE TABLE` 을 본다. 슬라이스는 쿼리의 조건·정렬·커서가 맞는지만 본다.
  신고 사유 코드의 접두 백필(런북 3절 — `LIKE`·`CHAR_LENGTH`·`SUBSTRING`·`TRIM` 과 utf8mb4 콜레이션 비교)도 슬라이스가 대신하지 않는다. 런북 4절 확인 쿼리로 본다.
