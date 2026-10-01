import { createElement, type ComponentProps } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { ServerStyleSheet } from 'styled-components'
import { describe, expect, it } from 'vitest'

import CommunityListNav from './community-list-nav'
import CommunityListRail from './community-list-rail'

/*
  목록 넓은 화면의 우 레일·좌 내비(community.md §S4 「목록 3단」, CM-037·039·040).
*/

const render = (element: ReturnType<typeof createElement>) => {
  const sheet = new ServerStyleSheet()

  try {
    const markup = renderToStaticMarkup(sheet.collectStyles(element))
    return { markup, styles: sheet.getStyleTags() }
  } finally {
    sheet.seal()
  }
}

const railProps: ComponentProps<typeof CommunityListRail> = {
  popular: {
    title: '성동구 인기 글',
    posts: [
      {
        postId: '11',
        title: '성수동 점심 장사 회전율 올린 방법이 궁금해요',
        likeCount: 1200,
        href: '/community/11?from=ctx',
      },
      {
        postId: '12',
        title: '배달 수수료',
        likeCount: 3,
        href: '/community/12?from=ctx',
      },
    ],
  },
  askTitle: '성동구에 대해 물어보세요',
  writeHref: '/community/register?targetType=DISTRICT&targetCode=11200',
  analysis: {
    label: '성동구 상권 분석 보기',
    href: '/analysis?districtCode=11200',
  },
}

describe('CommunityListRail', () => {
  it('ranks popular posts with tabular numbers, one-line titles, and like counts', () => {
    const { markup, styles } = render(
      createElement(CommunityListRail, railProps),
    )

    expect(markup).toMatch(/<aside[^>]*aria-label="커뮤니티 둘러보기"/)
    expect(markup).toMatch(/<h2[^>]*>성동구 인기 글<\/h2>/)
    expect(markup).toContain('<ol')
    expect(markup).toMatch(
      /<a[^>]*data-popular-post-id="11"[^>]*href="\/community\/11\?from=ctx"/,
    )
    expect(markup).toContain('인기 1위')
    expect(markup).toContain('인기 2위')
    expect(markup).toContain('1,200')
    // 스크롤 복원은 피드 행(data-community-post-id)만 찾는다 — 레일 글이 끼면 엉뚱한 자리로 간다.
    expect(markup).not.toContain('data-community-post-id')
    expect(styles).toContain('font-variant-numeric:tabular-nums')
    expect(styles).toContain('color:var(--color-text-primary-on-light)')
    expect(styles).toContain('text-overflow:ellipsis')
    expect(styles).toContain('white-space:nowrap')
  })

  it('sticks under the site header like the detail rail', () => {
    const { styles } = render(createElement(CommunityListRail, railProps))

    expect(styles).toContain('position:sticky')
    expect(styles).toContain('top:88px')
    expect(styles).toContain('border-radius:var(--radius-card)')
  })

  it('hides the popular group when there are no posts, keeping the other cards', () => {
    for (const popular of [null, { title: '인기 글', posts: [] }]) {
      const { markup } = render(
        createElement(CommunityListRail, { ...railProps, popular }),
      )

      expect(markup).not.toContain('인기 글')
      expect(markup).not.toContain('<ol')
      expect(markup).toContain('성동구에 대해 물어보세요')
      expect(markup).toContain('성동구 상권 분석 보기')
    }
  })

  it('asks for a post with the prefilled write link and links to analysis', () => {
    const { markup } = render(createElement(CommunityListRail, railProps))

    expect(markup).toMatch(/<h2[^>]*>성동구에 대해 물어보세요<\/h2>/)
    expect(markup).toMatch(
      /<a[^>]*href="\/community\/register\?targetType=DISTRICT&amp;targetCode=11200"[^>]*>글쓰기<\/a>/,
    )
    expect(markup).toMatch(
      /<a[^>]*href="\/analysis\?districtCode=11200"[^>]*>[\s\S]*?성동구 상권 분석 보기/,
    )
  })
})

