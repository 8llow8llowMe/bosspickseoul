// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useCommunityListScrollRestore } from '@/hooks/use-community-list-scroll-restore'
import {
  saveCommunityListScroll,
  type CommunityListScrollSnapshot,
} from '@/lib/community/list-scroll'

/*
  목록 → 상세 → 뒤로(community.md §S4 「목록 — 끊기지 않는 피드」 뒤로 가기, CM-030).
  목록이 다시 그려진 뒤 한 번만, 같은 목록일 때만 보던 자리로 돌아오는지 실제 DOM 에서 본다.
*/

type Status = 'loading' | 'error' | 'empty' | 'ready'

let frames: Array<FrameRequestCallback | null> = []

const flushFrames = () => {
  const pending = frames
  frames = []
  act(() => {
    pending.forEach(callback => callback?.(0))
  })
}

const snapshot: CommunityListScrollSnapshot = {
  contextKey: 'ctx-latest',
  postId: '42',
  scrollY: 1800,
  rowOffset: 240,
  savedAt: Date.now(),
}

const addRow = (postId: string, documentTop: number) => {
  const row = document.createElement('a')
  row.setAttribute('data-community-post-id', postId)
  row.getBoundingClientRect = () =>
    ({ top: documentTop - window.scrollY }) as DOMRect
  document.body.append(row)
  return row
}

const renderRestore = (
  initialProps: { contextKey: string; status: Status },
  { reactStrictMode = false }: { reactStrictMode?: boolean } = {},
) =>
  renderHook(
    (props: { contextKey: string; status: Status }) =>
      useCommunityListScrollRestore(props),
    // `wrapper` 로 StrictMode 를 감싸면 이 환경에서 이펙트가 두 번 돌지 않는다 — 루트 옵션을 쓴다.
    { initialProps, reactStrictMode },
  )

let scrollTo: ReturnType<typeof vi.fn>

beforeEach(() => {
  frames = []
  window.sessionStorage.clear()
  Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 })
  scrollTo = vi.fn()
  vi.stubGlobal('scrollTo', scrollTo)
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
  document.body.innerHTML = ''
  vi.unstubAllGlobals()
})

describe('useCommunityListScrollRestore', () => {
  it('waits for the first page, then puts the clicked row back where it was', () => {
    saveCommunityListScroll(window.sessionStorage, snapshot)
    addRow('42', 2000)
    const { rerender } = renderRestore({
      contextKey: 'ctx-latest',
      status: 'loading',
    })

    flushFrames()
    expect(scrollTo).not.toHaveBeenCalled()

    rerender({ contextKey: 'ctx-latest', status: 'ready' })
    flushFrames()

    expect(scrollTo).toHaveBeenCalledTimes(1)
    expect(scrollTo).toHaveBeenCalledWith({ top: 1760, behavior: 'instant' })
    expect(window.sessionStorage.length).toBe(0)
  })

  it('falls back to the saved scroll position when the row is not rendered', () => {
    saveCommunityListScroll(window.sessionStorage, snapshot)
    renderRestore({ contextKey: 'ctx-latest', status: 'ready' })

    flushFrames()

    expect(scrollTo).toHaveBeenCalledWith({ top: 1800, behavior: 'instant' })
  })

  it('restores only once per visit', () => {
    saveCommunityListScroll(window.sessionStorage, snapshot)
    const { rerender } = renderRestore({
      contextKey: 'ctx-latest',
      status: 'ready',
    })

    flushFrames()
    // 같은 목록에서 다시 저장된 자리가 생겨도(다른 탭 등) 이 방문에서는 다시 끌어오지 않는다.
    saveCommunityListScroll(window.sessionStorage, snapshot)
    rerender({ contextKey: 'ctx-popular', status: 'ready' })
    rerender({ contextKey: 'ctx-latest', status: 'ready' })
    flushFrames()

    expect(scrollTo).toHaveBeenCalledTimes(1)
  })

  it('still restores under StrictMode double effects', () => {
    saveCommunityListScroll(window.sessionStorage, snapshot)
    renderRestore(
      { contextKey: 'ctx-latest', status: 'ready' },
      { reactStrictMode: true },
    )

    // 이펙트 → 정리(첫 프레임 취소) → 이펙트. 두 번째 프레임이 복원해야 한다.
    expect(window.requestAnimationFrame).toHaveBeenCalledTimes(2)
    flushFrames()

    expect(scrollTo).toHaveBeenCalledTimes(1)
  })

  it('leaves another list context alone', () => {
    saveCommunityListScroll(window.sessionStorage, snapshot)
    renderRestore({ contextKey: 'ctx-popular', status: 'ready' })

    flushFrames()

    expect(scrollTo).not.toHaveBeenCalled()
    expect(window.sessionStorage.length).toBe(1)
  })

  it.each(['empty', 'error'] as const)(
    'discards the snapshot without scrolling when the list is %s',
    status => {
      saveCommunityListScroll(window.sessionStorage, snapshot)
      renderRestore({ contextKey: 'ctx-latest', status })

      flushFrames()

      expect(scrollTo).not.toHaveBeenCalled()
      expect(window.sessionStorage.length).toBe(0)
    },
  )

  it('does nothing when there is no snapshot', () => {
    renderRestore({ contextKey: 'ctx-latest', status: 'ready' })

    flushFrames()

    expect(scrollTo).not.toHaveBeenCalled()
  })

  it('never throws when sessionStorage is blocked', () => {
    const descriptor = Object.getOwnPropertyDescriptor(window, 'sessionStorage')
    Object.defineProperty(window, 'sessionStorage', {
      configurable: true,
      get: () => {
        throw new Error('SecurityError')
      },
    })

    try {
      renderRestore({ contextKey: 'ctx-latest', status: 'ready' })
      expect(() => flushFrames()).not.toThrow()
      expect(scrollTo).not.toHaveBeenCalled()
    } finally {
      if (descriptor) {
        Object.defineProperty(window, 'sessionStorage', descriptor)
      } else {
        // jsdom 은 프로토타입 getter 다 — 덮은 자기 속성만 지우면 원래 것이 돌아온다.
        Reflect.deleteProperty(window, 'sessionStorage')
      }
    }
  })
})
