import {
  createCommunityComment,
  createCommunityPost,
  createCommunityReport,
  deleteCommunityComment,
  deleteCommunityPost,
  fetchCommunityComments,
  fetchCommunityPost,
  fetchCommunityPosts,
  fetchLikedCommunityPosts,
  searchCommunityPosts,
  toggleCommunityCommentLike,
  toggleCommunityPostLike,
  updateCommunityPost,
} from '@/lib/api/community'
import { createCommercialComparisonDraft } from '@/lib/api/community-drafts'
import type { ComparisonDraftParams } from '@/lib/community/comparison-draft-url'
import type {
  CommunityId,
  CommunityCommentCreateRequest,
  CommunityCommentLikeResponse,
  CommunityCommentsResponse,
  CommunityCursorParams,
  CommunityLikedPostsResponse,
  CommunityListParams,
  CommunityPostCreateRequest,
  CommunityPostDetailResponse,
  CommunityPostLikeResponse,
  CommunityPostListResponse,
  CommunityPostUpdateRequest,
  CommunityReportCreateRequest,
  CommunityComparisonDraftResponse,
  CommunitySearchParams,
  CommunityVoidResponse,
} from '@/types/community'

export interface CommunityDataSource {
  getPosts: (params: CommunityListParams) => Promise<CommunityPostListResponse>
  searchPosts: (
    params: CommunitySearchParams,
  ) => Promise<CommunityPostListResponse>
  getLikedPosts: (
    params: CommunityCursorParams,
  ) => Promise<CommunityLikedPostsResponse>
  getPost: (postId: CommunityId) => Promise<CommunityPostDetailResponse>
  createPost: (
    payload: CommunityPostCreateRequest,
  ) => Promise<CommunityPostDetailResponse>
  updatePost: (
    postId: CommunityId,
    payload: CommunityPostUpdateRequest,
  ) => Promise<CommunityPostDetailResponse>
  deletePost: (postId: CommunityId) => Promise<CommunityVoidResponse>
  togglePostLike: (postId: CommunityId) => Promise<CommunityPostLikeResponse>
  getComments: (postId: CommunityId) => Promise<CommunityCommentsResponse>
  createComment: (
    postId: CommunityId,
    payload: CommunityCommentCreateRequest,
  ) => Promise<CommunityCommentsResponse>
  deleteComment: (
    postId: CommunityId,
    commentId: CommunityId,
  ) => Promise<CommunityVoidResponse>
  toggleCommentLike: (
    postId: CommunityId,
    commentId: CommunityId,
  ) => Promise<CommunityCommentLikeResponse>
  createReport: (
    payload: CommunityReportCreateRequest,
  ) => Promise<CommunityVoidResponse>
  /**
   * 상권 비교 초안. 게시글 CRUD 가 아니라 **글쓰기 화면을 채우는 재료**다.
   * 데이터 소스에 두는 이유는 `?mock=1` 글쓰기가 실제 백엔드를 때리지 않게 하기 위함이다.
   */
  createComparisonDraft: (
    params: ComparisonDraftParams,
    signal?: AbortSignal,
  ) => Promise<CommunityComparisonDraftResponse>
}

export const realCommunitySource: CommunityDataSource = {
  getPosts: fetchCommunityPosts,
  searchPosts: searchCommunityPosts,
  getLikedPosts: fetchLikedCommunityPosts,
  getPost: fetchCommunityPost,
  createPost: createCommunityPost,
  updatePost: updateCommunityPost,
  deletePost: deleteCommunityPost,
  togglePostLike: toggleCommunityPostLike,
  getComments: fetchCommunityComments,
  createComment: createCommunityComment,
  deleteComment: deleteCommunityComment,
  toggleCommentLike: toggleCommunityCommentLike,
  createReport: createCommunityReport,
  createComparisonDraft: createCommercialComparisonDraft,
}
