import { describe, expect, it } from 'vitest'

import {
  HOME_METRIC_FALLBACK,
  toHomeMetricRankings,
} from '@/lib/home/metric-rankings'
import type { DistrictTopTenSummary } from '@/types/status'

const summary: DistrictTopTenSummary = {
  footTrafficTopTenItems: [
    {
      districtCode: '11680',
      districtName: '강남구',
      totalFootTraffic: 1842,
      footTrafficChangeRate: 3.2,
    },
    {
      districtCode: '11710',
      districtName: '송파구',
      totalFootTraffic: 1455,
      footTrafficChangeRate: 1.1,
    },
  ],
  salesTopTenItems: [
    {
      districtCode: '11680',
      districtName: '강남구',
      totalSalesAmount: 42100,
      salesChangeRate: 5.1,
    },
  ],
  openedStoreTopTenItems: [
    {
      districtCode: '11440',
      districtName: '마포구',
      openedStoreCount: 892,
      openingChangeRate: 7.4,
    },
  ],
  closedStoreTopTenItems: [
    {
      districtCode: '11170',
      districtName: '용산구',
      closedStoreCount: 310,
      closureChangeRate: 2.0,
    },
  ],
}

describe('toHomeMetricRankings', () => {
  it('홈이 쓰는 3지표만 낸다', () => {
    const result = toHomeMetricRankings(summary)

    expect(result.map(entry => entry.metric)).toEqual([
      'footTraffic',
      'sales',
      'opened',
    ])
  })

  it('폐업은 내지 않는다', () => {
    // 폐업은 상위가 나쁜 것이라 다른 셋과 방향이 반대다. 같은 토글에 섞으면
    // 랜딩에서 「폐업 1위」를 순위표처럼 자랑하게 되고 인사이트 문장이 뒤집힌다.
    const result = toHomeMetricRankings(summary)

    expect(result.some(entry => (entry.metric as string) === 'closed')).toBe(
      false,
    )
  })

  it('순위·값·변화율을 status 어댑터가 낸 그대로 옮긴다', () => {
    const [footTraffic] = toHomeMetricRankings(summary)

    expect(footTraffic.items[0]).toMatchObject({
      rank: 1,
      districtCode: '11680',
      districtName: '강남구',
      value: 1842,
      changeRate: 3.2,
    })
  })

  it('각 지표를 최대 5개로 자른다', () => {
    const many: DistrictTopTenSummary = {
      ...summary,
      footTrafficTopTenItems: Array.from({ length: 10 }, (_, index) => ({
        districtCode: String(11000 + index),
        districtName: `구${index}`,
        totalFootTraffic: 1000 - index,
        footTrafficChangeRate: 0,
      })),
    }

    expect(toHomeMetricRankings(many)[0].items).toHaveLength(5)
  })

  it('한국어 라벨을 붙인다', () => {
    expect(toHomeMetricRankings(summary).map(entry => entry.label)).toEqual([
      '유동인구',
      '매출',
      '개업',
    ])
  })
})

describe('HOME_METRIC_FALLBACK', () => {
  it('실 데이터와 같은 모양이라 화면이 분기 없이 그린다', () => {
    expect(HOME_METRIC_FALLBACK.map(entry => entry.metric)).toEqual([
      'footTraffic',
      'sales',
      'opened',
    ])
    expect(HOME_METRIC_FALLBACK.every(entry => entry.items.length > 0)).toBe(
      true,
    )
  })
})
