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
  /*
    main 은 셸 본문 칸 안에 있고 푸터는 그 칸의 형제다(site-shell.tsx). 예전처럼 `main ~ footer` 로
    겨누면 아무 화면에서도 걸리지 않아 지도·구별현황·추천 화면 아래에 푸터가 다시 생긴다.
  */
  it('data-hide-footer main 을 품은 셸 본문 칸 뒤의 footer를 중간 modal 유무와 관계없이 숨긴다', () => {
    const { styles } = renderFooter()

    expect(styles).toMatch(
      /\[data-site-shell-body\]:has\(main\[data-hide-footer=['"]true['"]\]\)~[^}]+display:none/,
    )
    expect(styles).not.toMatch(/(^|[},])main\[data-hide-footer=['"]true['"]\]~/)
  })

  it('data-hide-mobile-footer main 을 품은 본문 칸 바로 뒤의 footer만 모바일에서 숨긴다', () => {
    const { styles } = renderFooter()

    expect(styles).toMatch(/@media \(max-width:\s*1023px\)/)
    expect(styles).toMatch(
      /\[data-site-shell-body\]:has\(main\[data-hide-mobile-footer=['"]true['"]\]\)\+[^}]+display:none/,
    )
  })

  it('일반 footer 마크업은 항상 렌더링한다', () => {
    const { markup } = renderFooter()

    // BrandLockup 은 이름을 BossPick/Seoul 두 span 으로 나눠 그린다 —
    // 태그를 벗겨 텍스트로 읽었을 때 온전한 이름이 나오는지로 확인한다.
    expect(markup).toContain('<footer')
    expect(markup.replace(/<[^>]*>/g, '')).toContain('BossPickSeoul')
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
