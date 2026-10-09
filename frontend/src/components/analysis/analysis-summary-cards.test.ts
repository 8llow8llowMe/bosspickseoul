import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { ServerStyleSheet } from 'styled-components'
import { describe, expect, it } from 'vitest'

import AnalysisSummaryCards, {
  toBarWidth,
  type SummaryCard,
} from '@/components/analysis/analysis-summary-cards'

const render = (cards: SummaryCard[]) =>
  renderToStaticMarkup(createElement(AnalysisSummaryCards, { cards }))

describe('toBarWidth', () => {
  /*
   * 막대는 「전체 중 이만큼」을 뜻한다. 1 을 넘는 값(배수)이나 음수를 그리면 **화면이
   * 거짓말을 한다** — 호출부가 실수로 넘겨도 여기서 막는다.
   */
  it('0~1 밖의 값은 막대를 그리지 않는다', () => {
    expect(toBarWidth(1.4)).toBeNull()
    expect(toBarWidth(-0.2)).toBeNull()
    expect(toBarWidth(Number.NaN)).toBeNull()
    expect(toBarWidth(undefined)).toBeNull()
  })

  /* 0 이 아닌데 폭이 0 이면 「있는데 안 보이는」 막대가 된다. */
  it('아주 작은 비율도 보이게 최소 폭을 준다', () => {
    expect(toBarWidth(0.0001)).toBe(2)
    expect(toBarWidth(0)).toBe(0)
    expect(toBarWidth(0.5)).toBe(50)
    expect(toBarWidth(1)).toBe(100)
  })
})

describe('AnalysisSummaryCards', () => {
  it('값과 맥락 문구를 함께 보여 준다', () => {
    const html = render([
      {
        label: '점포당 월 매출',
        value: 44_665_600,
        unit: '원',
        context: { text: '커피-음료 전체 26억 3527만원' },
      },
    ])

    expect(html).toContain('점포당 월 매출')
    expect(html).toContain('4466만원')
    // 합계는 분모(업종 전체)를 밝혀 캡션으로 남는다(#561).
    expect(html).toContain('커피-음료 전체 26억 3527만원')
  })

  /* #561 — 점포 수 0 은 결측이 아니라 사실이다. 「데이터 없음」과 다르게 적는다. */
  it('값이 없고 emptyText 가 있으면 그 말을 적는다', () => {
    const html = render([
      {
        label: '점포당 월 매출',
        value: null,
        unit: '원',
        emptyText: '점포 없음',
      },
    ])

    expect(html).toContain('점포 없음')
    expect(html).not.toContain('데이터 없음')
  })

  it('값이 있으면 emptyText 를 쓰지 않는다 — 0 원도 값이다', () => {
    const html = render([
      { label: '점포당 월 매출', value: 0, unit: '원', emptyText: '점포 없음' },
    ])

    expect(html).toContain('0원')
    expect(html).not.toContain('점포 없음')
  })

  /*
   * 맥락이 없는 카드도 같은 높이여야 한다. 값마다 줄이 생겼다 사라지면 같은 행의
   * 숫자들이 서로 다른 높이에 놓여 훑기 어렵다(홈 인사이트 슬롯 R2 와 같은 이유).
   */
  it('맥락이 없어도 자리를 비워 둔다', () => {
    const skeleton = (html: string) =>
      (html.match(/<(div|span|strong)\b/g) ?? []).join(',')

    const withContext = render([
      {
        label: '점포 수',
        value: 13,
        unit: '개',
        context: { text: '같은 업종 14개' },
      },
    ])
    const withoutContext = render([
      { label: '상주인구', value: 483, unit: '명', context: null },
    ])

    expect(withoutContext).toContain('483명')
    // 맥락 문구(span)만 빠지고 그것을 담는 자리(div)는 남는다.
    expect(skeleton(withoutContext)).toBe(
      skeleton(withContext).replace(/,<span$/, ''),
    )
  })

  it('데이터가 없으면 값 자리에 그대로 적는다', () => {
    expect(render([{ label: '학교', value: null, unit: '개' }])).toContain(
      '데이터 없음',
    )
  })
})

describe('AnalysisSummaryCards 배치 (#482)', () => {
  const styles = () => {
    const sheet = new ServerStyleSheet()
    try {
      renderToStaticMarkup(
        sheet.collectStyles(
          createElement(AnalysisSummaryCards, {
            cards: [{ label: '점포당 월 매출', value: 1, unit: '원' }],
          }),
        ),
      )
      return sheet.getStyleTags().replace(/\s+/g, '')
    } finally {
      sheet.seal()
    }
  }

  /* 뷰포트가 아니라 카드 묶음 폭으로 열을 정한다 — 같은 카드가 사이드바 유무와 무관하게 같은 판단을 한다. */
  it('열 수를 카드 묶음 폭으로 정하고 좁아도 1열로 내리지 않는다', () => {
    const css = styles()

    expect(css).toContain('container:summary-cards/inline-size')
    expect(css).toContain('@containersummary-cards(max-width:639px){.')
    expect(css).toContain('grid-template-columns:repeat(2,minmax(0,1fr))')
    expect(css).not.toContain('grid-template-columns:1fr')
    expect(css).not.toContain('@media')
  })
})
