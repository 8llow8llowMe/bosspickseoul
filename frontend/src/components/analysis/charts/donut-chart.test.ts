import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import DonutChart from '@/components/analysis/charts/donut-chart'
import { toGenderSegments } from '@/lib/analysis/chart-data'

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

  it('여성만 데이터가 있으면 원형 링과 여성 색상 토큰을 사용한다', () => {
    const markup = renderToStaticMarkup(
      createElement(DonutChart, {
        segments: toGenderSegments(null, 40),
        ariaLabel: '성별 분포',
      }),
    )
    expect(markup).toContain('여성')
    expect(markup).toContain('var(--color-chart-female)')
    expect(markup).toContain('<circle')
  })

  it('100/0 분포에서도 남성 세그먼트가 원형 링으로 노출된다', () => {
    const markup = renderToStaticMarkup(
      createElement(DonutChart, {
        segments: [
          { label: '남성', value: 100 },
          { label: '여성', value: 0 },
        ],
        ariaLabel: '성별 분포',
      }),
    )
    expect(markup).toContain('<circle')
    expect(markup).toContain('var(--color-primary-600)')
  })

  it('100/0 분포에서는 0%인 여성 세그먼트를 범례에서 제외한다', () => {
    const markup = renderToStaticMarkup(
      createElement(DonutChart, {
        segments: [
          { label: '남성', value: 100 },
          { label: '여성', value: 0 },
        ],
        ariaLabel: '성별 분포',
      }),
    )
    const legendItems = markup.match(/<li[^>]*>/g) ?? []
    expect(legendItems).toHaveLength(1)
    expect(markup).toContain('남성')
    expect(markup).not.toContain('여성')
    // '100%' 자체는 부분 문자열로 '0%'를 포함하므로 단어 경계로 구분해 검사한다
    expect(markup).not.toMatch(/\b0%/)
  })
})
