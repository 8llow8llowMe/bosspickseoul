import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import AiReportCard from '@/components/analysis/ai-report/ai-report-card'

describe('AiReportCard', () => {
  it('대상 이름과 분석하기 문구를 담은 버튼을 렌더한다', () => {
    const markup = renderToStaticMarkup(
      createElement(AiReportCard, { targetName: '삼평동', onOpen: () => {} }),
    )
    expect(markup).toContain('삼평동')
    expect(markup).toContain('AI 리포트 분석하기')
    expect(markup).toContain('<button')
  })
})
