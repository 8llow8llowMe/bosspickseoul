import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { AnalysisResultModalSurface } from '@/components/analysis/analysis-result-modal'

describe('AnalysisResultModalSurface', () => {
  it('접근 가능한 dialog surface를 제공한다', () => {
    const markup = renderToStaticMarkup(
      createElement(
        AnalysisResultModalSurface,
        { onClose: () => undefined },
        createElement(
          'button',
          { 'aria-label': '상권 분석 결과 닫기' },
          '닫기',
        ),
      ),
    )

    expect(markup).toContain('role="dialog"')
    expect(markup).toContain('aria-modal="true"')
    expect(markup).toContain('상권 분석 결과 닫기')
  })

  it('모달 서피스는 optional ariaLabel을 받는다', () => {
    const src = readFileSync(
      fileURLToPath(new URL('./analysis-result-modal.tsx', import.meta.url)),
      'utf8',
    )
    expect(src).toContain('ariaLabel')
    expect(src).toContain("ariaLabel = '상권 분석 결과'")
  })
})
