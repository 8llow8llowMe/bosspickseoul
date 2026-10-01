// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react'
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
    isFetchingNextPage: false,
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

  it('does not load while the next page is already fetching', () => {
    const { onLoadMore } = renderSentinel({ isFetchingNextPage: true })

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

    rerender({ ...initialProps, isFetchingNextPage: true })
    expect(onLoadMore).toHaveBeenCalledTimes(1)

    // 짧은 쪽이 붙어 감시 요소가 그대로 화면 안이다 — 교차 이벤트가 다시 오지 않는다.
    rerender({ ...initialProps, isFetchingNextPage: false })
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
