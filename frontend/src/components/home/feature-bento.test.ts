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
   * 콘텐츠 약 330px 로 1080 화면을 채우려고 세로 가운데 정렬하면 위아래로 약 260px
   * 씩 빈 띠가 생겼다.
   */
  it('화면 높이를 붙잡지 않는다', () => {
    expect(renderStyles()).not.toContain('100dvh')
  })

  it('홈 공용 컬럼(--w-wide)을 쓴다', () => {
    expect(renderStyles()).toContain('width:min(var(--w-wide),var(--w-shell))')
  })
})
