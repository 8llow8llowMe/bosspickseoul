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

export const fetchMemberBookmarks = async (
  lastBookmarkId?: number,
  size = 50,
  signal?: AbortSignal,
) => {
  const searchParams = new URLSearchParams({ size: String(size) })
  if (lastBookmarkId !== undefined) {
    searchParams.set('lastBookmarkId', String(lastBookmarkId))
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

export const removeMemberBookmark = async (bookmarkId: number) => {
  const response = await apiClient.delete<ApiResponse<null>>(
    `/members/me/bookmarks/${bookmarkId}`,
  )

  return response.data
}
