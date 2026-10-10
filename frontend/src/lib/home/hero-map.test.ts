import { describe, expect, it } from 'vitest'

import { SEOUL_STATUS_FEATURES } from '@/data/seoul-status-map'
import {
  HERO_MAP_METRIC,
  describeHeroMapDistrict,
  toHeroMapChoropleth,
} from '@/lib/home/hero-map'
import { normalizeStatusRankings } from '@/lib/status/status-adapter'
import {
  STATUS_MAP_VALUE_STEPS,
  resolveStatusMapValueSteps,
  statusMapValueStepFill,
} from '@/lib/status/status-map-model'
import type { DistrictRankingSummary } from '@/types/status'

/** 서울 25개 구 — 값이 클수록 앞이다(응답 정렬과 같다). */
const ALL_CODES = SEOUL_STATUS_FEATURES.map(feature => feature.districtCode)

const createRankings = (
  overrides: Partial<DistrictRankingSummary> = {},
): DistrictRankingSummary => ({
  currentPeriodCode: '20261',
  previousPeriodCode: '20254',
  footTrafficRankings: ALL_CODES.map((districtCode, index) => ({
    rank: index + 1,
    districtCode,
    districtName: `${index + 1}번구`,
    totalFootTraffic: 1_000_000 - index * 10_000,
    footTrafficChangeRate: 1,
  })),
  // 매출은 순서를 뒤집어 둔다 — 홈 지도가 유동인구를 칠하는지 보려고.
  salesRankings: [...ALL_CODES].reverse().map((districtCode, index) => ({
    rank: index + 1,
    districtCode,
    districtName: `${index + 1}번구`,
    totalSalesAmount: 1_000_000 - index,
    salesChangeRate: 1,
  })),
  openedStoreRankings: [],
  closedStoreRankings: [],
  ...overrides,
})

describe('toHeroMapChoropleth — 구별현황과 같은 5분위(#588)', () => {
  it('기본 지표는 유동인구다(결정 D-7)', () => {
    expect(HERO_MAP_METRIC).toBe('footTraffic')
  })

  it('구별현황 지도의 단계 계산을 그대로 쓴다 — 같은 응답이면 같은 단계다', () => {
    const body = createRankings()
    const choropleth = toHeroMapChoropleth(body)

    expect(choropleth?.steps).toEqual(
      resolveStatusMapValueSteps(normalizeStatusRankings(body).footTraffic),
    )
  })

  it('25개 구를 다섯 구씩 다섯 단계로 나눈다 — 1 이 가장 많다', () => {
    const steps = toHeroMapChoropleth(createRankings())!.steps

    expect(steps.size).toBe(25)
    expect(steps.get(ALL_CODES[0])).toBe(1)
    expect(steps.get(ALL_CODES[4])).toBe(1)
    expect(steps.get(ALL_CODES[5])).toBe(2)
    expect(steps.get(ALL_CODES[24])).toBe(5)
    for (const step of [1, 2, 3, 4, 5]) {
      expect([...steps.values()].filter(value => value === step)).toHaveLength(
        5,
      )
    }
  })

  it('범례 기준은 응답 분기와 지표 이름이다', () => {
    expect(toHeroMapChoropleth(createRankings())?.basisLabel).toBe(
      '2026년 1분기 유동인구',
    )
    expect(
      toHeroMapChoropleth(createRankings({ currentPeriodCode: null }))
        ?.basisLabel,
    ).toBe('유동인구')
  })

  it('25개 구가 다 있으면 「데이터 없음」 칸을 두지 않고, 빠진 구가 있으면 둔다', () => {
    expect(toHeroMapChoropleth(createRankings())?.hasDistrictWithoutStep).toBe(
      false,
    )

    const partial = createRankings()
    partial.footTrafficRankings = partial.footTrafficRankings.slice(0, 20)
    expect(toHeroMapChoropleth(partial)?.hasDistrictWithoutStep).toBe(true)
  })

  it('칠할 구가 없거나 응답이 없으면 null 이다 — 칠하지 않은 지도에 범례를 달지 않는다', () => {
    expect(toHeroMapChoropleth(null)).toBeNull()
    expect(
      toHeroMapChoropleth(createRankings({ footTrafficRankings: [] })),
    ).toBeNull()
  })
})

describe('toHeroMapChoropleth — 결측과 이름표(#588 리뷰)', () => {
  it('지도에 없는 코드가 섞여 25개를 채워도 빠진 구가 있으면 「데이터 없음」 칸을 둔다', () => {
    const body = createRankings()
    body.footTrafficRankings = [
      ...body.footTrafficRankings.slice(0, 24),
      {
        rank: 25,
        districtCode: '99999',
        districtName: '없는구',
        totalFootTraffic: 1,
        footTrafficChangeRate: 0,
      },
    ]

    expect(toHeroMapChoropleth(body)?.hasDistrictWithoutStep).toBe(true)
  })

  it('값이 유한수가 아니라 회색인 구는 이름표에 순위를 싣지 않는다', () => {
    const body = createRankings()
    body.footTrafficRankings[3] = {
      ...body.footTrafficRankings[3],
      totalFootTraffic: Number.NaN,
    }
    const choropleth = toHeroMapChoropleth(body)!

    expect(choropleth.steps.has(ALL_CODES[3])).toBe(false)
    expect(choropleth.itemsByCode.has(ALL_CODES[3])).toBe(false)
    expect(
      describeHeroMapDistrict(
        '성북구',
        choropleth.itemsByCode.get(ALL_CODES[3]),
      ),
    ).toBe('성북구')
    expect(choropleth.hasDistrictWithoutStep).toBe(true)
  })
})

describe('describeHeroMapDistrict', () => {
  it('순위가 있으면 지표 순위를 함께 읽는다', () => {
    const item = toHeroMapChoropleth(createRankings())!.itemsByCode.get(
      ALL_CODES[2],
    )

    expect(describeHeroMapDistrict('강남구', item)).toBe('강남구, 유동인구 3위')
    expect(describeHeroMapDistrict('강남구', undefined)).toBe('강남구')
  })
})

describe('단계 색 정본(status-map-model)', () => {
  it('다섯 칸이 진한 것부터 옅은 것 순이다', () => {
    const percents = STATUS_MAP_VALUE_STEPS.map(step => step.mixPercent)

    expect(STATUS_MAP_VALUE_STEPS.map(step => step.step)).toEqual([
      1, 2, 3, 4, 5,
    ])
    expect([...percents].sort((a, b) => b - a)).toEqual(percents)
  })

  it('새 토큰 없이 primary-600 을 바탕에 섞는다', () => {
    expect(statusMapValueStepFill(60)).toBe(
      'color-mix(in srgb, var(--color-primary-600) 60%, var(--color-surface))',
    )
  })
})
