import type { ApiResponse } from '@/types/api'

/**
 * 커뮤니티 식별자 — **문자열이다. 절대 `Number(...)` 로 바꾸지 않는다.**
 *
 * 게시글·댓글·회원 id 는 Snowflake(`(timestamp - epoch) << 22`)라 현재 약 7.5e17 이고,
 * `Number.MAX_SAFE_INTEGER`(약 9.0e15)를 두 자릿수 넘는다. 숫자로 파싱하면 뒷자리가
 * 조용히 날아가 서로 다른 글이 같은 id 로 보인다 — 오류가 아니라 오염이라 추적이 어렵다.
 * 백엔드도 같은 이유로 응답 식별자를 문자열로 내린다(BE 51458f57).
 *
 * ⚠️ **경로·쿼리·요청 본문은 백엔드가 아직 `long` 으로 받는다.** 경로와 쿼리는 문자열을
 * 그대로 URL 에 넣으면 되므로 문제없다(JS 숫자를 거치지 않는다). 요청 본문의
 * `parentCommentId`·`targetId` 도 문자열로 보내고 Jackson 의 문자열→숫자 강제 변환에
 * 기댄다 — 여기서 `Number(...)` 를 쓰면 그게 바로 정밀도 손실이다.
 *
 * `bookmarkId`(`types/bookmark.ts`)가 같은 이유로 먼저 문자열이 됐다.
 */
export type CommunityId = string

export type CommunityTargetType = 'DISTRICT' | 'ADMINISTRATION' | 'COMMERCIAL'

export type CommunitySortType = 'LATEST' | 'POPULAR'

export type CommunityOrderType = 'ASC' | 'DESC'

export type CommunityMetadata = {
  code: string
  name: string
  description: string
} | null

export type CommunityPostSummary = {
  postId: CommunityId
  memberId: CommunityId
  targetType: CommunityMetadata
  targetCode: string | null
  targetName: string | null
  title: string
  previewContent: string
  likeCount: number
  commentCount: number
  createdAt: string
}

export type CommunityPostDetail = {
  postId: CommunityId
  memberId: CommunityId
  targetType: CommunityMetadata
  targetCode: string | null
  targetName: string | null
  title: string
  content: string
  likeCount: number
  commentCount: number
  viewCount: number
  createdAt: string
  updatedAt: string
}

export type CommunityPostSlice<T = CommunityPostSummary> = {
  contents: T[]
  hasNext: boolean
}

export type CommunityBoardTarget = {
  targetType: CommunityMetadata
  targetCode: string | null
  targetName: string | null
}

export type CommunityPostListBody = {
  board: CommunityBoardTarget | null
  posts: CommunityPostSlice<CommunityPostSummary>
}

export type CommunityLikedPost = CommunityPostSummary & {
  likedAt: string
}

export type CommunityLikedPostsBody = {
  posts: CommunityPostSlice<CommunityLikedPost>
}

export type CommunityReply = {
  commentId: CommunityId
  postId: CommunityId
  memberId: CommunityId
  parentCommentId: CommunityId
  content: string
  likeCount: number
  createdAt: string
  updatedAt: string
}

export type CommunityComment = {
  commentId: CommunityId
  postId: CommunityId
  memberId: CommunityId
  content: string
  likeCount: number
  createdAt: string
  updatedAt: string
  replies: CommunityReply[]
}

export type CommunityCommentsBody = {
  comments: CommunityComment[]
}

export type CommunityLikeBody = {
  postId: CommunityId
  liked: boolean
  likeCount: number
}

export type CommunityCommentLikeBody = {
  commentId: CommunityId
  liked: boolean
  likeCount: number
}

export type CommunityPostCreateRequest = {
  targetType: CommunityTargetType
  targetCode: string
  title: string
  content: string
}

export type CommunityPostUpdateRequest = {
  title: string
  content: string
}

export type CommunityCommentCreateRequest = {
  parentCommentId?: CommunityId
  content: string
}

export type CommunityReportCreateRequest = {
  targetKind: 'POST' | 'COMMENT'
  targetId: CommunityId
  reason: string
}

export type CommunityCursorParams = {
  sortType: CommunitySortType
  orderType: CommunityOrderType
  lastPostId: CommunityId
  lastLikeCount: number
  size: number
}

export type CommunityListParams = CommunityCursorParams & {
  targetType?: CommunityTargetType
  targetCode?: string
}

export type CommunitySearchParams = CommunityCursorParams & {
  keyword: string
}

export type CommunityPostListResponse = ApiResponse<CommunityPostListBody>
export type CommunityLikedPostsResponse = ApiResponse<CommunityLikedPostsBody>
export type CommunityPostDetailResponse = ApiResponse<CommunityPostDetail>
export type CommunityPostLikeResponse = ApiResponse<CommunityLikeBody>
export type CommunityCommentsResponse = ApiResponse<CommunityCommentsBody>
export type CommunityCommentLikeResponse = ApiResponse<CommunityCommentLikeBody>
export type CommunityVoidResponse = ApiResponse<null>
