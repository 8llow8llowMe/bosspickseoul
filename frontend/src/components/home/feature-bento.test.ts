import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { ServerStyleSheet } from 'styled-components'
import { describe, expect, it } from 'vitest'
import FeatureBento from '@/components/home/feature-bento'

const render = () => renderToStaticMarkup(createElement(FeatureBento))

describe('FeatureBento', () => {
  it('벤토 카드와 CTA를 렌더한다', () => {
    const html = render()
    for (const label of ['분석 화면 보관함', '커뮤니티', '상권 비교']) {
      expect(html).toContain(label)
    }
    expect(html).toContain('href="/register"')
    expect(html).toContain('href="/analysis"')
    expect(html).not.toContain('<img')
  })

  describe('FeatureBento — 마지막 CTA', () => {
    it('주 버튼은 분석, 보조 버튼은 회원가입이다', () => {
      const html = render()
      const analysis = html.indexOf('href="/analysis"')
      const register = html.indexOf('href="/register"')

      expect(analysis).toBeGreaterThan(-1)
      expect(analysis).toBeLessThan(register)
      expect(html).toContain('상권 분석 시작하기')
      expect(html).toContain('회원가입</a>')
      expect(html).not.toContain('상권 분석 바로가기')
    })

    it('로그인 없이 시작할 수 있다고 말하고, 개발중 배지와 채팅 언급이 없다', () => {
      const html = render()

      expect(html).toContain('분석은 로그인 없이 바로 시작할 수 있습니다.')
      expect(html).toContain(
        '북마크, 분석 화면 보관함, 시뮬레이션 저장, 커뮤니티 글쓰기도 이용할 수 있습니다.',
      )
      expect(html).not.toContain('개발중')
      expect(html).not.toContain('채팅')
    })
  })

  describe('FeatureBento — 「분석 이후」 칸의 진실성', () => {
    it('AI 리포트를 이 칸에서 소개하지 않는다', () => {
      // AI 리포트는 분석의 산출물이라 「분석 이후」 칸의 전제와 어긋난다.
      // 02단계(story-steps)가 그것을 말한다.
      const html = render()

      expect(html).not.toContain('AI 리포트')
    })

    it('실제로 분석을 마친 뒤 쓰는 기능을 소개한다', () => {
      const html = render()

      expect(html).toContain('분석 화면 보관함')
      expect(html).toContain('상권 비교')
    })

    it('제목은 그대로 둔다', () => {
      const html = render()

      expect(html).toContain('분석 이후의 판단까지, 한 곳에서 이어집니다.')
    })
  })
})

const renderStyles = (): string => {
  const sheet = new ServerStyleSheet()

  try {
    renderToStaticMarkup(sheet.collectStyles(createElement(FeatureBento)))
    return sheet.getStyleTags().replace(/\s+/g, '')
  } finally {
    sheet.seal()
  }
}

describe('FeatureBento — 넓은 화면 배치', () => {
  /*
   * 예전엔 「화면 높이를 붙잡지 않는다」였다(330px 콘텐츠를 1080 화면에 가운데 두면 위아래
   * 260px 씩 비었다). 2026-09-30 사용자 결정으로 홈 섹션은 최소 한 화면이다
   * (full-screen-sections-and-live-tooltip.md D4-1). 다만 **최소 높이**만이다 — dvh 로 높이를
   * 고정하거나 트랙을 만들지 않는다.
   */
  it('최소 한 화면(100dvh - 헤더)이고, 그 밖에서는 dvh 를 쓰지 않는다', () => {
    const css = renderStyles()
    expect(css).toContain('min-height:calc(100dvh-65px)')
    expect(css.replaceAll('min-height:calc(100dvh-65px)', '')).not.toContain(
      'dvh',
    )
  })

  it('홈 공용 컬럼(--w-wide)을 쓴다', () => {
    expect(renderStyles()).toContain('width:min(var(--w-wide),var(--w-shell))')
  })
})
