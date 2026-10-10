import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
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

const here = path.dirname(fileURLToPath(import.meta.url))
const readSource = (relative: string) =>
  readFileSync(path.resolve(here, relative), 'utf-8')

describe('AiReportLockCard', () => {
  it('가치 카피와 로그인 CTA(returnUrl 포함)를 노출한다', () => {
    const markup = render('commercial')
    expect(markup).toContain('/login?redirect=%2Fanalysis')
    expect(markup).toContain('로그인') // CTA
  })
  it('blur 샘플 영역은 aria-hidden으로 감춘다', () => {
    expect(render('district')).toContain('aria-hidden')
  })
  it('로그인 CTA 는 터치 대상 44px 를 지킨다', () => {
    expect(readSource('./ai-report-lock-card.tsx')).toMatch(
      /const Cta = styled\(Link\)`[^`]*min-height: 44px;/,
    )
  })
})

describe('잠금 카드는 패널 안에서만 뜬다 (#586)', () => {
  it('지도 셸은 잠금 카드를 지도 위에 직접 렌더하지 않는다', () => {
    const shell = readSource('../analysis-map-shell.tsx')
    expect(shell).not.toContain('AiReportLockCard')
    expect(shell).not.toContain('ai-report-lock-card')
  })
  it('게스트 잠금은 패널 본문(AiReportBody)의 인사이트 칸이 맡는다', () => {
    expect(readSource('./report-insight-section.tsx')).toContain(
      '<AiReportLockCard',
    )
  })
})
