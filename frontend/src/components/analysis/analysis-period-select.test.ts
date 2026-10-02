import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import AnalysisPeriodSelect from '@/components/analysis/analysis-period-select'
import { toAnalysisPeriodRange } from '@/lib/analysis/period-catalog'

/** 서버 기본 분기가 20261 일 때의 범위(period-catalog.md D4-1). */
const RANGE = toAnalysisPeriodRange('20261')

describe('AnalysisPeriodSelect', () => {
  it('최신 연도에서는 적재된 분기까지만 연다', () => {
    const markup = renderToStaticMarkup(
      createElement(AnalysisPeriodSelect, {
        value: '20261',
        range: RANGE,
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
        range: RANGE,
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

  /* 새 분기가 적재되면 상수를 올리지 않아도 상한이 따라간다. */
  it('서버 기본 분기가 바뀌면 최신 연도의 분기 상한이 따라간다', () => {
    const markup = renderToStaticMarkup(
      createElement(AnalysisPeriodSelect, {
        value: '20262',
        range: toAnalysisPeriodRange('20262'),
        onChange: () => {},
      }),
    )
    expect(markup).toContain('2분기')
    expect(markup).not.toContain('3분기')
  })

  /* URL 에 분기가 있는 화면은 카탈로그 없이도 동작해야 한다(D2-8). */
  it('범위를 모르면 지금 분기 하나만 보이고 비활성이다', () => {
    const markup = renderToStaticMarkup(
      createElement(AnalysisPeriodSelect, {
        value: '20233',
        range: null,
        onChange: () => {},
      }),
    )
    expect((markup.match(/<option/g) ?? []).length).toBe(2)
    expect(markup).toContain('2023년')
    expect(markup).toContain('3분기')
    expect((markup.match(/disabled=""/g) ?? []).length).toBe(2)
  })

  it('분기를 아직 정하지 못했으면 자리 표시만 두고 비활성이다', () => {
    const markup = renderToStaticMarkup(
      createElement(AnalysisPeriodSelect, {
        value: null,
        range: null,
        onChange: () => {},
      }),
    )
    expect(markup).toContain('>연도<')
    expect(markup).toContain('>분기<')
    expect((markup.match(/disabled=""/g) ?? []).length).toBe(2)
  })
})
