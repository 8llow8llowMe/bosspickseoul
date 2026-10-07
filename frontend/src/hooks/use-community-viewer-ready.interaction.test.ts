// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useCommunityViewerReady } from '@/hooks/use-community-viewer-ready'
import { COMMUNITY_VIEWER_WAIT_LIMIT_MS } from '@/lib/community/community-state'

/*
  공개 목록·상세가 로그인 확인(`/api/auth/me`)을 기다리는 상한(#530 후속). 확인이 멈춰도
  상한이 지나면 익명으로 보고 쿼리를 시작한다 — 수 분간 스켈레톤에 갇히지 않게.
*/

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('useCommunityViewerReady', () => {
  it('waits for hydration until the limit, then lets anonymous queries start', () => {
    const { result } = renderHook(() => useCommunityViewerReady(false, false))

    expect(result.current).toBe(false)

    act(() => {
      vi.advanceTimersByTime(COMMUNITY_VIEWER_WAIT_LIMIT_MS - 1)
    })
    expect(result.current).toBe(false)

    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(result.current).toBe(true)
  })

  it('is ready as soon as hydration ends, and stops the timer', () => {
    const { result, rerender } = renderHook(
      ({ hasHydrated }) => useCommunityViewerReady(false, hasHydrated),
      { initialProps: { hasHydrated: false } },
    )

    rerender({ hasHydrated: true })
    expect(result.current).toBe(true)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('does not wait in mock mode', () => {
    const { result } = renderHook(() => useCommunityViewerReady(true, false))

    expect(result.current).toBe(true)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('clears the timer on unmount', () => {
    const { unmount } = renderHook(() => useCommunityViewerReady(false, false))

    expect(vi.getTimerCount()).toBe(1)
    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })
})
