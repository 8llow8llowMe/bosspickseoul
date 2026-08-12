// @vitest-environment jsdom
import { createElement } from 'react'
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { AnalysisResultModalSurface } from '@/components/analysis/analysis-result-modal'

afterEach(cleanup)

describe('AnalysisResultModalSurface (portal)', () => {
  // FIX #1: 마운트 이펙트가 실행된 후에야 document.body로 포털되므로 jsdom +
  // @testing-library/react로 실제 DOM에 마운트해 확인한다(renderToStaticMarkup은
  // 이펙트를 실행하지 않아 null만 나온다 — 소스 계약은 analysis-result-modal.test.ts).
  it('접근 가능한 dialog surface를 document.body에 포털로 마운트한다', () => {
    render(
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

    const dialog = document.body.querySelector('[role="dialog"]')
    expect(dialog).not.toBeNull()
    expect(dialog?.getAttribute('aria-modal')).toBe('true')
    expect(document.body.textContent).toContain('닫기')
  })
})
