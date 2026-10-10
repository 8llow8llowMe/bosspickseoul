import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import AiReportCard from '@/components/analysis/ai-report/ai-report-card'

describe('AiReportCard (AI 요약 칩, #586)', () => {
  it('「AI 요약 보기」 한 줄 버튼이고 대상 이름은 접근 이름에 싣는다', () => {
    const markup = renderToStaticMarkup(
      createElement(AiReportCard, { targetName: '삼평동', onOpen: () => {} }),
    )
    expect(markup).toContain('<button')
    expect(markup).toContain('AI 요약 보기')
    expect(markup).toContain('aria-label="삼평동 AI 요약 보기"')
  })

  it('대상 이름이 비면 접근 이름도 「AI 요약 보기」만 쓴다', () => {
    const markup = renderToStaticMarkup(
      createElement(AiReportCard, { targetName: '', onOpen: () => {} }),
    )
    expect(markup).toContain('aria-label="AI 요약 보기"')
  })
})
