'use client'

import { useEffect, useMemo } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { fetchMemberBookmarks } from '@/lib/api/user'
import {
  collectMemberBookmarks,
  getCommercialBookmarkCollectionError,
  getCommercialBookmarkNextPageParam,
  getMemberBookmarksQueryKey,
  isMemberBookmarkQueryEnabled,
  shouldAutoFetchNextBookmarkPage,
  validateMemberBookmarkResponse,
} from '@/lib/recommend/recommend-bookmarks'

export const useMemberBookmarks = (
  memberId: string | null | undefined,
  enabled: boolean,
) => {
  const queryEnabled = isMemberBookmarkQueryEnabled(memberId, enabled)
  const query = useInfiniteQuery({
    queryKey: getMemberBookmarksQueryKey(memberId ?? ''),
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam, signal }) => {
      if (!memberId) throw new Error('회원 정보를 확인하지 못했습니다.')

      return validateMemberBookmarkResponse(
        await fetchMemberBookmarks(pageParam, 50, signal),
      )
    },
    getNextPageParam: (lastPage, allPages, lastPageParam, allPageParams) =>
      getCommercialBookmarkNextPageParam(
        lastPage,
        allPages,
        typeof lastPageParam === 'string' ? lastPageParam : undefined,
        allPageParams,
      ),
    enabled: queryEnabled,
  })

  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isError,
    isFetching,
    isFetchingNextPage,
    isPending,
  } = query
  const pages = useMemo(() => data?.pages ?? [], [data?.pages])
  const bookmarks = useMemo(
    () => (queryEnabled ? collectMemberBookmarks(pages) : []),
    [pages, queryEnabled],
  )
  const lastPage = pages.at(-1)
  const rawLastPageParam = data?.pageParams.at(-1)
  const lastPageParam =
    typeof rawLastPageParam === 'string' ? rawLastPageParam : undefined
  const nextCursor = getCommercialBookmarkNextPageParam(
    lastPage,
    pages,
    lastPageParam,
    data?.pageParams ?? [],
  )

  useEffect(() => {
    if (
      shouldAutoFetchNextBookmarkPage({
        enabled: queryEnabled,
        hasError: error !== null,
        hasNextPage,
        isFetchingNextPage,
        nextCursor,
      })
    ) {
      void fetchNextPage()
    }
  }, [
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    nextCursor,
    queryEnabled,
  ])

  const errorMessage = queryEnabled
    ? getCommercialBookmarkCollectionError(pages, error)
    : null

  return {
    bookmarks,
    errorMessage,
    isError: queryEnabled && (isError || errorMessage !== null),
    isLoading: queryEnabled && isPending,
    isFetching: queryEnabled && isFetching,
  }
}
