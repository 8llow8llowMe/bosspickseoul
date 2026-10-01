import { describe, expect, it } from 'vitest'

import {
  COMMUNITY_RECENT_REGIONS_KEY,
  COMMUNITY_RECENT_REGIONS_LIMIT,
  addCommunityRecentRegion,
  clearCommunityRecentRegions,
  parseCommunityRecentRegions,
  readCommunityRecentRegions,
  saveCommunityRecentRegion,
  type CommunityRecentRegion,
} from './recent-regions'

/*
  좌 내비 「최근 본 지역」(community.md §S4 「목록 3단」, CM-040) 저장 규칙.
  지역 게시판을 열 때마다 최근 순으로 최대 5개, 같은 대상은 앞으로 옮긴다.
*/

const seongdong: CommunityRecentRegion = {
  targetType: 'DISTRICT',
  targetCode: '11200',
  targetName: '성동구',
}
const seongsu: CommunityRecentRegion = {
  targetType: 'ADMINISTRATION',
  targetCode: '1120065000',
  targetName: '성수1가1동',
}

const region = (index: number): CommunityRecentRegion => ({
  targetType: 'DISTRICT',
  targetCode: `1100${index}`,
  targetName: `구${index}`,
})

const createStorage = (initial: Record<string, string> = {}) => {
  const values = new Map(Object.entries(initial))

  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value)
    },
  }
}

describe('addCommunityRecentRegion', () => {
  it('puts the newest region first', () => {
    expect(addCommunityRecentRegion([seongdong], seongsu)).toEqual([
      seongsu,
      seongdong,
    ])
  })

  it('moves an already-seen region to the front instead of duplicating it', () => {
    const renamed = { ...seongdong, targetName: '성동구(새 이름)' }

    expect(addCommunityRecentRegion([seongsu, seongdong], renamed)).toEqual([
      renamed,
      seongsu,
    ])
  })

  it('treats the same code under another target type as a different region', () => {
    const sameCode = { ...seongsu, targetType: 'COMMERCIAL' as const }

    expect(addCommunityRecentRegion([seongsu], sameCode)).toEqual([
      sameCode,
      seongsu,
    ])
  })

  it('keeps at most five regions and drops the oldest', () => {
    const five = [region(1), region(2), region(3), region(4), region(5)]
    const next = addCommunityRecentRegion(five, region(6))

    expect(COMMUNITY_RECENT_REGIONS_LIMIT).toBe(5)
    expect(next).toHaveLength(5)
    expect(next.map(item => item.targetCode)).toEqual([
      '11006',
      '11001',
      '11002',
      '11003',
      '11004',
    ])
  })
})

describe('parseCommunityRecentRegions', () => {
  it('returns an empty list for missing or broken JSON', () => {
    expect(parseCommunityRecentRegions(null)).toEqual([])
    expect(parseCommunityRecentRegions('{')).toEqual([])
    expect(parseCommunityRecentRegions('{"targetType":"DISTRICT"}')).toEqual([])
  })

  it('drops malformed entries and caps the list at five', () => {
    const raw = JSON.stringify([
      seongdong,
      { targetType: 'CITY', targetCode: '1', targetName: '서울' },
      { targetType: 'DISTRICT', targetCode: '', targetName: '빈 코드' },
      { targetType: 'DISTRICT', targetCode: '11010', targetName: '' },
      null,
      region(1),
      region(2),
      region(3),
      region(4),
      region(5),
    ])

    expect(parseCommunityRecentRegions(raw)).toEqual([
      seongdong,
      region(1),
      region(2),
      region(3),
      region(4),
    ])
  })
})

describe('read/saveCommunityRecentRegion', () => {
  it('saves under the community-recent-regions key, newest first', () => {
    const storage = createStorage()

    saveCommunityRecentRegion(storage, seongdong)
    const saved = saveCommunityRecentRegion(storage, seongsu)

    expect(COMMUNITY_RECENT_REGIONS_KEY).toBe('community-recent-regions')
    expect(saved).toEqual([seongsu, seongdong])
    expect(readCommunityRecentRegions(storage)).toEqual([seongsu, seongdong])
    expect(
      JSON.parse(storage.values.get(COMMUNITY_RECENT_REGIONS_KEY)!),
    ).toEqual([seongsu, seongdong])
  })

  it('never throws when storage is unavailable', () => {
    const throwing = {
      getItem: () => {
        throw new Error('SecurityError')
      },
      setItem: () => {
        throw new Error('QuotaExceededError')
      },
    }

    expect(readCommunityRecentRegions(throwing)).toEqual([])
    // 쓰기에 실패해도 이번 화면에서는 방금 본 지역을 보여 준다.
    expect(saveCommunityRecentRegion(throwing, seongdong)).toEqual([seongdong])
  })
})

describe('clearCommunityRecentRegions — 로그아웃', () => {
  it('removes only the recent regions key', () => {
    const values = new Map([
      [COMMUNITY_RECENT_REGIONS_KEY, JSON.stringify([seongdong])],
      ['keep-me', '1'],
    ])

    clearCommunityRecentRegions(() => ({
      removeItem: (key: string) => {
        values.delete(key)
      },
    }))

    expect(values.has(COMMUNITY_RECENT_REGIONS_KEY)).toBe(false)
    expect(values.get('keep-me')).toBe('1')
  })

  it('never throws when storage is missing or blocked', () => {
    expect(() => clearCommunityRecentRegions(() => null)).not.toThrow()
    expect(() =>
      clearCommunityRecentRegions(() => {
        throw new Error('SecurityError')
      }),
    ).not.toThrow()
    expect(() =>
      clearCommunityRecentRegions(() => ({
        removeItem: () => {
          throw new Error('SecurityError')
        },
      })),
    ).not.toThrow()
  })
})
