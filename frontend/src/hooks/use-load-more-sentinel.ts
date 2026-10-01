'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import {
  COMMUNITY_LIST_AUTOLOAD_ROOT_MARGIN,
  shouldAutoLoadNextPage,
} from '@/lib/community/list-feed'

type UseLoadMoreSentinelOptions = {
  hasNextPage: boolean
  /** 쿼리가 무엇이든 받는 중(React Query `isFetching`). 다음 쪽만이 아니다 — `shouldAutoLoadNextPage`. */
  isFetching: boolean
  hasLoadMoreError: boolean
  onLoadMore: () => void
  rootMargin?: string
}

/**
 * 목록 끝 감시 요소에 붙일 callback ref 를 돌려준다. 감시 요소가 (여유 `rootMargin` 안에서)
 * 보이고 다음 쪽을 부를 수 있으면 `onLoadMore` 를 부른다(community.md §S4, CM-029).
 *
 * - IntersectionObserver 가 없거나(구형 브라우저) SSR 이면 아무것도 하지 않는다. 그때는
 *   목록 끝에서 멈춘다 — 실패한 다음 쪽은 `다시 불러오기` 가 따로 있다.
 * - 판정에 쓰는 값은 ref 로 최신을 읽는다. 값이 바뀔 때마다 관찰을 다시 걸면 관찰 시작 알림이
 *   매번 와서 중복 호출이 생긴다.
 * - 다음 쪽을 다 받았는데 감시 요소가 그대로 화면 안이면 교차 이벤트가 다시 오지 않는다.
 *   「부를 수 있음」 으로 돌아오는 순간 마지막 교차 상태를 보고 이어 부른다.
 * - 「받는 중」 은 다음 쪽만이 아니라 백그라운드 refetch 도 포함한다(`isFetching`). refetch 중 교차해
 *   부른 다음 쪽은 진행 중 요청에 흡수되는데, 그동안 `isFetchingNextPage` 는 false 라 그것만 보면
 *   「부를 수 있음」 이 바뀌지 않아 이어 부르기가 영영 돌지 않는다.
 * - 같은 순간 두 번 불릴 수는 있다(교차 알림과 렌더 사이). 호출부는 `fetchNextPage({ cancelRefetch: false })`
 *   로 진행 중 요청을 겹치지 않게 한다.
 */
export const useLoadMoreSentinel = ({
  hasNextPage,
  isFetching,
  hasLoadMoreError,
  onLoadMore,
  rootMargin = COMMUNITY_LIST_AUTOLOAD_ROOT_MARGIN,
}: UseLoadMoreSentinelOptions) => {
  const [node, setNode] = useState<Element | null>(null)
  const latestRef = useRef({
    hasNextPage,
    isFetching,
    hasLoadMoreError,
    onLoadMore,
  })
  const intersectingRef = useRef(false)

  // 아래 두 이펙트보다 먼저 선언해 같은 커밋에서 최신 값을 먼저 반영한다.
  useEffect(() => {
    latestRef.current = {
      hasNextPage,
      isFetching,
      hasLoadMoreError,
      onLoadMore,
    }
  })

  useEffect(() => {
    if (
      !node ||
      typeof window === 'undefined' ||
      typeof window.IntersectionObserver === 'undefined'
    ) {
      return
    }

    const observer = new window.IntersectionObserver(
      entries => {
        const entry = entries[entries.length - 1]

        if (!entry) {
          return
        }

        intersectingRef.current = entry.isIntersecting
        const latest = latestRef.current

        if (
          shouldAutoLoadNextPage({
            isIntersecting: entry.isIntersecting,
            hasNextPage: latest.hasNextPage,
            isFetching: latest.isFetching,
            hasLoadMoreError: latest.hasLoadMoreError,
          })
        ) {
          latest.onLoadMore()
        }
      },
      { rootMargin },
    )

    observer.observe(node)

    return () => {
      observer.disconnect()
      intersectingRef.current = false
    }
  }, [node, rootMargin])

  const canLoad = hasNextPage && !isFetching && !hasLoadMoreError

  useEffect(() => {
    if (canLoad && intersectingRef.current) {
      latestRef.current.onLoadMore()
    }
  }, [canLoad])

  return useCallback((element: Element | null) => {
    setNode(element)
  }, [])
}

export default useLoadMoreSentinel
