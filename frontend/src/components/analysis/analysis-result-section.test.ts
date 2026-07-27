import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import AnalysisMetricList from '@/components/analysis/analysis-metric-list'
import AnalysisResultSection from '@/components/analysis/analysis-result-section'

describe('AnalysisResultSection', () => {
  it('오류 섹션만 재시도 상태로 격리한다', () => {
    const markup = renderToStaticMarkup(
      createElement(
        AnalysisResultSection,
        {
          title: '매출',
          loading: false,
          error: true,
          empty: false,
          onRetry: () => undefined,
        },
        createElement('p', null, '성공 내용'),
      ),
    )

    expect(markup).toContain('매출 정보를 불러오지 못했어요')
    expect(markup).toContain('다시 시도')
    expect(markup).not.toContain('성공 내용')
  })
})

describe('AnalysisMetricList', () => {
  it('숫자 텍스트와 접근 가능한 막대 값을 함께 제공한다', () => {
    const markup = renderToStaticMarkup(
      createElement(AnalysisMetricList, {
        rows: [
          { label: '월', value: 10 },
          { label: '화', value: null },
        ],
        unit: '명',
      }),
    )

    expect(markup).toContain('10명')
    expect(markup).toContain('데이터 없음')
    expect(markup).toContain('aria-valuenow="10"')
  })
})
