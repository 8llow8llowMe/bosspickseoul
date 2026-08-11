import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import AnalysisPeriodSelect from '@/components/analysis/analysis-period-select'

describe('AnalysisPeriodSelect', () => {
  it('현재 기간 코드에서 연도·분기 옵션을 렌더한다', () => {
    const markup = renderToStaticMarkup(
      createElement(AnalysisPeriodSelect, {
        value: '20233',
        onChange: () => {},
      }),
    )
    expect(markup).toContain('2021년')
    expect(markup).toContain('2023년')
    expect(markup).toContain('1분기')
    expect(markup).toContain('4분기')
    // 현재 선택(2023년, 3분기)이 selected로 표시된다
    expect(markup).toMatch(/value="2023"[^>]*selected/)
    expect(markup).toMatch(/value="3"[^>]*selected/)
  })
})
