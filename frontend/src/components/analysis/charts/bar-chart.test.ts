import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import BarChart from '@/components/analysis/charts/bar-chart'

describe('BarChart', () => {
  it('각 항목의 값 라벨과 x축 라벨을 노출하고, 값이 있는 항목만 막대를 그린다', () => {
    const markup = renderToStaticMarkup(
      createElement(BarChart, {
        items: [
          { label: '월', value: 10 },
          { label: '화', value: 20 },
        ],
        unit: '명',
        ariaLabel: '요일별 유동인구 막대 차트',
      }),
    )
    expect(markup).toContain('월')
    expect(markup).toContain('화')
    expect(markup).toContain('10명')
    expect(markup).toContain('20명')
    expect(markup.match(/<rect/g)).toHaveLength(2)
  })

  it('null 값은 막대 없이 공백으로 두고, 값 라벨은 데이터 없음으로 표기한다', () => {
    const markup = renderToStaticMarkup(
      createElement(BarChart, {
        items: [
          { label: '월', value: 10 },
          { label: '화', value: null },
        ],
        unit: '명',
        ariaLabel: '요일별 유동인구 막대 차트',
      }),
    )
    expect(markup.match(/<rect/g)).toHaveLength(1)
    expect(markup).toContain('데이터 없음')
    expect(markup).toContain('화')
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
    expect(markup).not.toContain('<rect')
  })

  it('emphasisLabels에 속한 항목은 구분되는 primary shade로 그린다', () => {
    const markup = renderToStaticMarkup(
      createElement(BarChart, {
        items: [
          { label: '월', value: 10 },
          { label: '토', value: 30 },
          { label: '일', value: 25 },
        ],
        unit: '명',
        ariaLabel: '요일별 유동인구 막대 차트',
        emphasisLabels: ['토', '일'],
      }),
    )
    expect(markup.match(/fill="var\(--color-primary-700\)"/g)).toHaveLength(2)
    expect(markup.match(/fill="var\(--color-primary-600\)"/g)).toHaveLength(1)
  })

  it('빈 items 배열이면 데이터 없음을 안내한다', () => {
    const markup = renderToStaticMarkup(
      createElement(BarChart, {
        items: [],
        unit: '명',
        ariaLabel: '요일별 유동인구 막대 차트',
      }),
    )
    expect(markup).toContain('데이터 없음')
  })
})
