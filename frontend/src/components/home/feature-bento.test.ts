import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import FeatureBento from '@/components/home/feature-bento'

describe('FeatureBento', () => {
  it('벤토 카드와 CTA를 렌더한다', () => {
    const html = renderToStaticMarkup(createElement(FeatureBento))
    for (const label of ['AI 리포트', '커뮤니티', '저장', '알림']) {
      expect(html).toContain(label)
    }
    expect(html).toContain('href="/register"')
    expect(html).toContain('href="/analysis"')
    expect(html).not.toContain('<img')
  })
})
