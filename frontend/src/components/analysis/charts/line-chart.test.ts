import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import LineChart from '@/components/analysis/charts/line-chart'

const points = [
  { periodLabel: '2023년 1분기', value: 100, changeRate: null },
  { periodLabel: '2023년 2분기', value: 140, changeRate: 40 },
  { periodLabel: '2023년 3분기', value: 120, changeRate: -14 },
]

describe('LineChart', () => {
  it('각 시점 값과 라벨, 상승 배지를 노출한다', () => {
    const markup = renderToStaticMarkup(
      createElement(LineChart, { points, unit: '원', direction: 'INCREASE' }),
    )
    expect(markup).toContain('2023년 3분기')
    expect(markup).toContain('polyline')
    expect(markup).toContain('상승') // trendDirection 배지 텍스트
  })

  it('changeRate가 있는 지점은 툴팁/aria-label에 전분기 대비 변화율을 노출한다', () => {
    const markup = renderToStaticMarkup(
      createElement(LineChart, { points, unit: '원', direction: 'INCREASE' }),
    )
    expect(markup).toContain('전분기 대비 +40%')
    expect(markup).toContain('전분기 대비 -14%')
    expect(markup).toContain(
      'aria-label="2023년 2분기 140원 · 전분기 대비 +40%"',
    )
  })

  it('전부 null이면 데이터 없음을 안내한다', () => {
    const markup = renderToStaticMarkup(
      createElement(LineChart, {
        points: [
          { periodLabel: '2023년 3분기', value: null, changeRate: null },
        ],
        unit: '원',
      }),
    )
    expect(markup).toContain('데이터 없음')
  })

  it('단일 시점 데이터도 값을 렌더하고 오류 없이 동작한다', () => {
    const markup = renderToStaticMarkup(
      createElement(LineChart, {
        points: [{ periodLabel: '2023년 1분기', value: 100, changeRate: null }],
        unit: '원',
      }),
    )
    expect(markup).toContain('100')
  })

  it('중간 null은 선을 끊고 해당 지점의 원은 렌더하지 않는다', () => {
    const markup = renderToStaticMarkup(
      createElement(LineChart, {
        points: [
          { periodLabel: '2023년 1분기', value: 100, changeRate: null },
          { periodLabel: '2023년 2분기', value: null, changeRate: null },
          { periodLabel: '2023년 3분기', value: 120, changeRate: null },
        ],
        unit: '원',
      }),
    )
    expect(markup).toContain('100')
    expect(markup).toContain('120')
    expect(markup.match(/<circle/g)).toHaveLength(2)
  })
})
