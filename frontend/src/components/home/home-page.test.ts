import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import HomePage from '@/components/home/home-page'

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
