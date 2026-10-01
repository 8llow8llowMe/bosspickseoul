import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import SimulationSimilarFranchisees from '@/components/simulation/report/simulation-similar-franchisees'
import type { SimulationSimilarFranchisee } from '@/types/simulation'

const item = (
  overrides: Partial<SimulationSimilarFranchisee> = {},
): SimulationSimilarFranchisee => ({
  franchiseeId: 7,
  brandName: '테스트브랜드',
  totalPrice: 6_948,
  subscription: 550,
  education: 330,
  deposit: 400,
  etc: 2_200,
  interior: 0,
  ...overrides,
})

const items = [
  item(),
  item({ franchiseeId: 9, brandName: '평화다방', totalPrice: 6_968 }),
]

const render = (selectedFranchiseeId: number | null) =>
  renderToStaticMarkup(
    createElement(SimulationSimilarFranchisees, {
      items,
      selectedFranchiseeId,
    }),
  )

describe('SimulationSimilarFranchisees', () => {
  it('표와 모바일 카드를 같은 항목으로 그린다 (R7)', () => {
    const html = render(null)

    // 표(≥768)와 카드(≤767)를 둘 다 그리고 CSS 가 고른다. 브랜드는 각 한 번씩.
    expect(html).toContain('<table')
    expect(html.match(/<details>/g)).toHaveLength(2)
    expect(html.match(/평화다방/g)).toHaveLength(2)
  })

  it('카드는 접힌 줄에 브랜드·합계만, 세부 5항목은 펼친 목록에 둔다', () => {
    const html = render(null)
    const card = html.slice(html.indexOf('<details>'))
    // 첫 카드의 접힌 줄만 잘라 본다. 탐욕 매칭이면 다음 카드의 </summary> 까지 넘어가 회귀를 못 잡는다.
    const summary = card.match(/<summary>(.*?)<\/summary>/)?.[1] ?? ''

    expect(summary).toContain('테스트브랜드')
    expect(summary).toContain('합계')
    expect(summary).toContain('6,948만원')
    expect(summary).not.toContain('<dt>')
    for (const label of [
      '가입비',
      '교육비',
      '가맹 보증금',
      '인테리어',
      '기타',
    ]) {
      expect(card).toContain(`<dt>${label}</dt>`)
    }
  })

  it('고른 브랜드가 목록에 있으면 표와 카드 모두에 「내 선택」을 붙인다', () => {
    const html = render(9)

    expect(html.match(/내 선택/g)).toHaveLength(2)
    expect(html).toMatch(/<tr data-selected="true">/)
  })

  it('id 가 문자열로 와도 같은 브랜드면 「내 선택」이다 — dev 응답 실측', () => {
    const html = renderToStaticMarkup(
      createElement(SimulationSimilarFranchisees, {
        items: [item({ franchiseeId: '9' as unknown as number })],
        selectedFranchiseeId: 9,
      }),
    )

    expect(html.match(/내 선택/g)).toHaveLength(2)
  })

  it('개인 창업(선택 없음)이면 「내 선택」이 없다', () => {
    const html = render(null)

    expect(html).not.toContain('내 선택')
    expect(html).not.toContain('data-selected')
  })

  it('단위가 붙은 값과 겹치는 「금액은 만원 단위예요」 문구가 없다 (R9)', () => {
    expect(render(null)).not.toContain('만원 단위예요')
  })

  it('합계 열은 사용자 총액(예상 총 창업 비용)과 이름을 나눈다 (R11)', () => {
    const html = render(null)

    expect(html).toContain('<th scope="col">합계</th>')
    expect(html).not.toContain('총비용')
  })
})
