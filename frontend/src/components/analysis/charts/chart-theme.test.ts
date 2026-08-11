import { describe, expect, it } from 'vitest'

import { CHART_COLORS, formatChartValue } from '@/components/analysis/charts/chart-theme'

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
})
