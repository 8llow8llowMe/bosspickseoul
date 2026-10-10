import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import DistrictTooltip from '@/components/home/district-tooltip'
import type { DistrictRhythm } from '@/components/home/district-rhythm'

const rhythm = (changeRate: number | null): DistrictRhythm => ({
  latest: { periodCode: '20261', total: 145_280_452, changeRate },
  indicatorName: null,
  slots: [],
  days: [],
  weekendDeltaPct: null,
})

const render = (changeRate: number | null) =>
  renderToStaticMarkup(
    createElement(
      'svg',
      null,
      createElement(DistrictTooltip, {
        x: 0,
        y: 0,
        name: '강남구',
        state: { status: 'ready', rhythm: rhythm(changeRate) },
      }),
    ),
  )

/*
 * 결정 D-1(DESIGN.md §Charts 「증감은 좋고 나쁨으로 칠한다」). 히어로 툴팁의 유동인구 증감은 극성
 * (높을수록 좋다)으로 칠하고, 색만으로 말하지 않도록 「개선/악화」 글자를 같이 둔다.
 */
describe('DistrictTooltip — 증감(D-1)', () => {
  it('유동인구가 늘면 개선이고 positive 글자색이다', () => {
    const html = render(0.7)

    expect(html).toContain('+0.7% 개선')
    expect(html).toContain('data-change-tone="positive"')
    expect(html).toContain('fill:var(--color-positive-text)')
    // 비교 기준은 서버 기준(직전 분기)과 같은 말이다 — 구별현황·01 단계와 같은 `STATUS_CHANGE_BASIS`.
    expect(html).toContain('직전 분기 대비')
  })

  it('유동인구가 줄면 악화이고 negative 글자색이다', () => {
    const html = render(-1.1)

    expect(html).toContain('-1.1% 악화')
    expect(html).toContain('data-change-tone="negative"')
    expect(html).toContain('fill:var(--color-negative-text)')
  })

  it('변동 없음은 무채색이고 개선/악화를 말하지 않는다', () => {
    const html = render(0)

    expect(html).toContain('data-change-tone="neutral"')
    expect(html).not.toContain('개선')
    expect(html).not.toContain('악화')
  })

  it('비교할 직전 분기가 없으면 증감 칸을 그리지 않는다', () => {
    const html = render(null)

    expect(html).not.toContain('data-change-tone')
    expect(html).not.toContain('분기 대비')
  })
})
