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
