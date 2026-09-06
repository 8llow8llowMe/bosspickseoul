import { describe, expect, it } from 'vitest'

import {
  CHART_COLORS,
  createAxisTickFormatter,
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
})

/*
 * 사용자 지적: 손익 차트 축이 「1만 / 5,000 / 0 / -5,000 / -1.5만」처럼 **단위가 섞여**
 * 보였다. 값마다 단위를 따로 골라서 1만을 넘는 눈금만 만 단위가 됐기 때문이다 —
 * 같은 축의 눈금끼리 자릿수를 비교할 수 없다.
 */
describe('createAxisTickFormatter', () => {
  it('축 전체가 가장 큰 눈금의 단위를 함께 쓴다', () => {
    const ticks = [-15_000, -10_000, -5_000, 0, 5_000, 10_000]
    const format = createAxisTickFormatter(ticks)

    expect(ticks.map(format)).toEqual([
      '-1.5만',
      '-1만',
      '-0.5만',
      '0',
      '0.5만',
      '1만',
    ])
  })

  /* 예전 동작을 명시적으로 잠근다 — 이 조합이 다시 나오면 실패한다. */
  it('한 축 안에서 단위가 섞이지 않는다', () => {
    const format = createAxisTickFormatter([-15_000, 5_000, 10_000])
    const rendered = [-15_000, 5_000, 10_000].map(format)

    const withUnit = rendered.filter(text => text.includes('만')).length
    expect(withUnit).toBe(rendered.length)
  })

  it('모든 눈금이 1만 미만이면 단위 없이 콤마로 적는다', () => {
    const format = createAxisTickFormatter([0, 2_500, 5_000])
    expect([0, 2_500, 5_000].map(format)).toEqual(['0', '2,500', '5,000'])
  })

  it('만·억 컴팩트 표기 자체는 그대로다', () => {
    const format = createAxisTickFormatter([4_500_000])
    expect(format(600_000)).toBe('60만')
    expect(format(4_500_000)).toBe('450만')
  })

  it('억 단위 축도 하나로 통일한다', () => {
    const format = createAxisTickFormatter([0, 50_000_000, 250_000_000])
    expect([0, 50_000_000, 250_000_000].map(format)).toEqual([
      '0',
      '0.5억',
      '2.5억',
    ])
  })

  /*
   * 실측에서 나온 결함: 자치구 상세 「분기별 추이」 축이 눈금 4개인데
   * 「1.4억 · 1.4억 · 1.5억 · 1.5억」으로 그려졌다 — 소수 1자리 고정이라 서로 다른
   * 값이 같은 글자가 됐다. 눈금선 사이 값을 가늠할 수 없다.
   */
  it('눈금이 서로 다른 글자가 되도록 소수 자리를 늘린다', () => {
    const ticks = [140_000_000, 145_000_000, 150_000_000, 155_000_000]
    const format = createAxisTickFormatter(ticks)
    const rendered = ticks.map(format)

    expect(rendered).toEqual(['1.4억', '1.45억', '1.5억', '1.55억'])
    expect(new Set(rendered).size).toBe(ticks.length)
  })

  it('구분에 필요 없으면 소수를 붙이지 않는다', () => {
    const ticks = [0, 10_000, 20_000, 30_000]
    expect(ticks.map(createAxisTickFormatter(ticks))).toEqual([
      '0',
      '1만',
      '2만',
      '3만',
    ])
  })

  it('빈 축·비정상 값에도 죽지 않는다', () => {
    const format = createAxisTickFormatter([null, undefined, Number.NaN])
    expect(format(0)).toBe('0')
    expect(format(Number.NaN)).toBe('')
  })
})
