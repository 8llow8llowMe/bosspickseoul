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
}
