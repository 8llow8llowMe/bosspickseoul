import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { ServerStyleSheet } from 'styled-components'
import { describe, expect, it } from 'vitest'

import ToolFlowBoard from '@/components/home/tool-flow-board'
import { STORY_STEPS } from '@/components/home/story-steps'

const render = () => renderToStaticMarkup(createElement(ToolFlowBoard))

const renderStyles = (): string => {
  const styleSheet = new ServerStyleSheet()

  try {
    renderToStaticMarkup(styleSheet.collectStyles(createElement(ToolFlowBoard)))
    return styleSheet.getStyleTags()
  } finally {
    styleSheet.seal()
  }
}

/*
 * 이 서비스가 네 도구로 이루어져 있다는 사실을 말하는 곳이 판단 흐름 섹션 하나뿐이었고,
 * 그것이 3.2 화면 뒤에서 시작했다. 보드가 그 거리를 1.0 화면으로 당긴다.
 */
describe('ToolFlowBoard', () => {
  it('네 단계를 모두 그리고 각 도구로 보낸다', () => {
    const html = render()

    for (const step of STORY_STEPS) {
      expect(html).toContain(step.title)
      expect(html).toContain(`href="${step.tool.href}"`)
    }
  })

  /* 홈 본문에서 링크가 0개인 도구가 있어서는 안 된다(home.md S2 #10). */
  it('네 라우트가 서로 다르다 — 한 도구만 두 번 나오지 않는다', () => {
    const hrefs = STORY_STEPS.map(step => step.tool.href)

    expect(new Set(hrefs).size).toBe(4)
  })

  it('단계 번호를 순서대로 적는다', () => {
    const html = render()
    const steps = [...html.matchAll(/>(0[1-4])</g)].map(match => match[1])

    expect(steps).toEqual(['01', '02', '03', '04'])
  })

  /*
   * 화살표는 4열일 때만 둔다. 2열로 접히면 다음 줄을 가리키게 되고, D9-1 에서 겪은
   * 「화살표가 다음 노드 배경에 덮여 잘리는」 문제도 같은 조건에서 난다.
   */
  it('좁은 화면에서는 진행 화살표를 감춘다', () => {
    const css = renderStyles().replace(/\s+/g, '')

    // 화살표 클래스 규칙 뒤에 붙은 미디어쿼리에서 감춰지는지 본다.
    expect(css).toMatch(
      /right:-12px;[^@]*@media\(max-width:900px\)\{\.\w+\{display:none;\}\}/,
    )
  })

  /* 스크롤에 기대면 자동화에서 검증할 수 없다(interaction-polish D8-10). */
  it('보드는 셸 폭을 쓴다', () => {
    expect(renderStyles().replace(/\s+/g, '')).toContain('width:var(--w-shell)')
  })
})
