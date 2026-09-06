# Community Service Guide

## 서비스 책임

- 자치구 / 행정동 / 상권 대상 게시판형 커뮤니티
- 게시글, 댓글, 좋아요, 신고, 통합 피드 제공

## 주요 컨텍스트

- `community`

## 인증 방식

- 조회는 공개
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
- 상권별 게시글은 `GET /api/v1/community/posts?targetType=COMMERCIAL&targetCode={code}` 로 조회한다. Post 엔티티는 `commercialCode` 직속 필드 대신 `targetType + targetCode` 일반화 구조를 사용하며, `idx_community_post_target_type_target_code_created_at` 인덱스가 뒷받침한다.
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
- 커뮤니티 타깃명 표시용 지역 메타는 로컬 참조 테이블 `commercial_region_mapping`으로만 조회하고, 원천 책임은 `district-service`에 둔다.

## 게시글 조회수 (신규)

- `community_post` 테이블에 `view_count BIGINT DEFAULT 0` 추가
- `GET /api/v1/community/posts/{postId}` 호출 시 `CommunityCommandProcessor.incrementViewCount()` 자동 실행
- `CommunityPostWebFacade.getPost()` — `@Transactional`(기본값, 쓰기 트랜잭션) 적용 (조회수 쓰기 포함)
- 조회수는 `ACTIVE` 조건의 DB 산술 UPDATE로 증가시킨다. 변경 전 엔티티 전체를 다시 저장하지 않아 동시 좋아요·본문 수정·삭제를 덮어쓰지 않는다. 삭제가 먼저 완료되면 기존 `COMMUNITY_005`(404)를 반환한다.

## 게시글 검색 (신규)

- `GET /api/v1/community/posts/search`
- 파라미터: `keyword`, `sortType`, `orderType`, `lastPostId`, `lastLikeCount`, `size` (기본 10)
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

## 신고 모더레이션 워크플로우 (신규)

- `GET /api/v1/moderation/reports` — PENDING 신고 목록 (MANAGER only)
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
- **주의: `/api/v1/moderation/**` 는 API Gateway 에 라우트가 없다** (게이트웨이는 `/api/v1/community/**` 만 community-service 로 라우팅). 게이트웨이 경유 호출은 404 가 나며, 현재는 내부망 직접 호출 전용이다. 라우트 추가 여부는 별도 결정이 필요하다.

## 피드 필터 일관성 (버그 수정)

- `CommunityQueryProcessor.getFeed()` — `targetType`이 null일 때 `targetCode`도 null로 정규화해 DB 쿼리에 고아 필터가 전달되지 않도록 수정

## 에러코드

| 대역 | 코드 | 설명 |
|------|------|------|
| 도메인 | `COMMUNITY_001`~`COMMUNITY_012` | 대상/정렬 타입 400, 게시글·댓글·신고 미존재 404, 권한 403, 중복 신고·기처리 신고 409 등 |
| 검증 폴백 | `COMMUNITY_100` | 요청 값 검증 실패 폴백 (INVALID_REQUEST) |
| 검증 필드별 | `COMMUNITY_101`~`COMMUNITY_116` | `CommunityValidationMessage` 가 단일 기준점. `COMMUNITY_113`~`COMMUNITY_116` 은 상권 비교 draft 전용 (좌/우 상권 코드, 서비스 코드, 분기 코드) |
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

- 게시글 본문 수정, 조회수·좋아요·댓글 수 변경, 소프트 삭제는 각 필드만 조건부 UPDATE한다. JPA bulk UPDATE 전 flush, 이후 영속성 컨텍스트 clear로 대기 중인 쓰기를 보존하고 갱신 값을 다시 읽는다.
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
