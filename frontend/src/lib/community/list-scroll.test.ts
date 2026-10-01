import { describe, expect, it } from 'vitest'

import {
  COMMUNITY_LIST_SCROLL_TTL_MS,
  clearCommunityListScroll,
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
  scrollY: 1800,
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
      JSON.stringify({ ...snapshot, scrollY: 'far' }),
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

  it('falls back to the saved scroll position when the row is gone', () => {
    expect(getCommunityListScrollTop(snapshot, null)).toBe(1800)
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
