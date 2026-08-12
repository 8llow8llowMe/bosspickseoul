import { describe, expect, it } from 'vitest'
import {
  buildFootDayBars,
  buildSalesTimeLine,
  selectSalesGrowth,
} from '@/lib/analysis/commercial-chart-selectors'
import type { CommercialSales, CommercialTrend } from '@/types/commercial-analysis'

describe('buildSalesTimeLine', () => {
  it('시간대별 매출을 6개 라인 포인트로 변환한다', () => {
    const sales = {
      amountByTimeSlotItem: {
        salesAmountTime00To06: 10,
        salesAmountTime06To11: 20,
        salesAmountTime11To14: null,
        salesAmountTime14To17: 40,
        salesAmountTime17To21: 50,
        salesAmountTime21To24: 60,
      },
    } as unknown as CommercialSales
    const points = buildSalesTimeLine(sales)
    expect(points).toHaveLength(6)
    expect(points[0]).toEqual({ periodLabel: '00~06시', value: 10, changeRate: null })
    expect(points[2].value).toBeNull()
  })
  it('null 입력은 6개 null 포인트', () => {
    expect(buildSalesTimeLine(null).every(p => p.value === null)).toBe(true)
  })
})

describe('buildFootDayBars', () => {
  it('요일 7개 막대 행을 만든다', () => {
    expect(buildFootDayBars(null)).toHaveLength(7)
    expect(buildFootDayBars(null)[0].label).toBe('월')
  })
})

describe('selectSalesGrowth', () => {
  it('마지막 분기 변화율과 방향을 뽑는다', () => {
    const trend = {
      trendDirection: 'INCREASE',
      periods: [
        { periodCode: '20232', value: 100, changeRate: 0.1 },
        { periodCode: '20233', value: 118, changeRate: 0.18 },
      ],
    } as unknown as CommercialTrend
    expect(selectSalesGrowth(trend)).toEqual({ direction: 'INCREASE', changeRate: 0.18 })
  })
  it('빈/비유한 변화율은 null', () => {
    expect(selectSalesGrowth(null)).toEqual({ direction: null, changeRate: null })
    const noRate = { trendDirection: 'STAGNANT', periods: [{ periodCode: '20233', value: 1, changeRate: null }] } as unknown as CommercialTrend
    expect(selectSalesGrowth(noRate)).toEqual({ direction: 'STAGNANT', changeRate: null })
  })
})
