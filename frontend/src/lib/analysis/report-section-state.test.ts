import { describe, expect, it } from 'vitest'
import {
  resolveChartSlot,
  resolveInsightMode,
  resolveMetricCards,
} from '@/lib/analysis/report-section-state'
import type { AiReportState } from '@/hooks/use-ai-report'
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

const loading: AiReportState = {
  status: 'loading',
  stage: null,
  progressMessages: [],
}

describe('resolveInsightMode', () => {
  it('비로그인(hydrated)이면 locked', () => {
    expect(
      resolveInsightMode({ hydrated: true, isLoggedIn: false, state: loading }),
    ).toBe('locked')
  })
  it('로그인 + loading이면 loading', () => {
    expect(
      resolveInsightMode({ hydrated: true, isLoggedIn: true, state: loading }),
    ).toBe('loading')
  })
  it('ready-commercial이면 ready', () => {
    const state = { status: 'ready-commercial', view: {} } as AiReportState
    expect(
      resolveInsightMode({ hydrated: true, isLoggedIn: true, state }),
    ).toBe('ready')
  })
  it('error이면 error', () => {
    const state = {
      status: 'error',
      message: 'x',
      errorKind: 'generic',
      canRetry: true,
    } as AiReportState
    expect(
      resolveInsightMode({ hydrated: true, isLoggedIn: true, state }),
    ).toBe('error')
  })
  it('idle(선택 불완전 등으로 조회 자체를 안 함)이면 무한 로딩 대신 empty', () => {
    const state: AiReportState = { status: 'idle' }
    expect(
      resolveInsightMode({ hydrated: true, isLoggedIn: true, state }),
    ).toBe('empty')
  })
})
