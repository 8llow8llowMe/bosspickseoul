import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import SimulationSummaryBar, {
  type SimulationSummaryBarProps,
} from '@/components/simulation/simulation-summary-bar'

const render = (overrides: Partial<SimulationSummaryBarProps> = {}) =>
  renderToStaticMarkup(
    createElement(SimulationSummaryBar, {
      totalPrice: null,
      reportHref: null,
      gap: null,
      isPending: false,
      onCalculate: () => {},
      onViewResult: () => {},
      ...overrides,
    }),
  )

describe('SimulationSummaryBar', () => {
  it('계산 전에는 남은 조건과 계산 CTA를 보여준다', () => {
    const markup = render({ gap: '창업할 업종을 선택해 주세요' })

    expect(markup).toContain('창업할 업종을 선택해 주세요')
    expect(markup).toContain('계산하기')
    expect(markup).not.toContain('자세히')
    // 조건이 남아 있으면 계산할 수 없다.
    expect(markup).toContain('disabled')
  })

  it('조건이 다 차면 CTA가 열린다', () => {
    const markup = render({ gap: null })

    expect(markup).toContain('조건을 다 골랐어요. 계산해 보세요')
    expect(markup).not.toContain('disabled')
  })

  it('계산 후에는 금액과 결과로 가는 버튼을 보여준다', () => {
    const markup = render({ totalPrice: 23_450, gap: null })

    expect(markup).toContain('예상 총 창업 비용')
    expect(markup).toContain('2억 3,450만원')
    expect(markup).toContain('자세히')
    expect(markup).not.toContain('계산하기')
  })

  it('계산 후 reportHref가 있으면 상세 리포트로 가는 링크를 준다', () => {
    const markup = render({
      totalPrice: 23_450,
      reportHref: '/simulation/report?franchisee=false',
      gap: null,
    })

    expect(markup).toContain('자세히')
    expect(markup).toContain('/simulation/report?franchisee=false')
  })
})
