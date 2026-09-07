import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
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
        label: '월 매출',
        value: 1_793_934_939,
        unit: '원',
        context: { text: '역삼1동 전체의 4.3%', ratio: 0.043 },
      },
    ])

    expect(html).toContain('월 매출')
    expect(html).toContain('역삼1동 전체의 4.3%')
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
