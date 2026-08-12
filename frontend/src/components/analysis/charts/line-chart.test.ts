import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import LineChart, { hasLineData } from '@/components/analysis/charts/line-chart'
import type { TrendPoint } from '@/lib/analysis/chart-data'

const pt = (periodLabel: string, value: number | null): TrendPoint => ({
  periodLabel,
  value,
  changeRate: null,
})

describe('LineChart', () => {
  it('hasLineData는 number 값이 하나라도 있으면 true, 전부 null이면 false', () => {
    expect(hasLineData([pt('1분기', 10), pt('2분기', null)])).toBe(true)
    expect(hasLineData([pt('1분기', null), pt('2분기', null)])).toBe(false)
    expect(hasLineData([])).toBe(false)
  })

  it('데이터가 없으면 데이터 없음 안내를 렌더한다', () => {
    const markup = renderToStaticMarkup(
      createElement(LineChart, {
        points: [pt('1분기', null)],
        unit: '명',
      }),
    )
    expect(markup).toContain('데이터 없음')
  })

  it('direction이 주어지면 방향 배지 라벨을 렌더한다', () => {
    const markup = renderToStaticMarkup(
      createElement(LineChart, {
        points: [pt('1분기', 10), pt('2분기', 20)],
        unit: '명',
        direction: 'INCREASE',
      }),
    )
    expect(markup).toContain('상승')
  })

  it('LineChart는 optional height prop을 노출한다', () => {
    const src = readFileSync(
      fileURLToPath(new URL('./line-chart.tsx', import.meta.url)),
      'utf8',
    )
    expect(src).toContain('height?: number')
    expect(src).toContain('height = 240')
  })
})
