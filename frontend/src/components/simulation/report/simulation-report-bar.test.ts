import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import SimulationReportBar from '@/components/simulation/report/simulation-report-bar'
import type { SimulationSaveState } from '@/lib/simulation/use-simulation-save'

const save = (
  overrides: Partial<SimulationSaveState> = {},
): SimulationSaveState => ({
  hasHydrated: true,
  needsLogin: false,
  saved: false,
  isPending: false,
  error: null,
  save: () => {},
  ...overrides,
})

const render = (overrides: Partial<SimulationSaveState> = {}) =>
  renderToStaticMarkup(
    createElement(SimulationReportBar, {
      totalPrice: 24_002,
      save: save(overrides),
      currentHref: '/simulation/report?districtCode=11440',
      compareHref: '/simulation/compare?a.districtCode=11440',
    }),
  )

/*
 * R6 — 375 에서 리포트는 약 2,800px 인데 CTA 가 첫 카드에만 있었다. 바가 총액과 다음 행동을
 * 늘 화면 아래에 둔다.
 */
describe('SimulationReportBar (R6)', () => {
  it('총액과 저장·비교를 한 줄에 둔다', () => {
    const html = render()

    expect(html).toContain('예상 총 창업 비용')
    expect(html).toContain('2억 4,002만원')
    expect(html).toContain('결과 저장')
    expect(html).toContain('href="/simulation/compare?a.districtCode=11440"')
  })

  it('비교는 아이콘 버튼이라 접근 가능한 이름을 따로 준다', () => {
    expect(render()).toMatch(/<a[^>]*aria-label="다른 조건과 비교"/)
  })

  it('로그인 유도는 아이콘 없이 그린다 — 375 에서 총액 칸이 말줄임되지 않게', () => {
    const html = render({ needsLogin: true })

    // 아이콘 칸(IconSlot)이 없으면 a 의 첫 내용이 바로 글자다.
    expect(html).toMatch(
      /<a[^>]*href="\/login[^"]*"[^>]*>저장하려면 로그인<\/a>/,
    )
  })

  it('바 전체가 이름 있는 영역이다', () => {
    expect(render()).toMatch(/role="region"[^>]*aria-label="리포트 요약"/)
  })

  it('저장 결과 한 줄을 바 안에 띄운다', () => {
    expect(render({ saved: true })).toContain('저장했어요')
  })
})
