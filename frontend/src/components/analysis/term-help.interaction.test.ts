// @vitest-environment jsdom
import { createElement } from 'react'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import AnalysisSummaryCards from '@/components/analysis/analysis-summary-cards'
import TermHelp from '@/components/analysis/term-help'
import { ANALYSIS_TERM_DEFINITIONS } from '@/lib/analysis/presentation'

/* 지표 용어 도움말(#564) — 키보드·터치로 열리고, 스크린리더가 라벨과 정의를 함께 읽는다. */

afterEach(cleanup)

const helpButton = (name: string) =>
  document.body.querySelector<HTMLButtonElement>(
    `button[aria-label="${name}"]`,
  )!

describe('TermHelp', () => {
  it('정의를 aria-controls · aria-describedby 로 잇고, 누르면 펼치고 다시 누르면 접는다', () => {
    render(
      createElement(TermHelp, {
        label: '상주인구',
        definition: ANALYSIS_TERM_DEFINITIONS.residentPopulation,
      }),
    )
    const button = helpButton('상주인구 뜻')
    const definitionId = button.getAttribute('aria-controls')!
    const definition = document.getElementById(definitionId)!

    expect(button.getAttribute('aria-describedby')).toBe(definitionId)
    expect(definition.textContent).toBe(
      ANALYSIS_TERM_DEFINITIONS.residentPopulation,
    )
    // 닫혀 있어도 설명으로 이어 둔다 — 숨긴 요소도 aria-describedby 로 가리키면 읽힌다.
    expect(definition.hidden).toBe(true)
    expect(button.getAttribute('aria-expanded')).toBe('false')

    fireEvent.click(button)
    expect(definition.hidden).toBe(false)
    expect(button.getAttribute('aria-expanded')).toBe('true')

    fireEvent.click(button)
    expect(definition.hidden).toBe(true)
  })

  it('Esc 로 펼친 정의를 접고 포커스는 버튼에 남는다', () => {
    render(
      createElement(TermHelp, {
        label: '점포 수',
        definition: ANALYSIS_TERM_DEFINITIONS.storeCount,
      }),
    )
    const button = helpButton('점포 수 뜻')
    button.focus()
    fireEvent.click(button)

    fireEvent.keyDown(button, { key: 'Escape' })

    expect(button.getAttribute('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(button)
  })
})

describe('AnalysisSummaryCards 용어 도움말', () => {
  it('정의가 있는 카드는 라벨을 이름으로, 정의를 설명으로 묶어 읽힌다', () => {
    render(
      createElement(AnalysisSummaryCards, {
        cards: [
          {
            label: '상주인구',
            value: 12000,
            unit: '명',
            definition: ANALYSIS_TERM_DEFINITIONS.residentPopulation,
          },
          { label: '일반 점포', value: 3, unit: '개' },
        ],
      }),
    )
    const groups = document.body.querySelectorAll('[role="group"]')
    expect(groups).toHaveLength(1)

    const group = groups[0]
    expect(
      document.getElementById(group.getAttribute('aria-labelledby')!)
        ?.textContent,
    ).toBe('상주인구')
    const definitionId = group.getAttribute('aria-describedby')!
    expect(document.getElementById(definitionId)?.textContent).toBe(
      ANALYSIS_TERM_DEFINITIONS.residentPopulation,
    )
    // 버튼은 같은 정의 줄을 펼치지만 설명으로는 잇지 않는다 — 카드에서 이미 읽힌다(이중 낭독 방지).
    expect(helpButton('상주인구 뜻').getAttribute('aria-controls')).toBe(
      definitionId,
    )
    expect(helpButton('상주인구 뜻').hasAttribute('aria-describedby')).toBe(
      false,
    )
    // 정의가 없는 카드에는 버튼이 없다.
    expect(
      document.body.querySelector('button[aria-label="일반 점포 뜻"]'),
    ).toBeNull()
  })
})
