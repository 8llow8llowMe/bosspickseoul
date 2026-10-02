import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { ServerStyleSheet } from 'styled-components'
import { describe, expect, it } from 'vitest'

import AnalysisPeriodSelect from '@/components/analysis/analysis-period-select'
import StatusPeriodSelect from './status-period-select'
import { toAnalysisPeriodRange } from '@/lib/analysis/period-catalog'

const RANGE = toAnalysisPeriodRange('20261')

const renderWithStyles = (element: ReturnType<typeof createElement>) => {
  const styleSheet = new ServerStyleSheet()

  try {
    const markup = renderToStaticMarkup(styleSheet.collectStyles(element))
    return { markup, styles: styleSheet.getStyleTags() }
  } finally {
    styleSheet.seal()
  }
}

describe('StatusPeriodSelect', () => {
  it('구별현황 문맥의 이름(기준 연도·기준 분기)으로 두 select 를 그린다', () => {
    const markup = renderToStaticMarkup(
      createElement(StatusPeriodSelect, {
        value: '20233',
        range: RANGE,
        onChange: () => undefined,
      }),
    )

    expect(markup).toContain('aria-label="기준 연도"')
    expect(markup).toContain('aria-label="기준 분기"')
    expect(markup).not.toContain('분석 연도')
    expect(markup).toMatch(/value="2023"[^>]*selected/)
    expect(markup).toMatch(/value="3"[^>]*selected/)
  })

  it('최신 연도는 적재된 분기까지만 연다', () => {
    const markup = renderToStaticMarkup(
      createElement(StatusPeriodSelect, {
        value: '20261',
        range: RANGE,
        onChange: () => undefined,
      }),
    )

    expect(markup).toMatch(/value="2026"[^>]*selected/)
    expect(markup).not.toContain('2분기')
  })

  // DESIGN.md §Touch target: 버튼 최소 36px. 모바일에서는 지표 전환 바로 위에 온다.
  it('터치 타깃을 36px 로 키운다', () => {
    const { styles } = renderWithStyles(
      createElement(StatusPeriodSelect, {
        value: '20261',
        range: RANGE,
        onChange: () => undefined,
      }),
    )

    expect(styles).toContain('min-height:36px;')
  })

  it('상권 분석 select 의 기본 이름과 크기는 그대로다', () => {
    const { markup, styles } = renderWithStyles(
      createElement(AnalysisPeriodSelect, {
        value: '20261',
        range: RANGE,
        onChange: () => undefined,
      }),
    )

    expect(markup).toContain('aria-label="분석 연도"')
    expect(markup).toContain('aria-label="분석 분기"')
    expect(styles).not.toContain('min-height:36px;')
  })
})
