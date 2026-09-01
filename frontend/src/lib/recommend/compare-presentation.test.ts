import { describe, expect, it } from 'vitest'

import {
  COMPARE_EMPTY_CELL,
  toCompareMetricRows,
  toCompareScoreRows,
  type CompareColumnInput,
} from './compare-presentation'
import type { CandidateCommercial, CommercialProfile } from '@/types/recommend'

const candidate = (
  code: string,
  compositeScore: number | null,
  scores: Partial<Record<string, number | null>> = {},
): CandidateCommercial => ({
  rank: 1,
  commercialCode: code,
  commercialName: `상권 ${code}`,
  compositeScore,
  grade: null,
  summaryLabel: null,
  selectionReason: null,
  opportunityLabel: null,
  riskLabel: null,
  reasonTags: [],
  metricBreakdown: Object.entries(scores).map(([metricCode, score]) => ({
    metricType: {
      code: metricCode,
      name: metricCode,
      description: '',
      scoreDescription: '',
    },
    score: score ?? null,
    grade: null,
    summaryLabel: null,
  })),
})

const profile = (
  code: string,
  keyMetrics: CommercialProfile['keyMetrics'],
): CommercialProfile => ({
  commercialCode: code,
  commercialName: `상권 ${code}`,
  districtCode: '11680',
  districtName: '강남구',
  administrationCode: '11680640',
  administrationName: '역삼1동',
  centerLng: 127,
  centerLat: 37.5,
  boundaryCoords: [],
  keyMetrics,
})

const column = (
  code: string,
  c: CandidateCommercial | null,
  p: CommercialProfile | null,
): CompareColumnInput => ({ commercialCode: code, candidate: c, profile: p })

describe('toCompareScoreRows', () => {
  it('종합 점수와 지표 4종을 행으로 세운다', () => {
    const rows = toCompareScoreRows([
      column('A', candidate('A', 84, { OPPORTUNITY_SCORE: 90 }), null),
    ])

    expect(rows.map(row => row.key)).toEqual([
      'composite',
      'OPPORTUNITY_SCORE',
      'RISK_SCORE',
      'CONGESTION_SCORE',
      'RESIDENT_POPULATION_SCORE',
    ])
    expect(rows[0].cells[0]).toEqual({
      commercialCode: 'A',
      score: 84,
      formatted: '84',
      quality: 'good',
    })
  })

  it('종합 점수는 화면 표기만 반올림하고 등급 판정은 원값을 쓴다', () => {
    // /recommend 카드가 Math.round 로 적는 것과 같은 숫자로 보여야 한다 —
    // 그렇지 않으면 같은 상권이 두 화면에서 다른 숫자로 보인다.
    const rows = toCompareScoreRows([
      column('A', candidate('A', 83.99470969264185), null),
    ])

    expect(rows[0].cells[0].formatted).toBe('84')
    expect(rows[0].cells[0].score).toBe(83.99470969264185)
  })

  it('점수가 없으면 표기도 대시다', () => {
    const rows = toCompareScoreRows([column('A', null, null)])

    expect(rows[0].cells[0].formatted).toBe(COMPARE_EMPTY_CELL)
  })

  it('반올림 경계에서는 표기가 등급 판정보다 앞서 반올림되지 않는다', () => {
    // 69.6 을 먼저 반올림하면 70(=GOOD_THRESHOLD)이 되어 "70인데 fair"라는
    // 존재하지 않는 불일치를 화면이 스스로 만들어낸다. 표기는 반올림해 '70'을
    // 보여주더라도 등급은 반올림 전 69.6 을 기준으로 매겨져야 한다.
    const rows = toCompareScoreRows([column('A', candidate('A', 69.6), null)])

    expect(rows[0].cells[0].formatted).toBe('70')
    expect(rows[0].cells[0].quality).toBe('fair')
  })

  it('위험도가 높으면 나쁨으로 판정한다', () => {
    // lower-is-better 를 뒤집지 않으면 "위험도 100"이 초록으로 칠해진다.
    const rows = toCompareScoreRows([
      column('A', candidate('A', null, { RISK_SCORE: 95 }), null),
    ])
    const risk = rows.find(row => row.key === 'RISK_SCORE')

    expect(risk?.cells[0].quality).toBe('poor')
  })

  it('점수가 없으면 중립이다', () => {
    const rows = toCompareScoreRows([column('A', null, null)])

    expect(rows[0].cells[0]).toEqual({
      commercialCode: 'A',
      score: null,
      formatted: COMPARE_EMPTY_CELL,
      quality: 'neutral',
    })
  })
})

