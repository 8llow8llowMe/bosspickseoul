import { describe, expect, it } from 'vitest'
import {
  buildFootDayBars,
  buildSalesTimeBars,
  selectSalesGrowth,
} from '@/lib/analysis/commercial-chart-selectors'
import type {
  CommercialSales,
  CommercialTrend,
} from '@/types/commercial-analysis'

describe('buildSalesTimeBars', () => {
  it('시간대별 매출 구간 합계를 6개 시간당 평균 막대로 바꾼다', () => {
    const sales = {
      amountByTimeSlotItem: {
        salesAmountTime00To06: 60,
        salesAmountTime06To11: 50,
        salesAmountTime11To14: null,
        salesAmountTime14To17: 45,
        salesAmountTime17To21: 40,
        salesAmountTime21To24: 31,
      },
    } as unknown as CommercialSales
    const rows = buildSalesTimeBars(sales)
    expect(rows).toHaveLength(6)
    // 구간 길이 6·5·3·3·4·3시간으로 나눈다(반올림).
    expect(rows.map(row => row.value)).toEqual([10, 10, null, 15, 10, 10])
    expect(rows[0].label).toBe('00~06시')
  })
  it('null 입력은 6개 null 포인트', () => {
    expect(buildSalesTimeBars(null).every(row => row.value === null)).toBe(true)
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
    expect(selectSalesGrowth(trend)).toEqual({
      direction: 'INCREASE',
      changeRate: 0.18,
    })
  })
  it('빈/비유한 변화율은 null', () => {
    expect(selectSalesGrowth(null)).toEqual({
      direction: null,
      changeRate: null,
    })
    const noRate = {
      trendDirection: 'STAGNANT',
      periods: [{ periodCode: '20233', value: 1, changeRate: null }],
    } as unknown as CommercialTrend
    expect(selectSalesGrowth(noRate)).toEqual({
      direction: 'STAGNANT',
      changeRate: null,
    })
  })
})
