import type { ApiResponse } from '@/types/api'

export type BookmarkTargetType = 'COMMERCIAL' | 'ADMINISTRATION' | 'DISTRICT'

export type MemberBookmark = {
  bookmarkId: number
  targetType: BookmarkTargetType
  targetCode: string
  targetName: string
  createdAt: string
}

export type BookmarkSlice = {
  contents: MemberBookmark[]
  hasNext: boolean
}

export type MemberBookmarksResponse = ApiResponse<{
  bookmarks: BookmarkSlice
}>

export type MemberBookmarkResponse = ApiResponse<MemberBookmark>

export type CreateMemberBookmarkPayload = Pick<
  MemberBookmark,
  'targetType' | 'targetCode' | 'targetName'
>
