import { apiClient } from '@/lib/api/client'
import type {
  CommunityId,
  CommunityCommentCreateRequest,
  CommunityCommentLikeResponse,
  CommunityCommentsResponse,
  CommunityCursorParams,
  CommunityLikedPostsResponse,
  CommunityListParams,
  CommunityNotificationListParams,
  CommunityNotificationListResponse,
  CommunityNotificationReadAllResponse,
  CommunityNotificationReadResponse,
  CommunityNotificationUnreadCountResponse,
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

export const fetchCommunityPost = async (postId: CommunityId) => {
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
  postId: CommunityId,
  payload: CommunityPostUpdateRequest,
) => {
  const response = await apiClient.patch<CommunityPostDetailResponse>(
    `/community/posts/${postId}`,
    payload,
  )

  return response.data
}

export const deleteCommunityPost = async (postId: CommunityId) => {
  const response = await apiClient.delete<CommunityVoidResponse>(
    `/community/posts/${postId}`,
  )

  return response.data
}

export const toggleCommunityPostLike = async (postId: CommunityId) => {
  const response = await apiClient.post<CommunityPostLikeResponse>(
    `/community/posts/${postId}/likes`,
  )

  return response.data
}

export const fetchCommunityComments = async (postId: CommunityId) => {
  const response = await apiClient.get<CommunityCommentsResponse>(
    `/community/posts/${postId}/comments`,
  )

  return response.data
}

export const createCommunityComment = async (
  postId: CommunityId,
  payload: CommunityCommentCreateRequest,
) => {
  const response = await apiClient.post<CommunityCommentsResponse>(
    `/community/posts/${postId}/comments`,
    payload,
  )

  return response.data
}

export const deleteCommunityComment = async (
  postId: CommunityId,
  commentId: CommunityId,
) => {
  const response = await apiClient.delete<CommunityVoidResponse>(
    `/community/posts/${postId}/comments/${commentId}`,
  )

  return response.data
}

export const toggleCommunityCommentLike = async (
  postId: CommunityId,
  commentId: CommunityId,
) => {
  const response = await apiClient.post<CommunityCommentLikeResponse>(
    `/community/posts/${postId}/comments/${commentId}/likes`,
  )

  return response.data
}

/*
  커뮤니티 알림(#535·#536). 계약 정본은 `backend/docs/services/community-notification-design.md` §7 이다.
  전부 인증 필수이고 BFF 캐치올(`app/api/bff/[...path]`)이 세션 토큰을 붙인다 — 새 라우트가 없다.
*/
export const fetchCommunityNotifications = async (
  params: CommunityNotificationListParams,
) => {
  const response = await apiClient.get<CommunityNotificationListResponse>(
    '/community/notifications',
    { params },
  )

  return response.data
}

export const fetchCommunityNotificationUnreadCount = async () => {
  const response =
    await apiClient.get<CommunityNotificationUnreadCountResponse>(
      '/community/notifications/unread-count',
    )

  return response.data
}

/** 단건 읽음. 멱등이다 — 이미 읽은 알림도 200. */
export const markCommunityNotificationRead = async (
  notificationId: CommunityId,
) => {
  const response = await apiClient.patch<CommunityNotificationReadResponse>(
    `/community/notifications/${notificationId}/read`,
  )

  return response.data
}

/** 내 안 읽은 알림 전체 읽음. 멱등이다. */
export const markAllCommunityNotificationsRead = async () => {
  const response = await apiClient.patch<CommunityNotificationReadAllResponse>(
    '/community/notifications/read',
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