describe('toCompareMetricRows', () => {
  const metrics = (
    over: Partial<NonNullable<CommercialProfile['keyMetrics']>>,
  ) =>
    ({
      totalSalesAmount: null,
      totalFootTraffic: null,
      totalStoreCount: null,
      similarStoreCount: null,
      openingRate: null,
      closureRate: null,
      totalResidentPopulation: null,
      monthlyAverageIncomeAmount: null,
      totalFacilityCount: null,
      ...over,
    }) as NonNullable<CommercialProfile['keyMetrics']>

  it('원지표 9행을 세운다', () => {
    const rows = toCompareMetricRows([column('A', null, null)])

    expect(rows).toHaveLength(9)
    expect(rows.map(row => row.key)).toEqual([
      'totalSalesAmount',
      'totalFootTraffic',
      'totalStoreCount',
      'similarStoreCount',
      'openingRate',
      'closureRate',
      'totalResidentPopulation',
      'monthlyAverageIncomeAmount',
      'totalFacilityCount',
    ])
  })

  it('최댓값에만 배지를 붙인다', () => {
    const rows = toCompareMetricRows([
      column('A', null, profile('A', metrics({ totalStoreCount: 10 }))),
      column('B', null, profile('B', metrics({ totalStoreCount: 30 }))),
      column('C', null, profile('C', metrics({ totalStoreCount: 20 }))),
    ])
    const row = rows.find(r => r.key === 'totalStoreCount')!

    expect(row.cells.map(cell => cell.isHighest)).toEqual([false, true, false])
  })

  it('값이 모두 같으면 배지를 붙이지 않는다', () => {
    const rows = toCompareMetricRows([
      column('A', null, profile('A', metrics({ totalStoreCount: 10 }))),
      column('B', null, profile('B', metrics({ totalStoreCount: 10 }))),
    ])
    const row = rows.find(r => r.key === 'totalStoreCount')!

    expect(row.cells.every(cell => !cell.isHighest)).toBe(true)
  })

  it('값이 하나뿐이면 배지를 붙이지 않는다', () => {
    const rows = toCompareMetricRows([
      column('A', null, profile('A', metrics({ totalStoreCount: 10 }))),
      column('B', null, null),
    ])
    const row = rows.find(r => r.key === 'totalStoreCount')!

    expect(row.cells.every(cell => !cell.isHighest)).toBe(true)
  })

  it('최댓값이 동점이면 동점 셀 모두에 붙인다', () => {
    const rows = toCompareMetricRows([
      column('A', null, profile('A', metrics({ totalStoreCount: 30 }))),
      column('B', null, profile('B', metrics({ totalStoreCount: 30 }))),
      column('C', null, profile('C', metrics({ totalStoreCount: 10 }))),
    ])
    const row = rows.find(r => r.key === 'totalStoreCount')!

    expect(row.cells.map(cell => cell.isHighest)).toEqual([true, true, false])
  })

  it('값이 없으면 대시로 적고 최댓값 계산에서 뺀다', () => {
    const rows = toCompareMetricRows([column('A', null, null)])
    const row = rows.find(r => r.key === 'totalStoreCount')!

    expect(row.cells[0].formatted).toBe('—')
    expect(row.cells[0].isHighest).toBe(false)
  })

  it('매출은 억/만원으로 적는다', () => {
    const rows = toCompareMetricRows([
      column(
        'A',
        null,
        profile('A', metrics({ totalSalesAmount: 84_520_000 })),
      ),
    ])
    const row = rows.find(r => r.key === 'totalSalesAmount')!

    expect(row.cells[0].formatted).toBe('8452만원')
  })
})
