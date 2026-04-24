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
- 상권별 게시글은 `GET /api/v1/community/posts?targetType=COMMERCIAL&targetCode={code}` 로 조회한다. Post 엔티티는 `commercialCode` 직속 필드 대신 `targetType + targetCode` 일반화 구조를 사용하며, `idx_community_post_target_created` 인덱스가 뒷받침한다.
- No-offset 커서는 LATEST 정렬에서 `id`, POPULAR 정렬에서 `(likeCount, id)` 복합 커서를 쓴다. `lastPostId == 0` 은 초기 로드 관례다.
- 좋아요/신고 저장 흐름은 `domain -> entity -> repository.save -> entity -> domain` 패턴을 유지한다.
- 정렬 파라미터는 enum 기반 `sortType`, `orderType` 기준을 따른다. `CommunitySortType` 과 `OrderType` 은 모두 `CodeNameDescribable` 을 구현한다 (`displayName` 필드 + metadata 변환).

## 게시글 조회수 (신규)

- `community_post` 테이블에 `view_count BIGINT DEFAULT 0` 추가
- `GET /api/v1/community/posts/{postId}` 호출 시 `CommunityCommandProcessor.incrementViewCount()` 자동 실행
- `CommunityPostWebFacade.getPost()` — `@Transactional(readOnly=false)` 적용 (조회수 쓰기 포함)
- 경쟁 조건은 데모 수준에서 허용

## 게시글 검색 (신규)

- `GET /api/v1/community/posts/search`
- 파라미터: `keyword`, `sortType`, `orderType`, `lastPostId`, `lastLikeCount`, `size` (기본 10)
- `CommunityPostCustomRepositoryImpl` — `title.containsIgnoreCase(keyword).or(content.containsIgnoreCase(keyword))`
- 기존 `executeSliceQuery`, `applyCursorCondition` 패턴 재사용

## 대댓글 (신규, depth 1 고정)

- `community_comment` 테이블에 `parent_comment_id BIGINT NULL` + `idx_community_comment_parent_id` 추가
- `POST /api/v1/community/posts/{postId}/comments` — `parentCommentId` 옵션 필드 추가
- depth 1 고정: `CommunityCommandProcessor.validateParentComment()` 에서 3중 검증 (게시글 소속 / 최상위 여부 / ACTIVE 상태)
- 계층 조립: DB flat list → `CommunityCommentPresenter`에서 in-memory groupBy
- 응답: `CommunityCommentItem.replies[]` 에 `CommunityReplyItem` 목록 포함

## 신고 모더레이션 워크플로우 (신규)

- `GET /api/v1/moderation/reports` — PENDING 신고 목록 (MANAGER only)
  - 응답에 `targetTitle`, `targetPreview` (최대 100자), `targetAuthorId` 포함 — 매니저가 DB 직접 조회 없이 트리아지 가능
- `PATCH /api/v1/moderation/reports/{reportId}` — `{ "decision": "APPROVE_AND_HIDE" | "DISMISS" }` (MANAGER only)
- `community_report` 테이블에 `status`, `resolved_at`, `resolved_by_member_id` 컬럼 + `idx_community_report_status` 추가
- `APPROVE_AND_HIDE` 시 대상 post/comment 상태를 `DELETED`로 변경
  - COMMENT 숨김 시 부모 게시글의 `comment_count`도 `Math.max(0, count - 1)` 감소 (일관성 보장)
- 신규 컨트롤러: `ModerationWebController` — `@PreAuthorize("hasAuthority('MANAGER')")`
- 신규 enum: `ReportStatus` (PENDING/APPROVED/DISMISSED), `ModerationDecision` (APPROVE_AND_HIDE/DISMISS)
- 아키텍처: `ModerationWebFacade`는 `CommunityReportPort`를 직접 주입하지 않고 `ModerationQueryProcessor`를 통해 접근

## 피드 필터 일관성 (버그 수정)

- `CommunityQueryProcessor.getFeed()` — `targetType`이 null일 때 `targetCode`도 null로 정규화해 DB 쿼리에 고아 필터가 전달되지 않도록 수정
