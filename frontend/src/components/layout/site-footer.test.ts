import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { ServerStyleSheet } from 'styled-components'
import { describe, expect, it } from 'vitest'

import SiteFooter from './site-footer'

const renderFooter = () => {
  const styleSheet = new ServerStyleSheet()

  try {
    return {
      markup: renderToStaticMarkup(
        styleSheet.collectStyles(createElement(SiteFooter)),
      ),
      styles: styleSheet.getStyleTags(),
    }
  } finally {
    styleSheet.seal()
  }
}

describe('SiteFooter', () => {
  it('status main 바로 뒤에 있는 footer만 모바일에서 숨긴다', () => {
    const { styles } = renderFooter()

    expect(styles).toMatch(/@media \(max-width:\s*1023px\)/)
    expect(styles).toMatch(
      /main\[data-hide-mobile-footer=['"]true['"]\]\+[^}]+display:none/,
    )
  })

  it('일반 footer 마크업은 항상 렌더링한다', () => {
    const { markup } = renderFooter()

    expect(markup).toContain('<footer')
    expect(markup).toContain('NowDoBoss')
  })
})
