import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { readFileSync } from 'node:fs'
import { ServerStyleSheet } from 'styled-components'
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

describe('모바일 터치·글꼴 (#557 · #558)', () => {
  const renderCss = (size: 'sm' | 'md'): string => {
    const sheet = new ServerStyleSheet()
    try {
      renderToStaticMarkup(
        sheet.collectStyles(
          createElement(AnalysisPeriodSelect, {
            value: '20261',
            range: RANGE,
            onChange: () => {},
            size,
          }),
        ),
      )
      return sheet.getStyleTags().replace(/\s+/g, '')
    } finally {
      sheet.seal()
    }
  }

  it.each(['sm', 'md'] as const)(
    '%s 는 ≤1024px 에서 44px 높이·16px 글꼴이다 (결과 가로 탭 바와 같은 경계)',
    size => {
      expect(renderCss(size)).toMatch(
        /@media\(max-width:1024px\)\{\.[\w-]+\{min-height:44px;font-size:16px;\}\}/,
      )
    },
  )

  it('결과 모바일 탭은 min-height 를 덮어쓰지 않고, ≤640px 섹션 여백은 헤더(≈154px)보다 크다', () => {
    const source = readFileSync(
      new URL('./analysis-result-view.tsx', import.meta.url),
      'utf8',
    )
    const tab = source.slice(
      source.indexOf('const HeaderTabButton'),
      source.indexOf('`', source.indexOf('const HeaderTabButton') + 40),
    )

    expect(tab).not.toContain('min-height')
    expect(source).toContain('scroll-margin-top: 160px;')
  })
})
