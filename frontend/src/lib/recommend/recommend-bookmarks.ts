import { readApiMessage } from '@/lib/api/api-error'
import type { ApiMessage } from '@/types/api'
import type {
  BookmarkSlice,
  BookmarkTargetType,
  MemberBookmark,
  MemberBookmarksResponse,
} from '@/types/bookmark'

const bookmarkTargetTypes: readonly BookmarkTargetType[] = [
  'COMMERCIAL',
  'ADMINISTRATION',
  'DISTRICT',
]

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object'

export const getMemberBookmarksQueryKey = (memberId: string) =>
  ['member', memberId, 'bookmarks'] as const

export const isMemberBookmarkQueryEnabled = (
  memberId: string | null | undefined,
  enabled: boolean,
): memberId is string => enabled && Boolean(memberId)

/**
 * `bookmarkId` 는 **문자열만** 받는다. 숫자로 들어온 값은 Snowflake 정밀도가 이미
 * `JSON.parse` 단계에서 깨진 값이므로, 손상된 아이디로 DELETE 를 쏘게 두지 않고
 * 항목 자체를 버린다. 정상 경로에서는 `@/lib/api/user` 의
 * `parseMemberBookmarkResponse` 가 파싱 전에 문자열로 감싸 준다.
 */
export const normalizeMemberBookmark = (
  value: unknown,
): MemberBookmark | null => {
  if (
    !isRecord(value) ||
    typeof value.bookmarkId !== 'string' ||
    !/^\d+$/.test(value.bookmarkId) ||
    typeof value.targetType !== 'string' ||
    !bookmarkTargetTypes.includes(value.targetType as BookmarkTargetType) ||
    typeof value.targetCode !== 'string' ||
    value.targetCode.trim() === '' ||
    typeof value.targetName !== 'string' ||
    value.targetName.trim() === '' ||
    typeof value.createdAt !== 'string' ||
    value.createdAt.trim() === ''
  ) {
    return null
  }

  return {
    bookmarkId: value.bookmarkId,
    targetType: value.targetType as BookmarkTargetType,
    targetCode: value.targetCode,
    targetName: value.targetName,
    createdAt: value.createdAt,
  }
}

export const normalizeMemberBookmarkResponse = (
  value: unknown,
): BookmarkSlice | null => {
  if (
    !isRecord(value) ||
    !isRecord(value.dataHeader) ||
    value.dataHeader.success !== true ||
    !isRecord(value.dataBody) ||
    !isRecord(value.dataBody.bookmarks) ||
    !Array.isArray(value.dataBody.bookmarks.contents) ||
    typeof value.dataBody.bookmarks.hasNext !== 'boolean'
  ) {
    return null
  }

  const contents = value.dataBody.bookmarks.contents.map(
    normalizeMemberBookmark,
  )
  if (contents.some(item => item === null)) return null

  return {
    contents: contents as MemberBookmark[],
    hasNext: value.dataBody.bookmarks.hasNext,
  }
}

export const collectMemberBookmarks = (
  pages: readonly unknown[],
): MemberBookmark[] => {
  const seenBookmarkIds = new Set<string>()

  return pages.flatMap(page => {
    const slice = normalizeMemberBookmarkResponse(page)
    if (!slice) return []

    return slice.contents.filter(item => {
      if (seenBookmarkIds.has(item.bookmarkId)) {
        return false
      }

      seenBookmarkIds.add(item.bookmarkId)
      return true
    })
  })
}

export const collectCommercialBookmarks = (
  pages: readonly unknown[],
): MemberBookmark[] =>
  collectMemberBookmarks(pages).filter(
    bookmark => bookmark.targetType === 'COMMERCIAL',
  )

