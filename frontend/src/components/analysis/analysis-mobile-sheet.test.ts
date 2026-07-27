import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import AnalysisMobileSheet from '@/components/analysis/analysis-mobile-sheet'

describe('AnalysisMobileSheet', () => {
  it('기본 접힘 상태와 접근 가능한 토글을 제공한다', () => {
    const markup = renderToStaticMarkup(
      createElement(
        AnalysisMobileSheet,
        {
          stepLabel: '자치구 선택',
          summary: '서울 전체',
        },
        createElement('div', null, '선택 본문'),
      ),
    )

    expect(markup).toContain('aria-expanded="false"')
    expect(markup).toContain('선택 패널 펼치기')
    expect(markup).toContain('자치구 선택')
  })
})
