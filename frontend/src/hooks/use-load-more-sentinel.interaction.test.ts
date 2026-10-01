// @vitest-environment jsdom
import {
  QueryClient,
  QueryClientProvider,
  useInfiniteQuery,
} from '@tanstack/react-query'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useLoadMoreSentinel } from '@/hooks/use-load-more-sentinel'

/*
  목록 끝 자동 다음 쪽(community.md §S4 「목록 — 끊기지 않는 피드」, CM-029)의 관찰 계약.
  jsdom 에는 IntersectionObserver 가 없어 스텁으로 교차를 직접 알린다.
*/

type StubObserver = {
  callback: IntersectionObserverCallback
  options: IntersectionObserverInit | undefined
  observed: Element[]
  disconnected: boolean
}

let observers: StubObserver[] = []

class IntersectionObserverStub {
  private readonly record: StubObserver

  constructor(
    callback: IntersectionObserverCallback,
    options?: IntersectionObserverInit,
  ) {
    this.record = { callback, options, observed: [], disconnected: false }
    observers.push(this.record)
  }

  observe(target: Element) {
    this.record.observed.push(target)
  }

  unobserve() {}

  disconnect() {
    this.record.disconnected = true
  }

  takeRecords() {
    return []
  }
}

const intersect = (isIntersecting: boolean) => {
  const observer = observers.at(-1)
  if (!observer) {
    throw new Error('관찰 중인 IntersectionObserver 가 없다')
  }

  act(() => {
    observer.callback(
      [{ isIntersecting } as IntersectionObserverEntry],
      {} as IntersectionObserver,
    )
  })
}

type HookProps = Parameters<typeof useLoadMoreSentinel>[0]

const renderSentinel = (overrides: Partial<HookProps> = {}) => {
  const onLoadMore = vi.fn()
  const initialProps: HookProps = {
    hasNextPage: true,
    isFetching: false,
    hasLoadMoreError: false,
    onLoadMore,
    ...overrides,
  }
  const hook = renderHook((props: HookProps) => useLoadMoreSentinel(props), {
    initialProps,
  })
  const node = document.createElement('div')

  act(() => {
    hook.result.current(node)
  })

  return { ...hook, node, onLoadMore, initialProps }
}

