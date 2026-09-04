import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ServerStyleSheet } from 'styled-components'
import { describe, expect, it, vi } from 'vitest'

import SiteHeader from '@/components/layout/site-header'

const pathnameBox = vi.hoisted(() => ({ current: '/' }))

vi.mock('next/navigation', () => ({
  usePathname: () => pathnameBox.current,
  useRouter: () => ({
    push: () => undefined,
    replace: () => undefined,
    back: () => undefined,
  }),
}))

const renderStyles = (pathname: string): string => {
  pathnameBox.current = pathname
  const sheet = new ServerStyleSheet()
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  try {
    renderToStaticMarkup(
      sheet.collectStyles(
        createElement(
          QueryClientProvider,
          { client },
          createElement(SiteHeader),
        ),
      ),
    )
    return sheet.getStyleTags()
  } finally {
    sheet.seal()
  }
}

/** 헤더 콘텐츠 폭 선언만 뽑는다(min-width·max-width 같은 다른 폭은 제외). */
const innerWidths = (css: string): string[] => [
  ...new Set([...css.matchAll(/[;{]width:([^;}]+)/g)].map(m => m[1].trim())),
]

const ROUTES = [
  '/',
  '/analysis',
  '/recommend',
  '/status',
  '/community',
  '/profile',
  '/simulation',
]

/*
 * 라우트마다 헤더 폭이 달라서(홈 1120px / 분석·추천 full / 구별현황 1400px)
 * 페이지를 옮길 때 로고와 메뉴가 좌우로 튀었다. 완성도가 떨어져 보이는 것 외에
 * 「같은 헤더인가」를 의심하게 만드는 문제라, 전 화면을 하나로 통일한다.
 */
describe('SiteHeader — 헤더 폭은 모든 화면에서 같다', () => {
  it('라우트가 달라도 콘텐츠 폭 선언이 동일하다', () => {
    const home = innerWidths(renderStyles('/'))
    const analysis = innerWidths(renderStyles('/analysis'))
    const status = innerWidths(renderStyles('/status'))
    const community = innerWidths(renderStyles('/community'))

    expect(analysis).toEqual(home)
    expect(status).toEqual(home)
    expect(community).toEqual(home)
  })

  it('페이지 본문 폭에 맞춘 옛 상한이 남아 있지 않다', () => {
    for (const route of ROUTES) {
      const css = renderStyles(route)

      expect(css).not.toContain('1120px')
      expect(css).not.toContain('1400px')
    }
  })

  it('양 끝까지 쓰되 가장자리 여백은 남긴다', () => {
    expect(renderStyles('/')).toContain('calc(100% - 40px)')
  })
})
