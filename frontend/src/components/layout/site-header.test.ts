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

  /*
    폭 값 자체는 이제 :root 의 셸 토큰이 진다(--w-shell = calc(100% - 거터*2)).
    헤더가 리터럴을 다시 들면 본문과 갈라지므로 토큰을 쓰는지로 못박는다.
  */
  it('양 끝까지 쓰되 가장자리 여백은 남긴다 — 셸 토큰을 쓴다', () => {
    expect(renderStyles('/').replace(/\s+/g, '')).toContain(
      'width:var(--w-shell);',
    )
  })
})

/*
  목록 숨는 헤더(community.md §S4 「숨는 헤더」, CM-043). 헤더를 위로 올리는 규칙은 <480 이고
  목록이 켜는 <html> 속성 아래에만 있어야 한다 — 다른 화면 헤더는 늘 그대로다.
*/
describe('SiteHeader — 목록 숨는 헤더 규칙', () => {
  it('translateY 규칙은 <480 미디어와 목록 속성 선택자 안에만 있다', () => {
    const css = renderStyles('/analysis')
    const rule = css.match(
      /@media \(max-width:\s*479px\)\{html\[data-community-header-hidden='true'\]:not\(:has\(\[data-site-header\]\[data-menu-open='true'\],\s*\[data-site-header\]:focus-within\)\) \.[\w-]+\{transform:translateY\(-100%\);\}\}/,
    )

    expect(rule).not.toBeNull()
    // 속성 없는 transform 선언은 없다 — 다른 화면 헤더는 움직이지 않는다.
    expect(css.match(/transform:translateY\(-100%\)/g)).toHaveLength(1)
  })

  it('라우트가 달라도 헤더 CSS 가 같다 — 숨김은 경로가 아니라 목록이 켠 속성이 정한다', () => {
    expect(renderStyles('/community/list')).toBe(renderStyles('/analysis'))
  })

  it('움직임 줄이기에서는 전환 없이 바뀐다', () => {
    expect(renderStyles('/')).toMatch(
      /@media \(prefers-reduced-motion:\s*reduce\)\{\.[\w-]+\{transition:none;\}\}/,
    )
  })
})

describe('SiteHeader — 전역 내비', () => {
  const renderMarkup = (pathname: string): string => {
    pathnameBox.current = pathname
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    return renderToStaticMarkup(
      createElement(QueryClientProvider, { client }, createElement(SiteHeader)),
    )
  }

  it('커뮤니티를 다시 노출하고 채팅은 계속 숨긴다(community.md §S4 「전역 내비」)', () => {
    const markup = renderMarkup('/')

    expect(markup).toMatch(/href="\/community\/list"[^>]*>커뮤니티<\/a>/)
    expect(markup).not.toContain('href="/chatting/list"')
    expect(markup).not.toContain('>채팅<')
  })
})