beforeEach(() => {
  observers = []
  vi.stubGlobal('IntersectionObserver', IntersectionObserverStub)
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('useLoadMoreSentinel', () => {
  it('observes the sentinel 400px ahead and loads once when it becomes visible', () => {
    const { node, onLoadMore } = renderSentinel()

    expect(observers).toHaveLength(1)
    expect(observers[0]!.observed).toEqual([node])
    expect(observers[0]!.options?.rootMargin).toBe('400px 0px')
    expect(onLoadMore).not.toHaveBeenCalled()

    intersect(true)

    expect(onLoadMore).toHaveBeenCalledTimes(1)
  })

  it('does not load while the sentinel is off screen', () => {
    const { onLoadMore } = renderSentinel()

    intersect(false)

    expect(onLoadMore).not.toHaveBeenCalled()
  })

  it('does not load while the list query is already fetching', () => {
    const { onLoadMore } = renderSentinel({ isFetching: true })

    intersect(true)

    expect(onLoadMore).not.toHaveBeenCalled()
  })

  it('does not load after a next-page failure until the user retries', () => {
    const { onLoadMore } = renderSentinel({ hasLoadMoreError: true })

    intersect(true)

    expect(onLoadMore).not.toHaveBeenCalled()
  })

  it('does not load when there is no next page', () => {
    const { onLoadMore } = renderSentinel({ hasNextPage: false })

    intersect(true)

    expect(onLoadMore).not.toHaveBeenCalled()
  })

  it('loads the following page when a fetch ends while the sentinel is still visible', () => {
    const { onLoadMore, rerender, initialProps } = renderSentinel()

    intersect(true)
    expect(onLoadMore).toHaveBeenCalledTimes(1)

    rerender({ ...initialProps, isFetching: true })
    expect(onLoadMore).toHaveBeenCalledTimes(1)

    // 짧은 쪽이 붙어 감시 요소가 그대로 화면 안이다 — 교차 이벤트가 다시 오지 않는다.
    rerender({ ...initialProps, isFetching: false })
    expect(onLoadMore).toHaveBeenCalledTimes(2)
  })

  it('uses the latest onLoadMore without re-observing', () => {
    const { rerender, initialProps } = renderSentinel()
    const nextOnLoadMore = vi.fn()

    rerender({ ...initialProps, onLoadMore: nextOnLoadMore })
    intersect(true)

    expect(observers).toHaveLength(1)
    expect(nextOnLoadMore).toHaveBeenCalledTimes(1)
    expect(initialProps.onLoadMore).not.toHaveBeenCalled()
  })

  it('disconnects when the sentinel is removed or the list unmounts', () => {
    const { result, unmount } = renderSentinel()

    act(() => {
      result.current(null)
    })
    expect(observers[0]!.disconnected).toBe(true)

    act(() => {
      result.current(document.createElement('div'))
    })
    expect(observers).toHaveLength(2)

    unmount()
    expect(observers[1]!.disconnected).toBe(true)
  })

  it('does nothing without IntersectionObserver support', () => {
    vi.stubGlobal('IntersectionObserver', undefined)

    expect(() => renderSentinel()).not.toThrow()
    expect(observers).toHaveLength(0)
  })
})

describe('useLoadMoreSentinel with a real useInfiniteQuery', () => {
  it('loads the next page once a background refetch ends while the sentinel stayed visible', async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const requested: number[] = []
    let releaseRefetch: (() => void) | null = null
    let holdNextRequest = false
    const queryFn = async ({ pageParam }: { pageParam: number }) => {
      requested.push(pageParam)

      if (holdNextRequest) {
        holdNextRequest = false
        await new Promise<void>(resolve => {
          releaseRefetch = resolve
        })
      }

      return { page: pageParam }
    }
    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(QueryClientProvider, { client }, children)
    const { result } = renderHook(
      () => {
        const query = useInfiniteQuery({
          queryKey: ['sentinel-refetch'],
          initialPageParam: 0,
          queryFn,
          getNextPageParam: (lastPage: { page: number }) =>
            lastPage.page < 5 ? lastPage.page + 1 : undefined,
        })
        const sentinelRef = useLoadMoreSentinel({
          hasNextPage: Boolean(query.hasNextPage),
          isFetching: query.isFetching,
          hasLoadMoreError: query.isFetchNextPageError,
          onLoadMore: () => {
            // 목록 페이지와 같은 호출 — 진행 중 요청을 취소하지 않는다.
            void query.fetchNextPage({ cancelRefetch: false })
          },
        })
        return { query, sentinelRef }
      },
      { wrapper },
    )

    await waitFor(() => {
      expect(result.current.query.data?.pages).toHaveLength(1)
    })

    act(() => {
      result.current.sentinelRef(document.createElement('div'))
    })

    // 무효화·재마운트 같은 백그라운드 refetch 가 진행 중이다.
    holdNextRequest = true
    act(() => {
      void result.current.query.refetch()
    })
    await waitFor(() => {
      expect(releaseRefetch).not.toBeNull()
    })

    // 그 사이 감시 요소가 보인다 — 다음 쪽 요청은 진행 중 refetch 에 흡수된다.
    intersect(true)

    await act(async () => {
      releaseRefetch?.()
    })

    // 감시 요소는 계속 화면 안이라 교차 알림이 다시 오지 않는다. refetch 가 끝난 순간 이어 불러야 한다.
    await waitFor(() => {
      expect(result.current.query.data?.pages).toHaveLength(2)
    })
    expect(requested).toEqual([0, 0, 1])
    client.clear()
  })
})
