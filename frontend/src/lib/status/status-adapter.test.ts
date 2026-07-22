import { describe, expect, it } from 'vitest'

import { normalizeStatusTopTen } from './status-adapter'

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
})
