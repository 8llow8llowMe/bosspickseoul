// src/components/home/product-story.test.ts
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import ProductStory from '@/components/home/product-story'

// SeoulDistrictsMap이 useRouter를 호출하므로 SSR 렌더용으로 모킹(home-page.test.ts와 동일)
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: () => undefined,
    replace: () => undefined,
    back: () => undefined,
  }),
}))

describe('ProductStory', () => {
  it('4개 스텝 제목과 샘플 라벨을 렌더한다', () => {
    const html = renderToStaticMarkup(createElement(ProductStory))
    for (const title of [
      '현황 확인',
      '상권 분석',
      '후보 추천',
      '창업 시뮬레이션',
    ]) {
      expect(html).toContain(title)
    }
    expect(html).toContain('대표 예시 데이터')
  })
})
