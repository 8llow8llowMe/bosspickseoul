import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import ReportMetricCards from './report-metric-cards'
import type { MetricCardModel } from '@/lib/analysis/report-section-state'

describe('ReportMetricCards variant', () => {
  it('variant prop과 compact 2열 분기를 노출한다', () => {
    const src = readFileSync(
      fileURLToPath(new URL('./report-metric-cards.tsx', import.meta.url)),
      'utf8',
    )
    expect(src).toContain("variant?: 'full' | 'compact'")
    expect(src).toContain('$variant')
    expect(src).toContain("'repeat(2, minmax(0, 1fr))'")
  })
})

/* D-1 — 증감은 좋고 나쁨으로 칠하고, 색만으로 말하지 않는다(부호·화살표 + 「개선/악화」). */
describe('ReportMetricCards 증감 표시', () => {
  const render = (cards: MetricCardModel[]) =>
    renderToStaticMarkup(createElement(ReportMetricCards, { cards }))

  it('좋아진 값은 「개선」, 나빠진 값은 「악화」를 부호·화살표와 함께 보인다', () => {
    const improved = render([
      {
        label: '성장률',
        display: '+18.2%',
        loading: false,
        tone: 'positive',
        arrow: '▲',
        toneLabel: '개선',
      },
    ])
    expect(improved).toContain('개선')
    expect(improved).toContain('+18.2%')
    expect(improved).toMatch(/aria-hidden="true">▲ </)

    const worsened = render([
      {
        label: '성장률',
        display: '-5.0%',
        loading: false,
        tone: 'negative',
        arrow: '▼',
        toneLabel: '악화',
      },
    ])
    expect(worsened).toContain('악화')
  })

  it('보합·데이터 없음은 판단 글자 없이 그린다', () => {
    const markup = render([
      {
        label: '성장률',
        display: '데이터 없음',
        loading: false,
        tone: 'neutral',
        arrow: null,
        toneLabel: '',
      },
    ])
    expect(markup).not.toContain('개선')
    expect(markup).not.toContain('악화')
    expect(markup).not.toContain('▲')
  })
})
