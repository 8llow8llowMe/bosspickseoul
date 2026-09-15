import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import AnalysisPeriodSelect from '@/components/analysis/analysis-period-select'

describe('AnalysisPeriodSelect', () => {
  it('최신 연도에서는 적재된 분기까지만 연다', () => {
    const markup = renderToStaticMarkup(
      createElement(AnalysisPeriodSelect, {
        value: '20261',
        onChange: () => {},
      }),
    )
    expect(markup).toContain('2021년')
    expect(markup).toContain('2026년')
    // 2026년은 1분기만 적재되어 있다 — 없는 분기를 고를 수 있으면 빈 화면이 된다.
    expect(markup).toContain('1분기')
    expect(markup).not.toContain('2분기')
    expect(markup).not.toContain('4분기')
    // 현재 선택(2026년, 1분기)이 selected로 표시된다
    expect(markup).toMatch(/value="2026"[^>]*selected/)
    expect(markup).toMatch(/value="1"[^>]*selected/)
  })

  it('지난 연도에서는 네 분기를 모두 연다', () => {
    const markup = renderToStaticMarkup(
      createElement(AnalysisPeriodSelect, {
        value: '20233',
        onChange: () => {},
      }),
    )
    expect(markup).toContain('1분기')
    expect(markup).toContain('2분기')
    expect(markup).toContain('3분기')
    expect(markup).toContain('4분기')
    expect(markup).toMatch(/value="2023"[^>]*selected/)
    expect(markup).toMatch(/value="3"[^>]*selected/)
  })
})
