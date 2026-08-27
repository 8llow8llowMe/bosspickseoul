import { apiClient } from '@/lib/api/client'
import type { ApiResponse } from '@/types/api'
import type { VerifyEmailCodePayload } from '@/types/auth'
import type {
  CreateMemberBookmarkPayload,
  MemberBookmarkResponse,
  MemberBookmarksResponse,
} from '@/types/bookmark'

export const sendEmailVerificationCode = async (memberEmail: string) => {
  const response = await apiClient.post<ApiResponse<null>>(
    `/email/send/${memberEmail}`,
  )

  return response.data
}

export const verifyEmailVerificationCode = async (
  payload: VerifyEmailCodePayload,
) => {
  const response = await apiClient.post<ApiResponse<null>>(
    `/email/verify/${payload.memberEmail}/${payload.emailCode}`,
  )

  return response.data
}

export const logoutUser = async () => {
  const response = await apiClient.post<ApiResponse<null>>('/member/logout')

  return response.data
}

/** `lastBookmarkId` 는 커서로 쓰이는 `bookmarkId` 다 — 문자열 그대로 실어 보낸다. */
export const fetchMemberBookmarks = async (
  lastBookmarkId?: string,
  size = 50,
  signal?: AbortSignal,
) => {
  const searchParams = new URLSearchParams({ size: String(size) })
  if (lastBookmarkId !== undefined) {
    searchParams.set('lastBookmarkId', lastBookmarkId)
  }

  const url = `/members/me/bookmarks?${searchParams.toString()}`
  const response = signal
    ? await apiClient.get<MemberBookmarksResponse>(url, { signal })
    : await apiClient.get<MemberBookmarksResponse>(url)

  return response.data
}

export const addMemberBookmark = async (
  payload: CreateMemberBookmarkPayload,
) => {
  const response = await apiClient.post<MemberBookmarkResponse>(
    '/members/me/bookmarks',
    payload,
  )

  return response.data
}

export const removeMemberBookmark = async (bookmarkId: string) => {
  const response = await apiClient.delete<ApiResponse<null>>(
    `/members/me/bookmarks/${encodeURIComponent(bookmarkId)}`,
  )

  return response.data
}
