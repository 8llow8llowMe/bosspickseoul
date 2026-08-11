import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import BarChart, {
  resolveBarCells,
} from '@/components/analysis/charts/bar-chart'

describe('BarChart', () => {
  it('resolveBarCells는 emphasisLabels에 매칭되는 항목만 emphasis=true로 표시', () => {
    const cells = resolveBarCells(
      [
        { label: '월', value: 10 },
        { label: '토', value: 30 },
      ],
      ['토', '일'],
    )
    expect(cells).toEqual([
      { label: '월', value: 10, emphasis: false },
      { label: '토', value: 30, emphasis: true },
    ])
  })

  it('emphasisLabels가 없으면 모두 emphasis=false', () => {
    const cells = resolveBarCells([{ label: '월', value: 10 }])
    expect(cells[0].emphasis).toBe(false)
  })

  it('전부 null이면 데이터 없음 안내만 보여준다', () => {
    const markup = renderToStaticMarkup(
      createElement(BarChart, {
        items: [
          { label: '월', value: null },
          { label: '화', value: null },
        ],
        unit: '명',
        ariaLabel: '요일별 유동인구 막대 차트',
      }),
    )
    expect(markup).toContain('데이터 없음')
  })
})
