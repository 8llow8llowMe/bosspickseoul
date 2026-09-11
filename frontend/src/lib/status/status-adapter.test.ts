import { describe, expect, it } from 'vitest'

import { isStatusTopTenAllEmpty, normalizeStatusTopTen } from './status-adapter'

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
