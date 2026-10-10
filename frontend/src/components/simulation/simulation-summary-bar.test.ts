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
      progress: { done: 4, total: 4 },
      isPending: false,
      onCalculate: () => {},
      onViewResult: () => {},
      ...overrides,
    }),
  )

describe('SimulationSummaryBar', () => {
  /*
    1023px 이하에서는 본문 결과 패널이 계산 전에 숨으므로, 이 바가 「얼마나 남았는지」를
    숫자로도 보여 준다. 분모는 화면에 놓인 섹션 수다(프랜차이즈 5).
  */
  it('계산 전에는 진행도·남은 조건과 계산 CTA를 보여준다', () => {
    const markup = render({
      gap: '창업할 업종을 선택해 주세요',
      progress: { done: 2, total: 5 },
    })

    expect(markup).toMatch(/aria-hidden="true"[^>]*>2\/5<\/span>/)
    // 「2/5」는 낭독기가 날짜·분수로 읽을 수 있어 낭독용 문장을 따로 둔다.
    expect(markup).toContain('5단계 중 2단계 완료.')
    expect(markup).toContain('창업할 업종을 선택해 주세요')
    expect(markup).toContain('계산하기')
    expect(markup).not.toContain('리포트 보기')
    // 조건이 남아 있으면 계산할 수 없다.
    expect(markup).toContain('disabled')
  })

  it('조건이 다 차면 CTA가 열린다', () => {
    const markup = render({ gap: null })

    expect(markup).toContain('조건을 다 골랐어요. 계산해 보세요')
    expect(markup).not.toContain('disabled')
  })

  /* #604 — 조건이 다 차면 화면이 스스로 계산한다. 그동안 바는 계산 중이라고 말한다. */
  it('자동 계산 중에는 계산하고 있다고 알린다', () => {
    const markup = render({ gap: null, isPending: true })

    expect(markup).toContain('조건을 다 골랐어요. 비용을 계산하고 있어요')
  })

  it('이미 보낸 조건이면 버튼은 「다시 계산」이다', () => {
    const markup = render({ gap: null, calculateLabel: '다시 계산' })

    expect(markup).toContain('다시 계산')
    expect(markup).not.toContain('계산하기')
  })

  it('계산 후에는 금액과 결과로 가는 버튼을 보여준다', () => {
    const markup = render({ totalPrice: 23_450, gap: null })

    expect(markup).toContain('예상 총 창업 비용')
    expect(markup).toContain('2억 3,450만원')
    // reportHref 가 없으면 리포트로 갈 수 없으니 본문 결과로 데려간다 — 라벨도 그 동작대로다.
    expect(markup).toContain('결과 보기')
    expect(markup).not.toContain('리포트 보기')
    expect(markup).not.toContain('계산하기')
  })

  it('계산 후 reportHref가 있으면 상세 리포트로 가는 링크를 준다', () => {
    const markup = render({
      totalPrice: 23_450,
      reportHref: '/simulation/report?franchisee=false',
      gap: null,
    })

    expect(markup).toContain('리포트 보기')
    expect(markup).toContain('/simulation/report?franchisee=false')
  })
})
