// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useWriteFabCollapsed } from '@/hooks/use-write-fab-collapsed'

/*
  모바일 글쓰기 FAB 접기(community.md §S4 「목록 — 끊기지 않는 피드」 FAB)의 스크롤 구독 계약.
  방향 판정 자체는 lib/community/write-fab.test.ts 가 잠근다. 여기서는 passive 구독·rAF 묶음·정리를 본다.
*/

let frames: Array<FrameRequestCallback | null> = []

const flushFrames = () => {
  const pending = frames
  frames = []
  act(() => {
    pending.forEach(callback => callback?.(0))
  })
}

const scrollTo = (y: number) => {
  Object.defineProperty(window, 'scrollY', { configurable: true, value: y })
  window.dispatchEvent(new Event('scroll'))
}

beforeEach(() => {
  frames = []
  Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 })
  vi.stubGlobal(
    'requestAnimationFrame',
    vi.fn((callback: FrameRequestCallback) => {
      frames.push(callback)
      return frames.length
    }),
  )
  vi.stubGlobal(
    'cancelAnimationFrame',
    vi.fn((id: number) => {
      frames[id - 1] = null
    }),
  )
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('useWriteFabCollapsed', () => {
  it('subscribes to scroll passively', () => {
    const addEventListener = vi.spyOn(window, 'addEventListener')

    renderHook(() => useWriteFabCollapsed(true))

    expect(addEventListener).toHaveBeenCalledWith(
      'scroll',
      expect.any(Function),
      { passive: true },
    )
  })

  it('collapses on scrolling down and expands on scrolling up, once per animation frame', () => {
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 200 })
    const { result } = renderHook(() => useWriteFabCollapsed(true))

    expect(result.current).toBe(false)

    scrollTo(204)
    scrollTo(212)
    scrollTo(240)
    // 한 프레임에 스크롤 이벤트가 여러 번 와도 계산은 한 번이다.
    expect(frames).toHaveLength(1)
    expect(result.current).toBe(false)

    flushFrames()
    expect(result.current).toBe(true)

    scrollTo(220)
    flushFrames()
    expect(result.current).toBe(false)
  })

  it('expands near the top of the page', () => {
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 400 })
    const { result } = renderHook(() => useWriteFabCollapsed(true))

    scrollTo(600)
    flushFrames()
    expect(result.current).toBe(true)

    scrollTo(60)
    flushFrames()
    expect(result.current).toBe(false)
  })

  it('stays expanded and does not subscribe when disabled (≥480 or before measuring)', () => {
    const addEventListener = vi.spyOn(window, 'addEventListener')
    const { result } = renderHook(() => useWriteFabCollapsed(false))

    scrollTo(600)

    expect(addEventListener).not.toHaveBeenCalledWith(
      'scroll',
      expect.any(Function),
      expect.anything(),
    )
    expect(frames).toHaveLength(0)
    expect(result.current).toBe(false)
  })

  it('expands again and unsubscribes when it is disabled after collapsing', () => {
    const removeEventListener = vi.spyOn(window, 'removeEventListener')
    const { result, rerender } = renderHook(
      ({ enabled }) => useWriteFabCollapsed(enabled),
      { initialProps: { enabled: true } },
    )

    scrollTo(600)
    flushFrames()
    expect(result.current).toBe(true)

    rerender({ enabled: false })

    expect(result.current).toBe(false)
    expect(removeEventListener).toHaveBeenCalledWith(
      'scroll',
      expect.any(Function),
    )
  })

  it('cancels a pending frame on unmount', () => {
    const { unmount } = renderHook(() => useWriteFabCollapsed(true))

    scrollTo(600)
    unmount()

    expect(window.cancelAnimationFrame).toHaveBeenCalledWith(1)
  })
})
