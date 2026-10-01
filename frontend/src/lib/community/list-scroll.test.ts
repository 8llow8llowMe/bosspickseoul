import { describe, expect, it } from 'vitest'

import {
  COMMUNITY_HISTORY_TRAVERSAL_WINDOW_MS,
  COMMUNITY_LIST_SCROLL_TTL_MS,
  clearCommunityListScroll,
  createHistoryTraversalTracker,
  getCommunityListScrollStep,
  getCommunityListScrollTop,
  readCommunityListScroll,
  saveCommunityListScroll,
  type CommunityListScrollSnapshot,
} from './list-scroll'

/*
  목록 → 상세 → 뒤로(community.md §S4 「목록 — 끊기지 않는 피드」 뒤로 가기, CM-030).
  글 행을 누를 때 남긴 자리로 한 번만 돌아온다.
*/

const createStorage = (initial: Record<string, string> = {}) => {
  const values = new Map(Object.entries(initial))

  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value)
    },
    removeItem: (key: string) => {
      values.delete(key)
    },
  }
}

const throwingStorage = {
  getItem: () => {
    throw new Error('SecurityError')
  },
  setItem: () => {
    throw new Error('QuotaExceededError')
  },
  removeItem: () => {
    throw new Error('SecurityError')
  },
}

const snapshot: CommunityListScrollSnapshot = {
  contextKey: 'ctx-latest',
  postId: '42',
  rowOffset: 240,
  savedAt: 1_000_000,
}

describe('community list scroll snapshot', () => {
  it('round-trips a snapshot for the same list context', () => {
    const storage = createStorage()

    expect(saveCommunityListScroll(storage, snapshot)).toBe(true)
    expect(
      readCommunityListScroll(storage, {
        contextKey: 'ctx-latest',
        now: snapshot.savedAt + 1000,
      }),
    ).toEqual(snapshot)
  })

  it('ignores a snapshot from another list context and leaves it for that list', () => {
    const storage = createStorage()
    saveCommunityListScroll(storage, snapshot)

    expect(
      readCommunityListScroll(storage, {
        contextKey: 'ctx-popular',
        now: snapshot.savedAt,
      }),
    ).toBeNull()
    expect(storage.values.size).toBe(1)
  })

  it('keeps a snapshot only as long as React Query keeps the inactive list (gcTime default 5 min)', () => {
    // 복원은 캐시가 불러온 쪽을 들고 있을 때만 의미가 있다. 캐시 수명은 staleTime 이 아니라 gcTime 이다.
    expect(COMMUNITY_LIST_SCROLL_TTL_MS).toBe(5 * 60 * 1000)
  })

  it('drops an expired snapshot', () => {
    const storage = createStorage()
    saveCommunityListScroll(storage, snapshot)

    expect(
      readCommunityListScroll(storage, {
        contextKey: 'ctx-latest',
        now: snapshot.savedAt + COMMUNITY_LIST_SCROLL_TTL_MS + 1,
      }),
    ).toBeNull()
    expect(storage.values.size).toBe(0)
  })

  it('rejects malformed values instead of scrolling to garbage', () => {
    const malformed = [
      'not json',
      JSON.stringify({ ...snapshot, savedAt: 'yesterday' }),
      JSON.stringify({ ...snapshot, postId: 42 }),
      JSON.stringify({ ...snapshot, rowOffset: Number.NaN }),
      JSON.stringify(null),
    ]

    for (const raw of malformed) {
      const storage = createStorage({ 'community-list-scroll': raw })
      expect(
        readCommunityListScroll(storage, {
          contextKey: 'ctx-latest',
          now: snapshot.savedAt,
        }),
      ).toBeNull()
    }
  })

  it('never throws when storage is unavailable', () => {
    expect(saveCommunityListScroll(throwingStorage, snapshot)).toBe(false)
    expect(
      readCommunityListScroll(throwingStorage, {
        contextKey: 'ctx-latest',
        now: snapshot.savedAt,
      }),
    ).toBeNull()
    expect(() => clearCommunityListScroll(throwingStorage)).not.toThrow()
  })

  it('clears the snapshot so it restores only once', () => {
    const storage = createStorage()
    saveCommunityListScroll(storage, snapshot)
    clearCommunityListScroll(storage)

    expect(storage.values.size).toBe(0)
  })
})

describe('getCommunityListScrollTop', () => {
  it('puts the clicked row back at the same viewport offset when it is rendered', () => {
    // 행이 문서 2000px 에 있고 누를 때 화면 위에서 240px 이었다 → 1760 으로 스크롤.
    expect(getCommunityListScrollTop(snapshot, 2000)).toBe(1760)
  })

  it('does not restore when the row is gone — the cache was collected, so stay at the top', () => {
    // 옛 scrollY 로 가면 첫 쪽만 다시 받은 목록의 엉뚱한 글에 떨어진다.
    expect(getCommunityListScrollTop(snapshot, null)).toBeNull()
  })

  it('never scrolls above the top of the page', () => {
    expect(getCommunityListScrollTop(snapshot, 100)).toBe(0)
  })
})

describe('getCommunityListScrollStep', () => {
  it('waits for the first page, restores on posts, and discards when there is nothing to return to', () => {
    expect(getCommunityListScrollStep('loading')).toBe('wait')
    expect(getCommunityListScrollStep('ready')).toBe('restore')
    expect(getCommunityListScrollStep('empty')).toBe('discard')
    expect(getCommunityListScrollStep('error')).toBe('discard')
  })
})

describe('createHistoryTraversalTracker', () => {
  const createTarget = () => {
    const target = new EventTarget()
    const addEventListener = target.addEventListener.bind(target)
    let subscriptions = 0

    return {
      target: {
        addEventListener: ((
          ...args: Parameters<EventTarget['addEventListener']>
        ) => {
          subscriptions += 1
          addEventListener(...args)
        }) as EventTarget['addEventListener'],
      },
      popstate: () => target.dispatchEvent(new Event('popstate')),
      subscriptions: () => subscriptions,
    }
  }

  it('reports a history traversal only shortly after a popstate', () => {
    let now = 10_000
    const tracker = createHistoryTraversalTracker(() => now)
    const { target, popstate } = createTarget()

    tracker.start(target)
    expect(tracker.wasRecent()).toBe(false)

    popstate()
    now += COMMUNITY_HISTORY_TRAVERSAL_WINDOW_MS
    expect(tracker.wasRecent()).toBe(true)

    now += 1
    expect(tracker.wasRecent()).toBe(false)
  })

  it('subscribes once no matter how many lists mount', () => {
    const tracker = createHistoryTraversalTracker(() => 0)
    const { target, subscriptions } = createTarget()

    tracker.start(target)
    tracker.start(target)

    expect(subscriptions()).toBe(1)
  })
})
