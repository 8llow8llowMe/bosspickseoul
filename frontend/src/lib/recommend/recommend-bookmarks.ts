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

export const normalizeMemberBookmark = (
  value: unknown,
): MemberBookmark | null => {
  if (
    !isRecord(value) ||
    typeof value.bookmarkId !== 'number' ||
    !Number.isSafeInteger(value.bookmarkId) ||
    value.bookmarkId < 0 ||
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

export const collectCommercialBookmarks = (
  pages: readonly unknown[],
): MemberBookmark[] => {
  const seenBookmarkIds = new Set<number>()

  return pages.flatMap(page => {
    const slice = normalizeMemberBookmarkResponse(page)
    if (!slice) return []

    return slice.contents.filter(item => {
      if (
        item.targetType !== 'COMMERCIAL' ||
        seenBookmarkIds.has(item.bookmarkId)
      ) {
        return false
      }

      seenBookmarkIds.add(item.bookmarkId)
      return true
    })
  })
}

export const getCommercialBookmarkNextPageParam = (
  lastPage: unknown,
  _allPages: readonly MemberBookmarksResponse[],
  lastPageParam?: number,
  allPageParams: readonly unknown[] = [],
): number | undefined => {
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

const readApiMessage = (value: unknown): string | null => {
  if (typeof value === 'string' && value.trim()) return value
  if (!isRecord(value)) return null

  const messages = Object.values(value).filter(
    (message): message is string =>
      typeof message === 'string' && message.trim() !== '',
  )
  return messages.length > 0 ? messages.join('\n') : null
}

export const getCommercialBookmarkError = (
  firstPage: unknown,
  queryError: unknown,
): string | null => {
  if (queryError instanceof Error) return queryError.message
  if (queryError) return '상권 북마크를 불러오지 못했습니다.'
  if (firstPage === undefined || firstPage === null) return null

  if (
    isRecord(firstPage) &&
    isRecord(firstPage.dataHeader) &&
    firstPage.dataHeader.success === false
  ) {
    return (
      readApiMessage(firstPage.dataHeader.resultMessage) ??
      '상권 북마크를 불러오지 못했습니다.'
    )
  }

  return normalizeMemberBookmarkResponse(firstPage)
    ? null
    : '상권 북마크 응답 형식을 확인하지 못했습니다.'
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
  nextCursor: number | undefined
}): boolean =>
  enabled &&
  !hasError &&
  hasNextPage &&
  !isFetchingNextPage &&
  nextCursor !== undefined
