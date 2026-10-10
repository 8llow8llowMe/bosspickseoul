import { describe, expect, it } from 'vitest'
import {
  formatGrowth,
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
    similarStoreCount: 40,
    totalResidentPopulation: 12000,
  },
} as unknown as CommercialProfile

describe('resolveMetricCards', () => {
  it('4개 카드를 순서대로 만든다(점포당 월매출/유동인구/점포수/성장률)', () => {
    const cards = resolveMetricCards({
      profile,
      profileLoading: false,
      growth: { direction: 'INCREASE', changeRate: 0.182 },
      growthLoading: false,
    })
    expect(cards.map(c => c.label)).toEqual([
      '점포당 월 매출',
      '유동인구',
      '점포 수',
      '성장률',
    ])
    expect(cards[3].display).toBe('+18.2%')
    expect(cards[3].tone).toBe('positive')
    expect(cards[0].loading).toBe(false)
  })
  /* #561 — 합계(3억 4500만원)는 업종 전체다. 상권분석 요약과 같은 규칙으로 점포당 값을 보인다. */
  it('매출 카드는 합계 ÷ 점포 수(similarStoreCount)의 점포당 값이다', () => {
    const cards = resolveMetricCards({
      profile,
      profileLoading: false,
      growth: { direction: 'INCREASE', changeRate: 0.182 },
      growthLoading: false,
    })
    // 345,000,000 / 40 = 8,625,000 → 862만원.
    expect(cards[0].display).toBe('862만원')
  })

  it('점포 0 은 합계에 따라 「점포 없음」·「점포 수 집계 없음」으로 가른다', () => {
    const withMetrics = (totalSalesAmount: number | null) =>
      resolveMetricCards({
        profile: {
          ...profile,
          keyMetrics: {
            ...profile.keyMetrics,
            similarStoreCount: 0,
            totalSalesAmount,
          },
        } as unknown as CommercialProfile,
        profileLoading: false,
        growth: { direction: null, changeRate: null },
        growthLoading: false,
      })[0].display

    expect(withMetrics(0)).toBe('점포 없음')
    expect(withMetrics(null)).toBe('점포 없음')
    expect(withMetrics(12_000_000)).toBe('점포 수 집계 없음')
  })

  it('점포 수가 없으면 데이터 없음이다', () => {
    const cards = resolveMetricCards({
      profile: {
        ...profile,
        keyMetrics: { ...profile.keyMetrics, similarStoreCount: null },
      } as unknown as CommercialProfile,
      profileLoading: false,
      growth: { direction: null, changeRate: null },
      growthLoading: false,
    })
    expect(cards[0].display).toBe('데이터 없음')
  })

  it('점포 수는 프랜차이즈를 포함한 similarStoreCount 다(totalStoreCount 는 프랜차이즈 제외)', () => {
    const cards = resolveMetricCards({
      profile,
      profileLoading: false,
      growth: { direction: 'INCREASE', changeRate: 0.182 },
      growthLoading: false,
    })
    expect(cards[2].display).toContain('40')
    expect(cards[2].display).not.toContain('32')
  })
  it('로딩 중이면 loading=true, display 는 `--`', () => {
    // 지표는 skeleton 이 아니라 `--` 로 기다린다(DESIGN.md §4-8). 예전 이름은
    // 「display 빈 문자열」이었는데 display 를 단언하지 않아 규칙을 지키지 못했다.
    const cards = resolveMetricCards({
      profile: null,
      profileLoading: true,
      growth: { direction: null, changeRate: null },
      growthLoading: true,
    })
    expect(cards.every(c => c.loading)).toBe(true)
    expect(cards.map(c => c.display)).toEqual(['--', '--', '--', '--'])
    expect(cards.every(c => c.tone === undefined)).toBe(true)
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
    expect(cards[3].toneLabel).toBe('')
    expect(cards[3].arrow).toBeNull()
  })
})

/* D-1 — 증감은 방향이 아니라 좋고 나쁨으로 칠하고, 색 옆에 「개선/악화」를 늘 적는다. */
describe('formatGrowth', () => {
  it('매출이 늘면 개선, 줄면 악화다 — 부호·화살표를 함께 낸다', () => {
    expect(formatGrowth({ direction: 'INCREASE', changeRate: 0.182 })).toEqual({
      display: '+18.2%',
      tone: 'positive',
      arrow: '▲',
      toneLabel: '개선',
    })
    expect(formatGrowth({ direction: 'DECREASE', changeRate: -0.05 })).toEqual({
      display: '-5.0%',
      tone: 'negative',
      arrow: '▼',
      toneLabel: '악화',
    })
  })

  it('보합(±1% 안)은 무채색이고 판단 글자를 붙이지 않는다', () => {
    expect(formatGrowth({ direction: 'STAGNANT', changeRate: 0.004 })).toEqual({
      display: '+0.4%',
      tone: 'neutral',
      arrow: '–',
      toneLabel: '',
    })
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
  it('ready-region이면 ready(자치구/행정동 텍스트 리포트)', () => {
    const state = { status: 'ready-region', view: {} } as AiReportState
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
