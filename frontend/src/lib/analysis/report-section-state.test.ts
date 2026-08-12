import { describe, expect, it } from 'vitest'
import {
  resolveChartSlot,
  resolveMetricCards,
} from '@/lib/analysis/report-section-state'
import type { CommercialProfile } from '@/types/recommend'

const profile = {
  commercialName: '역삼동',
  keyMetrics: {
    totalSalesAmount: 345_000_000,
    totalFootTraffic: 32000,
    totalStoreCount: 32,
    totalResidentPopulation: 12000,
  },
} as unknown as CommercialProfile

describe('resolveMetricCards', () => {
  it('4개 카드를 순서대로 만든다(월매출/유동인구/점포수/성장률)', () => {
    const cards = resolveMetricCards({
      profile,
      profileLoading: false,
      growth: { direction: 'INCREASE', changeRate: 0.182 },
      growthLoading: false,
    })
    expect(cards.map(c => c.label)).toEqual([
      '월 매출',
      '유동인구',
      '점포 수',
      '성장률',
    ])
    expect(cards[3].display).toBe('+18.2%')
    expect(cards[3].tone).toBe('positive')
    expect(cards[0].loading).toBe(false)
  })
  it('로딩 중이면 loading=true, display 빈 문자열', () => {
    const cards = resolveMetricCards({
      profile: null,
      profileLoading: true,
      growth: { direction: null, changeRate: null },
      growthLoading: true,
    })
    expect(cards.every(c => c.loading)).toBe(true)
  })
  it('성장률 변화율 없으면 데이터 없음·neutral', () => {
    const cards = resolveMetricCards({
      profile,
      profileLoading: false,
      growth: { direction: 'STAGNANT', changeRate: null },
      growthLoading: false,
    })
    expect(cards[3].display).toBe('데이터 없음')
    expect(cards[3].tone).toBe('neutral')
  })
})

describe('resolveChartSlot', () => {
  it('로딩이 최우선', () => {
    expect(resolveChartSlot(true, true)).toBe('loading')
  })
  it('로딩 아니고 비었으면 empty', () => {
    expect(resolveChartSlot(false, true)).toBe('empty')
  })
  it('데이터 있으면 ready', () => {
    expect(resolveChartSlot(false, false)).toBe('ready')
  })
})
