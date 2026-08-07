import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import HomePage from '@/components/home/home-page'

// SeoulDistrictsMap (rendered inside the hero) calls useRouter() for
// click-to-navigate. renderToStaticMarkup has no App Router context, so the
// real hook throws outside a client boundary. Mock it the same way
// analysis-result-view-ssr.test.ts does for SSR-style rendering tests.
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: () => undefined,
    replace: () => undefined,
    back: () => undefined,
  }),
}))

describe('HomePage', () => {
  it('renders the redesigned landing sections and routes', () => {
    const html = renderToStaticMarkup(createElement(HomePage))

    expect(html).toContain('창업 전에, 상권부터 확인하세요.')
    expect(html).toContain('미리 체험하기')
    expect(html).toContain('판단 흐름')
    expect(html).toContain('기능')

    for (const href of ['/status', '/analysis', '/recommend', '/register']) {
      expect(html).toContain(`href="${href}"`)
    }
  })

  it('renders the interactive mini-demo and no legacy brand or preview images', () => {
    const html = renderToStaticMarkup(createElement(HomePage))

    expect(html).toContain('대표 예시 데이터')
    expect(html).not.toContain('NowDoBoss')
    expect(html).not.toContain('<img')
  })
})
