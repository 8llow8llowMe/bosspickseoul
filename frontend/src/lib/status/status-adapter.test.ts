import { describe, expect, it } from 'vitest'

import {
  isStatusTopTenAllEmpty,
  normalizeStatusRankings,
  normalizeStatusTopTen,
  selectStatusTopTen,
} from './status-adapter'
import type { DistrictRankingSummary } from '@/types/status'

describe('normalizeStatusTopTen', () => {
  it('maps foot traffic items to ranked status items', () => {
    const result = normalizeStatusTopTen({
      footTrafficTopTenItems: [
        {
          districtCode: '11680',
          districtName: '강남구',
          totalFootTraffic: 5_847_230,
          footTrafficChangeRate: 12.5,
        },
      ],
      salesTopTenItems: [],
      openedStoreTopTenItems: [],
      closedStoreTopTenItems: [],
    })

    expect(result.footTraffic).toEqual([
      {
        rank: 1,
        districtCode: '11680',
        districtName: '강남구',
        value: 5_847_230,
        changeRate: 12.5,
      },
    ])
  })

  it('maps sales items to ranked status items', () => {
    const result = normalizeStatusTopTen({
      footTrafficTopTenItems: [],
      salesTopTenItems: [
        {
          districtCode: '11680',
          districtName: '강남구',
          totalSalesAmount: 15_847_230_000,
          salesChangeRate: -5.6,
        },
      ],
      openedStoreTopTenItems: [],
      closedStoreTopTenItems: [],
    })

    expect(result.sales).toEqual([
      {
        rank: 1,
        districtCode: '11680',
        districtName: '강남구',
        value: 15_847_230_000,
        changeRate: -5.6,
      },
    ])
  })

  it('maps opened-store items to ranked status items', () => {
    const result = normalizeStatusTopTen({
      footTrafficTopTenItems: [],
      salesTopTenItems: [],
      openedStoreTopTenItems: [
        {
          districtCode: '11680',
          districtName: '강남구',
          openedStoreCount: 1_523,
          openingChangeRate: 8.5,
        },
      ],
      closedStoreTopTenItems: [],
    })

    expect(result.opened).toEqual([
      {
        rank: 1,
        districtCode: '11680',
        districtName: '강남구',
        value: 1_523,
        changeRate: 8.5,
      },
    ])
  })

  it('maps closed-store items to ranked status items and limits them to ten', () => {
    const result = normalizeStatusTopTen({
      footTrafficTopTenItems: [],
      salesTopTenItems: [],
      openedStoreTopTenItems: [],
      closedStoreTopTenItems: Array.from({ length: 11 }, (_, index) => ({
        districtCode: String(index),
        districtName: `자치구 ${index}`,
        closedStoreCount: index * 10,
        closureChangeRate: index,
      })),
    })

    expect(result.closed).toHaveLength(10)
    expect(result.closed[9]).toEqual({
      rank: 10,
      districtCode: '9',
      districtName: '자치구 9',
      value: 90,
      changeRate: 9,
    })
  })

  it('returns empty arrays for every metric when the API has no top-ten items', () => {
    expect(
      normalizeStatusTopTen({
        footTrafficTopTenItems: [],
        salesTopTenItems: [],
        openedStoreTopTenItems: [],
        closedStoreTopTenItems: [],
      }),
    ).toEqual({ footTraffic: [], sales: [], opened: [], closed: [] })
  })

  /*
   * H-2. 백엔드가 200 을 주면서 배열 하나를 통째로 누락시킬 수 있다. 이 어댑터는
   * 이제 `/status` 뿐 아니라 홈 랜딩(popular-districts, metric-ranking-board)
   * 에서도 쓰이므로, 방어 없이 `.slice()` 를 부르면 두 화면 모두 렌더 중
   * TypeError 로 죽는다.
   */
  it('배열 하나가 통째로 빠져도(undefined) 죽지 않고 빈 배열로 취급한다', () => {
    const malformed = {
      footTrafficTopTenItems: undefined,
      salesTopTenItems: [],
      openedStoreTopTenItems: [],
      closedStoreTopTenItems: [],
    } as unknown as Parameters<typeof normalizeStatusTopTen>[0]

    expect(() => normalizeStatusTopTen(malformed)).not.toThrow()
    expect(normalizeStatusTopTen(malformed).footTraffic).toEqual([])
  })
})

/*
 * 200 + 네 배열 전부 빈 응답은 「데이터가 아직 없어요」가 아니라 데이터 공급 장애다.
 * 2026-09-11 dev 에서 실제로 일어났고, 화면이 정상 빈 상태로 렌더돼 장애 인지가
 * 늦었다(#371). 서울 자치구는 25개 고정이라 전 지표 동시 0건은 정상일 수 없다.
 */
