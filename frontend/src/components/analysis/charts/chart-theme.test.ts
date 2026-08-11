import { describe, expect, it } from 'vitest'

import {
  CHART_COLORS,
  formatAxisTick,
  formatChartValue,
} from '@/components/analysis/charts/chart-theme'

describe('chart-theme', () => {
  it('시리즈 색은 디자인 토큰 CSS 변수 문자열을 노출한다', () => {
    expect(CHART_COLORS.seriesPrimary).toBe('var(--color-primary-600)')
    expect(CHART_COLORS.seriesSecondary).toBe('var(--color-blue-500)')
    expect(CHART_COLORS.grid).toBe('var(--color-border-200)')
  })

  it('formatChartValue는 단위를 붙이고 null은 데이터 없음으로 표기한다', () => {
    expect(formatChartValue(1234, '명')).toBe('1,234명')
    expect(formatChartValue(null, '명')).toBe('데이터 없음')
  })

  it('formatAxisTick은 큰 수를 만/억 컴팩트로 짧게 만든다', () => {
    expect(formatAxisTick(0)).toBe('0')
    expect(formatAxisTick(600_000)).toBe('60만')
    expect(formatAxisTick(4_500_000)).toBe('450만')
    expect(formatAxisTick(100_000_000)).toBe('1억')
    expect(formatAxisTick(250_000_000)).toBe('2.5억')
    expect(formatAxisTick(4)).toBe('4')
  })
})
