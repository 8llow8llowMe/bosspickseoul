import { apiClient } from '@/lib/api/client'
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

export const fetchCommunityPosts = async (params: CommunityListParams) => {
  const response = await apiClient.get<CommunityPostListResponse>(
    '/community/posts',
    { params },
  )

  return response.data
}

export const searchCommunityPosts = async (params: CommunitySearchParams) => {
  const response = await apiClient.get<CommunityPostListResponse>(
    '/community/posts/search',
    { params },
  )

  return response.data
}

export const fetchLikedCommunityPosts = async (
  params: CommunityCursorParams,
) => {
  const response = await apiClient.get<CommunityLikedPostsResponse>(
    '/community/posts/liked',
    { params },
  )

  return response.data
}

export const fetchCommunityPost = async (postId: number) => {
  const response = await apiClient.get<CommunityPostDetailResponse>(
    `/community/posts/${postId}`,
  )

  return response.data
}

export const createCommunityPost = async (
  payload: CommunityPostCreateRequest,
) => {
  const response = await apiClient.post<CommunityPostDetailResponse>(
    '/community/posts',
    payload,
  )

  return response.data
}

export const updateCommunityPost = async (
  postId: number,
  payload: CommunityPostUpdateRequest,
) => {
  const response = await apiClient.patch<CommunityPostDetailResponse>(
    `/community/posts/${postId}`,
    payload,
  )

  return response.data
}

export const deleteCommunityPost = async (postId: number) => {
  const response = await apiClient.delete<CommunityVoidResponse>(
    `/community/posts/${postId}`,
  )

  return response.data
}

export const toggleCommunityPostLike = async (postId: number) => {
  const response = await apiClient.post<CommunityPostLikeResponse>(
    `/community/posts/${postId}/likes`,
  )

  return response.data
}

export const fetchCommunityComments = async (postId: number) => {
  const response = await apiClient.get<CommunityCommentsResponse>(
    `/community/posts/${postId}/comments`,
  )

  return response.data
}

export const createCommunityComment = async (
  postId: number,
  payload: CommunityCommentCreateRequest,
) => {
  const response = await apiClient.post<CommunityCommentsResponse>(
    `/community/posts/${postId}/comments`,
    payload,
  )

  return response.data
}

export const deleteCommunityComment = async (
  postId: number,
  commentId: number,
) => {
  const response = await apiClient.delete<CommunityVoidResponse>(
    `/community/posts/${postId}/comments/${commentId}`,
  )

  return response.data
}

export const toggleCommunityCommentLike = async (
  postId: number,
  commentId: number,
) => {
  const response = await apiClient.post<CommunityCommentLikeResponse>(
    `/community/posts/${postId}/comments/${commentId}/likes`,
  )

  return response.data
}

export const createCommunityReport = async (
  payload: CommunityReportCreateRequest,
) => {
  const response = await apiClient.post<CommunityVoidResponse>(
    '/community/reports',
    payload,
  )

  return response.data
}
