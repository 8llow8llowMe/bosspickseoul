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

  it('aiReport가 있으면 진입 칩과 리포트 헤더 제목을 렌더한다', () => {
    const markup = renderToStaticMarkup(
      createElement(
        AnalysisMobileSheet,
        {
          stepLabel: '자치구 선택',
          summary: '서울 전체',
          aiReport: {
            title: '강남구 AI 리포트',
            content: createElement('div', null, 'AI_BODY'),
          },
        },
        createElement('div', null, '선택 본문'),
      ),
    )

    expect(markup).toContain('AI 리포트')
    expect(markup).toContain('강남구 AI 리포트')
  })

  it('aiReport가 없으면 진입 칩을 렌더하지 않는다', () => {
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

    expect(markup).not.toContain('AI 리포트 보기')
  })
})
