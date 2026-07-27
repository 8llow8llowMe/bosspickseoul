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
  getPost: (postId: number) => Promise<CommunityPostDetailResponse>
  createPost: (
    payload: CommunityPostCreateRequest,
  ) => Promise<CommunityPostDetailResponse>
  updatePost: (
    postId: number,
    payload: CommunityPostUpdateRequest,
  ) => Promise<CommunityPostDetailResponse>
  deletePost: (postId: number) => Promise<CommunityVoidResponse>
  togglePostLike: (postId: number) => Promise<CommunityPostLikeResponse>
  getComments: (postId: number) => Promise<CommunityCommentsResponse>
  createComment: (
    postId: number,
    payload: CommunityCommentCreateRequest,
  ) => Promise<CommunityCommentsResponse>
  deleteComment: (
    postId: number,
    commentId: number,
  ) => Promise<CommunityVoidResponse>
  toggleCommentLike: (
    postId: number,
    commentId: number,
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
