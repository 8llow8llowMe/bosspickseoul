import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import RecommendComparisonVerdict from '@/components/recommend/compare/recommend-comparison-verdict'
import type { ComparisonVerdict } from '@/lib/recommend/comparison-presentation'

const verdict = (
  overrides: Partial<ComparisonVerdict> = {},
): ComparisonVerdict => ({
  recommendedSideName: '역삼역',
  summary: null,
  businessFitSummary: null,
  reasons: [],
  cautions: [],
  highlights: [],
  disclaimer: null,
  ...overrides,
})

const render = (overrides: Partial<ComparisonVerdict> = {}) =>
  renderToStaticMarkup(
    createElement(RecommendComparisonVerdict, {
      verdict: verdict(overrides),
      leftName: '역삼역',
      rightName: '선릉역',
    }),
  )

describe('RecommendComparisonVerdict', () => {
  it('추천 면책 문구가 있으면 리포트 안에 그대로 적는다', () => {
    const markup = render({
      disclaimer:
        '추천은 핵심 지표의 단순 우위 개수를 비교한 참고 결과이며 수익이나 창업 성과를 보장하지 않습니다.',
    })

    expect(markup).toContain(
      '추천은 핵심 지표의 단순 우위 개수를 비교한 참고 결과이며 수익이나 창업 성과를 보장하지 않습니다.',
    )
    expect(markup).toContain('role="note"')
  })

  it('면책 문구가 없으면(구버전 응답) 기존 안내 문구로 물러난다', () => {
    const markup = render()

    expect(markup).toContain('역삼역·선릉역의 분기 데이터로 계산한 결과예요.')
    expect(markup).toContain('업종과 창업 계획에 따라 다르게 읽힐 수 있어요.')
  })

  /* 단위가 든 문자열이다 — 숫자를 다시 꺼내 바꾸지 않고 받은 문장 그대로 적는다. */
  it('추천 이유는 단위 포함 문자열을 그대로 적는다', () => {
    const reason =
      '역삼역이(가) 총 매출액 지표에서 선릉역보다 우세합니다(역삼역: 293,433,501원, 선릉역: 43,267,840원).'
    const markup = render({ reasons: [reason] })

    expect(markup).toContain(reason)
  })
})