const navProps: ComponentProps<typeof CommunityListNav> = {
  views: [
    { key: 'latest', label: '최신', href: '/community/list', current: true },
    {
      key: 'popular',
      label: '인기',
      href: '/community/list?view=popular',
      current: false,
    },
  ],
  liked: {
    key: 'liked',
    label: '좋아요한 글',
    href: '/community/list?view=liked',
    current: false,
  },
  recentRegions: [
    {
      key: 'DISTRICT:11440',
      label: '마포구',
      href: '/community/list?targetType=DISTRICT&targetCode=11440',
      current: false,
    },
    {
      key: 'DISTRICT:11200',
      label: '성동구',
      href: '/community/list?targetType=DISTRICT&targetCode=11200',
      current: true,
    },
  ],
}

describe('CommunityListNav', () => {
  it('groups 보기 · 내 활동 · 최근 본 지역 under a labelled sticky nav', () => {
    const { markup, styles } = render(createElement(CommunityListNav, navProps))

    expect(markup).toMatch(/<nav[^>]*aria-label="커뮤니티 메뉴"/)
    const order = ['보기', '내 활동', '최근 본 지역'].map(label =>
      markup.indexOf(`>${label}</h2>`),
    )
    expect(order.every(index => index >= 0)).toBe(true)
    expect([...order].sort((a, b) => a - b)).toEqual(order)
    expect(markup.indexOf('>마포구<')).toBeGreaterThan(0)
    expect(markup.indexOf('>마포구<')).toBeLessThan(markup.indexOf('>성동구<'))
    expect(styles).toContain('position:sticky')
    expect(styles).toContain('top:88px')
  })

  /*
    주소 하나가 보기와 지역을 함께 정하므로 `page` 는 한 항목에만 둔다 — 화면 낭독기가 「현재 페이지」를
    둘 읽지 않게. 지금 연 지역 게시판이 그 페이지이고, 보기·내 활동은 그 안의 지금 상태(`true`)다.
  */
  it('marks the open region as the page and the current view as the current item', () => {
    const { markup, styles } = render(createElement(CommunityListNav, navProps))

    expect(markup.match(/aria-current="page"/g)).toHaveLength(1)
    expect(markup.match(/aria-current="true"/g)).toHaveLength(1)
    expect(markup).toMatch(
      /<a[^>]*aria-current="true"[^>]*href="\/community\/list"[^>]*>최신<\/a>/,
    )
    expect(markup).toMatch(
      /<a[^>]*aria-current="page"[^>]*href="\/community\/list\?targetType=DISTRICT&amp;targetCode=11200"[^>]*>[\s\S]*?성동구<\/span><\/a>/,
    )
    expect(markup).not.toMatch(/aria-current="[^"]*"[^>]*>인기</)
    expect(markup).not.toMatch(
      /<a[^>]*aria-current="[^"]*"[^>]*targetCode=11440"/,
    )
    expect(markup).not.toContain('aria-pressed')
    // 두 값 모두 같은 강조로 보인다.
    expect(styles).toMatch(
      /\[aria-current\]\{[^}]*background:var\(--color-primary-100\)/,
    )
  })

  it('has no page item when no region board is open, and marks 좋아요한 글 as the current item', () => {
    const { markup } = render(
      createElement(CommunityListNav, {
        views: navProps.views.map(item => ({ ...item, current: false })),
        liked: { ...navProps.liked, current: true },
        recentRegions: navProps.recentRegions.map(item => ({
          ...item,
          current: false,
        })),
      }),
    )

    expect(markup).not.toContain('aria-current="page"')
    expect(markup.match(/aria-current="true"/g)).toHaveLength(1)
    expect(markup).toMatch(
      /<a[^>]*aria-current="true"[^>]*>[\s\S]*?좋아요한 글<\/span><\/a>/,
    )
  })

  it('omits the recent regions group when nothing has been opened', () => {
    const { markup } = render(
      createElement(CommunityListNav, { ...navProps, recentRegions: [] }),
    )

    expect(markup).not.toContain('최근 본 지역')
    expect(markup).toContain('>좋아요한 글<')
  })
})
