import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
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
