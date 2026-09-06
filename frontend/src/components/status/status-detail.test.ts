import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { ServerStyleSheet } from 'styled-components'
import { describe, expect, it } from 'vitest'

import { StatGrid } from './status-detail'

const squeeze = (css: string): string => css.replace(/\s+/g, '')

const renderStyles = (element: ReturnType<typeof createElement>): string => {
  const styleSheet = new ServerStyleSheet()

  try {
    renderToStaticMarkup(styleSheet.collectStyles(element))
    return styleSheet.getStyleTags()
  } finally {
    styleSheet.seal()
  }
}

/**
 * repeat(auto-fit, …) 은 열 수에 상한이 없다. CSS 에 max-columns 가 없으므로
 * 폭 상한과 짝지어야 한다. 셸에서 상한을 걷어낸 뒤 이 그리드는 2560px 칸에서
 * 18열까지 갔다 — 최소 트랙 폭만으로는 폭주를 막지 못한다.
 */
describe('/status 상세카드 지표 그리드', () => {
  it('auto-fit 그리드는 폭 상한과 짝을 이룬다', () => {
    const css = squeeze(renderStyles(createElement(StatGrid)))

    expect(css).toContain('repeat(auto-fit,minmax(200px,1fr))')
    expect(css).toContain('max-width:var(--w-wide)')
  })
})
