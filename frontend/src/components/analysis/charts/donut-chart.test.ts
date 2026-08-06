import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import DonutChart from '@/components/analysis/charts/donut-chart'

describe('DonutChart', () => {
  it('세그먼트별 비율과 라벨을 노출한다', () => {
    const markup = renderToStaticMarkup(
      createElement(DonutChart, {
        segments: [
          { label: '남성', value: 60 },
          { label: '여성', value: 40 },
        ],
        ariaLabel: '성별 분포',
      }),
    )
    expect(markup).toContain('남성')
    expect(markup).toContain('여성')
    expect(markup).toContain('60%')
    expect(markup).toContain('path') // 도넛 arc
  })

  it('세그먼트가 없으면 데이터 없음을 안내한다', () => {
    const markup = renderToStaticMarkup(
      createElement(DonutChart, { segments: [], ariaLabel: '성별 분포' }),
    )
    expect(markup).toContain('데이터 없음')
  })
})
