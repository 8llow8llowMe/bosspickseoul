import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import AiReportLockCard from '@/components/analysis/ai-report/ai-report-lock-card'

const render = (level: 'district' | 'commercial') =>
  renderToStaticMarkup(
    createElement(AiReportLockCard, {
      level,
      loginHref: '/login?redirect=%2Fanalysis',
    }),
  )

describe('AiReportLockCard', () => {
  it('가치 카피와 로그인 CTA(returnUrl 포함)를 노출한다', () => {
    const markup = render('commercial')
    expect(markup).toContain('/login?redirect=%2Fanalysis')
    expect(markup).toContain('로그인') // CTA
  })
  it('blur 샘플 영역은 aria-hidden으로 감춘다', () => {
    expect(render('district')).toContain('aria-hidden')
  })
})
