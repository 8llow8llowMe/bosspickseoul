import type { ApiResponse } from '@/types/api'

export type CommunityTargetType = 'DISTRICT' | 'ADMINISTRATION' | 'COMMERCIAL'

export type CommunitySortType = 'LATEST' | 'POPULAR'

export type CommunityOrderType = 'ASC' | 'DESC'

export type CommunityMetadata = {
  code: string
  name: string
  description: string
} | null

export type CommunityPostSummary = {
  postId: number
  memberId: number
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
  postId: number
  memberId: number
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
  commentId: number
  postId: number
  memberId: number
  parentCommentId: number
  content: string
  likeCount: number
  createdAt: string
  updatedAt: string
}

export type CommunityComment = {
  commentId: number
  postId: number
  memberId: number
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
  postId: number
  liked: boolean
  likeCount: number
}

export type CommunityCommentLikeBody = {
  commentId: number
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
  parentCommentId?: number
  content: string
}

export type CommunityReportCreateRequest = {
  targetKind: 'POST' | 'COMMENT'
  targetId: number
  reason: string
}

export type CommunityCursorParams = {
  sortType: CommunitySortType
  orderType: CommunityOrderType
  lastPostId: number
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
