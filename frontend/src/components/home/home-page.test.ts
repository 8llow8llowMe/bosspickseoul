import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import HomePage from '@/components/home/home-page'

describe('HomePage', () => {
  it('renders the approved static landing sections and routes', () => {
    const html = renderToStaticMarkup(createElement(HomePage))

    expect(html).toContain('서울 상권 판단을 한 흐름으로')
    expect(html).toContain('진행 과정')
    expect(html).toContain('연결 서비스')

    for (const href of [
      '/status',
      '/analysis',
      '/recommend',
      '/simulation',
      '/community/list',
      '/chatting/list',
      '/register',
    ]) {
      expect(html).toContain(`href="${href}"`)
    }
  })

  it('uses the current brand and does not restore legacy preview images', () => {
    const html = renderToStaticMarkup(createElement(HomePage))

    expect(html).toContain('BossPickSeoul')
    expect(html).not.toContain('NowDoBoss')
    expect(html).not.toContain('<img')
  })
})