describe('isStatusTopTenAllEmpty', () => {
  const empty = normalizeStatusTopTen({
    footTrafficTopTenItems: [],
    salesTopTenItems: [],
    openedStoreTopTenItems: [],
    closedStoreTopTenItems: [],
  })

  it('네 지표가 모두 비면 장애로 본다', () => {
    expect(isStatusTopTenAllEmpty(empty)).toBe(true)
  })

  it('한 지표라도 값이 있으면 장애가 아니다', () => {
    const partial = normalizeStatusTopTen({
      footTrafficTopTenItems: [],
      salesTopTenItems: [],
      openedStoreTopTenItems: [],
      closedStoreTopTenItems: [
        {
          districtCode: '11680',
          districtName: '강남구',
          closedStoreCount: 12,
          closureChangeRate: -3.1,
        },
      ],
    })

    expect(isStatusTopTenAllEmpty(partial)).toBe(false)
  })
})

/*
 * 전체 순위(`GET /districts/rankings`, #542). Top10 어댑터와 다른 두 가지 — 응답 `rank` 를 그대로 쓰고,
 * 변화율 null 을 0 으로 바꾸지 않는다 — 를 고정한다.
 */
describe('normalizeStatusRankings', () => {
  const emptySummary: DistrictRankingSummary = {
    footTrafficRankings: [],
    salesRankings: [],
    openedStoreRankings: [],
    closedStoreRankings: [],
  }

  it('동점 순위를 배열 위치로 다시 매기지 않고 응답 rank 그대로 둔다', () => {
    const result = normalizeStatusRankings({
      ...emptySummary,
      salesRankings: [
        {
          rank: 1,
          districtCode: '11680',
          districtName: '강남구',
          totalSalesAmount: 300,
          salesChangeRate: 5.3,
        },
        {
          rank: 2,
          districtCode: '11650',
          districtName: '서초구',
          totalSalesAmount: 200,
          salesChangeRate: -1.2,
        },
        {
          rank: 2,
          districtCode: '11710',
          districtName: '송파구',
          totalSalesAmount: 200,
          salesChangeRate: 0,
        },
        {
          rank: 4,
          districtCode: '11440',
          districtName: '마포구',
          totalSalesAmount: 100,
          salesChangeRate: 1,
        },
      ],
    })

    expect(result.sales.map(item => item.rank)).toEqual([1, 2, 2, 4])
    expect(result.sales[2]).toEqual({
      rank: 2,
      districtCode: '11710',
      districtName: '송파구',
      value: 200,
      changeRate: 0,
    })
  })

  it('변화율 null 은 0 으로 채우지 않고 null 로 둔다', () => {
    const result = normalizeStatusRankings({
      ...emptySummary,
      footTrafficRankings: [
        {
          rank: 1,
          districtCode: '11680',
          districtName: '강남구',
          totalFootTraffic: 100,
          footTrafficChangeRate: null,
        },
      ],
      openedStoreRankings: [
        {
          rank: 1,
          districtCode: '11680',
          districtName: '강남구',
          openedStoreCount: 12,
          openingChangeRate: null,
        },
      ],
      closedStoreRankings: [
        {
          rank: 1,
          districtCode: '11680',
          districtName: '강남구',
          closedStoreCount: 7,
          closureChangeRate: 3.4,
        },
      ],
    })

    expect(result.footTraffic[0].changeRate).toBeNull()
    expect(result.opened[0].changeRate).toBeNull()
    expect(result.closed[0]).toMatchObject({ value: 7, changeRate: 3.4 })
  })

  it('10개로 자르지 않고 응답의 구를 모두 담는다', () => {
    const result = normalizeStatusRankings({
      ...emptySummary,
      footTrafficRankings: Array.from({ length: 25 }, (_, index) => ({
        rank: index + 1,
        districtCode: String(11000 + index),
        districtName: `구${index}`,
        totalFootTraffic: 100 - index,
        footTrafficChangeRate: 1,
      })),
    })

    expect(result.footTraffic).toHaveLength(25)
    expect(selectStatusTopTen(result.footTraffic)).toHaveLength(10)
    expect(selectStatusTopTen(result.footTraffic).at(-1)?.rank).toBe(10)
  })

  it('배열이 통째로 빠진 200 응답에도 죽지 않는다', () => {
    const result = normalizeStatusRankings({} as DistrictRankingSummary)

    expect(isStatusTopTenAllEmpty(result)).toBe(true)
  })
})
