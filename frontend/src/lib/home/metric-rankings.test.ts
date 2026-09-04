import { describe, expect, it } from 'vitest'

import {
  HOME_METRIC_FALLBACK,
  RANKING_METRIC_TOP_N,
  STORY_METRIC_TOP_N,
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
    const result = toHomeMetricRankings(summary, RANKING_METRIC_TOP_N)

    expect(result.map(entry => entry.metric)).toEqual([
      'footTraffic',
      'sales',
      'opened',
    ])
  })

  it('폐업은 내지 않는다', () => {
    // 폐업은 상위가 나쁜 것이라 다른 셋과 방향이 반대다. 같은 토글에 섞으면
    // 랜딩에서 「폐업 1위」를 순위표처럼 자랑하게 되고 인사이트 문장이 뒤집힌다.
    const result = toHomeMetricRankings(summary, RANKING_METRIC_TOP_N)

    expect(result.some(entry => (entry.metric as string) === 'closed')).toBe(
      false,
    )
  })

  it('순위·값·변화율을 status 어댑터가 낸 그대로 옮긴다', () => {
    const [footTraffic] = toHomeMetricRankings(summary, RANKING_METRIC_TOP_N)

    expect(footTraffic.items[0]).toMatchObject({
      rank: 1,
      districtCode: '11680',
      districtName: '강남구',
      value: 1842,
      changeRate: 3.2,
    })
  })

  it('한국어 라벨을 붙인다', () => {
    expect(
      toHomeMetricRankings(summary, RANKING_METRIC_TOP_N).map(
        entry => entry.label,
      ),
    ).toEqual(['유동인구', '매출', '개업'])
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

  /*
   * 01단계가 Top10 을 그린다(R4). 폴백이 5개면 API 장애 시 화면 행 수가 10 -> 5 로
   * 줄어든다. 정상/폴백의 개수를 맞춰 둔다.
   */
  it('지표마다 10개를 갖는다', () => {
    for (const entry of HOME_METRIC_FALLBACK) {
      expect(entry.items).toHaveLength(10)
    }
  })

  it('순위가 1부터 10까지 빠짐없이 이어진다', () => {
    for (const entry of HOME_METRIC_FALLBACK) {
      expect(entry.items.map(item => item.rank)).toEqual([
        1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
      ])
    }
  })

  /*
   * 값이 순위와 어긋나면(6위가 5위보다 크면) 폴백이 실 데이터와 다른 모양이 된다.
   */
  it('값이 순위 순서대로 감소한다', () => {
    for (const entry of HOME_METRIC_FALLBACK) {
      const values = entry.items.map(item => item.value)
      const sorted = [...values].sort((a, b) => b - a)

      expect(values).toEqual(sorted)
    }
  })

  /*
   * 지어낸 숫자 방지 가드. 자릿수가 실제와 어긋난 폴백은 폴백이 없는 것보다 나쁘다
   * — dev 실측 스냅샷의 1위 값을 고정해 둔다.
   */
  it('실측 스냅샷의 1위 값을 그대로 갖는다', () => {
    const footTraffic = HOME_METRIC_FALLBACK.find(
      entry => entry.metric === 'footTraffic',
    )

    expect(footTraffic?.items[0]).toMatchObject({
      districtCode: '11680',
      districtName: '강남구',
      value: 145_280_452,
    })
  })
})

/** 자르기를 검증하려면 topN 보다 많아야 한다 — 12개를 넣는다. */
const wideSummary: DistrictTopTenSummary = {
  footTrafficTopTenItems: Array.from({ length: 12 }, (_, index) => ({
    districtCode: `1100${index}`,
    districtName: `${index + 1}번구`,
    totalFootTraffic: 100_000 - index,
    footTrafficChangeRate: 0,
  })),
  salesTopTenItems: [],
  openedStoreTopTenItems: [],
  closedStoreTopTenItems: [],
}

describe('toHomeMetricRankings — 소비처별 topN(R4)', () => {
  it('topN=10 이면 10개로 자른다', () => {
    const result = toHomeMetricRankings(wideSummary, STORY_METRIC_TOP_N)
    const footTraffic = result.find(entry => entry.metric === 'footTraffic')

    expect(STORY_METRIC_TOP_N).toBe(10)
    expect(footTraffic?.items).toHaveLength(10)
  })

  it('topN=5 이면 5개로 자른다', () => {
    const result = toHomeMetricRankings(wideSummary, RANKING_METRIC_TOP_N)
    const footTraffic = result.find(entry => entry.metric === 'footTraffic')

    expect(RANKING_METRIC_TOP_N).toBe(5)
    expect(footTraffic?.items).toHaveLength(5)
  })

  /*
   * 규칙 B 문장이 "Top {metric.items.length} 밖" 을 읽는다 — 랭킹 우측이 10이 되면
   * 문장이 약해지고 발동 확률도 급감한다. 두 값이 갈려 있다는 사실 자체를 고정한다.
   */
  it('01단계와 랭킹 우측은 서로 다른 개수를 쓴다', () => {
    expect(STORY_METRIC_TOP_N).not.toBe(RANKING_METRIC_TOP_N)
  })
})
