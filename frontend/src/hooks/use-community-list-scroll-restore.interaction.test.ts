// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react'
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import { useCommunityListScrollRestore } from '@/hooks/use-community-list-scroll-restore'
import {
  saveCommunityListScroll,
  type CommunityListScrollSnapshot,
} from '@/lib/community/list-scroll'

/*
  목록 → 상세 → 뒤로(community.md §S4 「목록 — 끊기지 않는 피드」 뒤로 가기, CM-030).
  목록이 다시 그려진 뒤 한 번만, 같은 목록일 때만, 브라우저 뒤로/앞으로로 왔을 때만 보던 자리로
  돌아오는지 실제 DOM 에서 본다.

  popstate 기억은 모듈 하나가 탭 전체에서 쓴다. 테스트끼리 섞이지 않게 시계(Date)만 가짜로 두고
  테스트마다 한참 뒤로 옮긴다 — 앞 테스트의 popstate 가 「방금」 으로 보이지 않는다.
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

let snapshot: CommunityListScrollSnapshot

/** 브라우저 뒤로/앞으로로 목록에 돌아온다 — 마운트 직전 popstate. */
const traverseHistory = () => {
  window.dispatchEvent(new PopStateEvent('popstate'))
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

/*
  Next App Router 의 popstate 리스너 자리. 라우터는 앱이 뜰 때 리스너를 걸어 목록의 구독보다 **먼저**
  불린다. 쿼리 캐시가 있으면 그 리스너 안에서 목록이 동기로 다시 그려지고 마운트 이펙트까지 끝난다
  (e2e CM-030 에서 실측). 이 파일의 다른 구독보다 먼저 걸리도록 모듈 최상단에서 건다.
*/
let renderInsideRouterPopstate: (() => void) | null = null
window.addEventListener('popstate', () => {
  renderInsideRouterPopstate?.()
})

let scrollTo: ReturnType<typeof vi.fn>

beforeAll(() => {
  // 실제로는 목록을 먼저 거쳐 상세로 간다 — 그 마운트가 popstate 구독을 건다.
  renderRestore({ contextKey: 'ctx-warmup', status: 'loading' })
  cleanup()
})

let clock = Date.UTC(2026, 9, 1)

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  clock += 60 * 60 * 1000
  vi.setSystemTime(clock)
  snapshot = {
    contextKey: 'ctx-latest',
    postId: '42',
    rowOffset: 240,
    savedAt: Date.now(),
  }
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
  renderInsideRouterPopstate = null
  cleanup()
  document.body.innerHTML = ''
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('useCommunityListScrollRestore', () => {
  it('waits for the first page, then puts the clicked row back where it was', () => {
    saveCommunityListScroll(window.sessionStorage, snapshot)
    addRow('42', 2000)
    traverseHistory()
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

  it('restores when the router re-renders the list inside its own popstate listener', () => {
    saveCommunityListScroll(window.sessionStorage, snapshot)
    addRow('42', 2000)
    renderInsideRouterPopstate = () => {
      renderRestore({ contextKey: 'ctx-latest', status: 'ready' })
    }

    // 목록 마운트(이펙트 포함)가 popstate 를 기억하는 구독보다 먼저 끝난다.
    traverseHistory()
    flushFrames()

    expect(scrollTo).toHaveBeenCalledWith({ top: 1760, behavior: 'instant' })
  })

  it('stays at the top and drops the snapshot when the row is not rendered (cache collected)', () => {
    saveCommunityListScroll(window.sessionStorage, snapshot)
    traverseHistory()
    renderRestore({ contextKey: 'ctx-latest', status: 'ready' })

    flushFrames()

    expect(scrollTo).not.toHaveBeenCalled()
    expect(window.sessionStorage.length).toBe(0)
  })

  it('does not restore on a regular entry such as the header link, and keeps the snapshot', () => {
    saveCommunityListScroll(window.sessionStorage, snapshot)
    addRow('42', 2000)
    renderRestore({ contextKey: 'ctx-latest', status: 'ready' })

    flushFrames()

    expect(scrollTo).not.toHaveBeenCalled()
    // 그 뒤 뒤로 두 번 눌러 원래 목록 기록으로 돌아가면 그 목록이 쓴다.
    expect(window.sessionStorage.length).toBe(1)
  })

  it('does not restore when the last popstate is no longer recent', () => {
    saveCommunityListScroll(window.sessionStorage, snapshot)
    addRow('42', 2000)
    traverseHistory()
    vi.setSystemTime(Date.now() + 1001)
    renderRestore({ contextKey: 'ctx-latest', status: 'ready' })

    flushFrames()

    expect(scrollTo).not.toHaveBeenCalled()
  })

  it('remembers the traversal from mount even if the first page arrives later', () => {
    saveCommunityListScroll(window.sessionStorage, snapshot)
    addRow('42', 2000)
    traverseHistory()
    const { rerender } = renderRestore({
      contextKey: 'ctx-latest',
      status: 'loading',
    })
    // 마운트 다음 프레임에 뒤로 가기 여부가 굳는다.
    flushFrames()

    // 첫 쪽 응답이 1초 넘게 걸렸다 — 뒤로 가기로 들어온 사실은 그 프레임에서 이미 정해졌다.
    vi.setSystemTime(Date.now() + 5000)
    rerender({ contextKey: 'ctx-latest', status: 'ready' })
    flushFrames()

    expect(scrollTo).toHaveBeenCalledWith({ top: 1760, behavior: 'instant' })
  })

  it('restores only once per visit', () => {
    saveCommunityListScroll(window.sessionStorage, snapshot)
    addRow('42', 2000)
    traverseHistory()
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
    addRow('42', 2000)
    traverseHistory()
    renderRestore(
      { contextKey: 'ctx-latest', status: 'ready' },
      { reactStrictMode: true },
    )

    // 이펙트 → 정리(첫 프레임 취소) → 이펙트. 판정·복원 이펙트가 각각 두 번 프레임을 잡고,
    // 살아남은 두 번째 프레임들이 복원해야 한다.
    expect(window.requestAnimationFrame).toHaveBeenCalledTimes(4)
    flushFrames()

    expect(scrollTo).toHaveBeenCalledTimes(1)
  })

  it('leaves another list context alone', () => {
    saveCommunityListScroll(window.sessionStorage, snapshot)
    traverseHistory()
    renderRestore({ contextKey: 'ctx-popular', status: 'ready' })

    flushFrames()

    expect(scrollTo).not.toHaveBeenCalled()
    expect(window.sessionStorage.length).toBe(1)
  })

  it.each(['empty', 'error'] as const)(
    'discards the snapshot without scrolling when the list is %s',
    status => {
      saveCommunityListScroll(window.sessionStorage, snapshot)
      traverseHistory()
      renderRestore({ contextKey: 'ctx-latest', status })

      flushFrames()

      expect(scrollTo).not.toHaveBeenCalled()
      expect(window.sessionStorage.length).toBe(0)
    },
  )

  it('does nothing when there is no snapshot', () => {
    traverseHistory()
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
      traverseHistory()
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