export const getCommercialBookmarkNextPageParam = (
  lastPage: unknown,
  _allPages: readonly MemberBookmarksResponse[],
  lastPageParam?: string,
  allPageParams: readonly unknown[] = [],
): string | undefined => {
  const slice = normalizeMemberBookmarkResponse(lastPage)
  if (!slice?.hasNext || slice.contents.length === 0) return undefined

  const cursor = slice.contents.at(-1)?.bookmarkId
  if (
    cursor === undefined ||
    cursor === lastPageParam ||
    allPageParams.some(pageParam => pageParam === cursor)
  ) {
    return undefined
  }

  return cursor
}

export const getCommercialBookmarkView = (
  enabled: boolean,
  bookmarks: readonly MemberBookmark[],
): MemberBookmark[] => (enabled ? [...bookmarks] : [])

export const getCommercialBookmarkError = (
  firstPage: unknown,
  queryError: unknown,
): string | null => {
  if (queryError instanceof Error) return queryError.message
  if (queryError) return '회원 북마크를 불러오지 못했습니다.'
  if (firstPage === undefined || firstPage === null) return null

  if (
    isRecord(firstPage) &&
    isRecord(firstPage.dataHeader) &&
    firstPage.dataHeader.success === false
  ) {
    // 대표 문구와 필드별 `errors`를 구분하는 파서는 `@/lib/api/api-error` 하나뿐이다.
    return (
      readApiMessage(firstPage.dataHeader.resultMessage as ApiMessage) ??
      '회원 북마크를 불러오지 못했습니다.'
    )
  }

  return normalizeMemberBookmarkResponse(firstPage)
    ? null
    : '회원 북마크 응답 형식을 확인하지 못했습니다.'
}

export const getCommercialBookmarkCollectionError = (
  pages: readonly unknown[],
  queryError: unknown,
): string | null => {
  const transportError = getCommercialBookmarkError(undefined, queryError)
  if (transportError) return transportError

  for (const page of pages) {
    const responseError = getCommercialBookmarkError(page, null)
    if (responseError) return responseError
  }

  return null
}

export const validateMemberBookmarkResponse = <
  T extends MemberBookmarksResponse,
>(
  response: T,
): T => {
  const error = getCommercialBookmarkError(response, null)
  if (error) throw new Error(error)

  return response
}

type MemberBookmarksInvalidationClient = {
  invalidateQueries: (filters: {
    queryKey: ReturnType<typeof getMemberBookmarksQueryKey>
  }) => Promise<unknown>
}

type MemberBookmarksRemovalClient = {
  cancelQueries: (filters: {
    queryKey: ReturnType<typeof getMemberBookmarksQueryKey>
  }) => Promise<unknown>
  removeQueries: (filters: {
    queryKey: ReturnType<typeof getMemberBookmarksQueryKey>
  }) => unknown
}

export const invalidateMemberBookmarksQuery = (
  queryClient: MemberBookmarksInvalidationClient,
  memberId: string,
) =>
  queryClient.invalidateQueries({
    queryKey: getMemberBookmarksQueryKey(memberId),
  })

export const clearMemberBookmarksQuery = async (
  queryClient: MemberBookmarksRemovalClient,
  memberId: string,
): Promise<void> => {
  const queryKey = getMemberBookmarksQueryKey(memberId)
  try {
    await queryClient.cancelQueries({ queryKey })
  } catch {
    // Logout cleanup remains best-effort when cancellation itself fails.
  } finally {
    try {
      queryClient.removeQueries({ queryKey })
    } catch {
      // Local logout UX must continue even if cache removal fails.
    }
  }
}

export const shouldAutoFetchNextBookmarkPage = ({
  enabled,
  hasError = false,
  hasNextPage,
  isFetchingNextPage,
  nextCursor,
}: {
  enabled: boolean
  hasError?: boolean
  hasNextPage: boolean
  isFetchingNextPage: boolean
  nextCursor: string | undefined
}): boolean =>
  enabled &&
  !hasError &&
  hasNextPage &&
  !isFetchingNextPage &&
  nextCursor !== undefined
