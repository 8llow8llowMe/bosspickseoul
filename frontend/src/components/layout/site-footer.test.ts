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
  it('data-hide-footer main 이후의 footer를 중간 modal 유무와 관계없이 숨긴다', () => {
    const { styles } = renderFooter()

    expect(styles).toMatch(
      /main\[data-hide-footer=['"]true['"]\]~[^}]+display:none/,
    )
  })

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
    expect(markup).toContain('BossPickSeoul')
  })
})

/** styled-components 는 선언을 압축해 내보낸다 — 공백 차이로 깨지지 않게 지운다. */
const squeeze = (css: string): string => css.replace(/\s+/g, '')

describe('SiteFooter 폭', () => {
  it('푸터는 셸 폭을 쓴다 — 헤더와 같은 틀이다', () => {
    const css = squeeze(renderFooter().styles)

    expect(css).toContain('width:var(--w-shell);')
    expect(css).not.toContain('min(1120px,calc(100%-40px))')
  })
})
