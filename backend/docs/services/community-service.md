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
- 좋아요/신고 저장 흐름은 `domain -> entity -> repository.save -> entity -> domain` 패턴을 유지한다.
- 정렬 파라미터는 enum 기반 `sortType`, `orderType` 기준을 따른다.
