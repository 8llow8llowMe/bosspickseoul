import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { ServerStyleSheet } from 'styled-components'
import { describe, expect, it } from 'vitest'
import GlobalStyles from './global-styles'

/** styled-components 는 선언을 압축해 내보낸다 — 공백 차이로 깨지지 않게 지운다. */
const squeeze = (css: string): string => css.replace(/\s+/g, '')

const renderGlobalCss = (): string => {
  const styleSheet = new ServerStyleSheet()

  try {
    renderToStaticMarkup(styleSheet.collectStyles(createElement(GlobalStyles)))
    return styleSheet.getStyleTags()
  } finally {
    styleSheet.seal()
  }
}

/**
 * DESIGN.md 「텍스트 대비는 WCAG AA 이상을 목표로 한다」.
 * grey500(#8b95a1)은 흰 배경에서 3.04:1 이라 12px 캡션으로 쓰면 AA 를 넘지 못한다.
 * grey600(#6b7684)은 4.62:1 로 통과한다. 캡션 토큰이 grey500 으로 되돌아가면
 * 80여 곳이 한꺼번에 AA 아래로 떨어지므로 여기서 못박는다.
 */
describe('디자인 토큰 대비 (DESIGN.md §Accessibility)', () => {
  it('캡션 토큰은 grey600 이다 — grey500 은 AA 미달이다', () => {
    const css = renderGlobalCss()

    expect(squeeze(css)).toContain(
      '--color-text-caption:var(--color-grey-600);',
    )
    expect(squeeze(css)).not.toContain(
      '--color-text-caption:var(--color-grey-500);',
    )
  })

  it('grey500 자체는 팔레트에 남아 있다 — 비활성·장식용이다', () => {
    const css = renderGlobalCss()

    expect(squeeze(css)).toContain('--color-grey-500:#8b95a1;')
  })
})
