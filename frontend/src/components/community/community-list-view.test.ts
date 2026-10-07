import { createElement, type ComponentProps } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { ServerStyleSheet } from 'styled-components'
import { QueryClient } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'

import { formatCommunityCount } from '@/lib/community'
import { communityMockFixtures } from '@/lib/community/community-mock'
import {
  COMMUNITY_ANONYMOUS_VIEWER,
  createCommunityContextKey,
  createCommunityPostHref,
  isCommunityViewerReady,
  parseCommunityListState,
  type CommunityListState,
} from '@/lib/community/community-state'
import type {
  CommunityLikedPostsResponse,
  CommunityPostListResponse,
  CommunityPostSummary,
} from '@/types/community'

import {
  CommunityListQueryError,
  createCommunityAdjacentState,
  createCommunityListActionHref,
  createCommunityListQueryKey,
  createCommunityListRequest,
  getCommunityBoardResponseName,
  getCommunityBoardTargetName,
  getCommunityLikedAccess,
  getCommunityListRenderState,
  isCommunityUnauthorizedError,
  recoverCommunityLikedUnauthorized,
  recoverCommunityPublicListUnauthorized,
  serializeCommunityListState,
  shouldRetryCommunityListQuery,
  startCommunityPublicListRecovery,
  validateCommunityListResponse,
} from './community-list-page'
import CommunityListView from './community-list-view'

const contextKey = createCommunityContextKey({
  view: 'latest',
  keyword: '',
  targetType: undefined,
  targetCode: undefined,
  mock: true,
})

const posts = [
  {
    ...communityMockFixtures.posts[6],
    href: createCommunityPostHref(
      communityMockFixtures.posts[6].postId,
      contextKey,
      true,
    ),
  },
  {
    ...communityMockFixtures.posts[0],
    href: createCommunityPostHref(
      communityMockFixtures.posts[0].postId,
      contextKey,
      true,
    ),
  },
]

const fixturePosts = structuredClone(
  communityMockFixtures.posts,
) as CommunityPostSummary[]
const successHeader = {
  success: true,
  resultCode: null,
  resultMessage: null,
}
const listResponse: CommunityPostListResponse = {
  dataHeader: successHeader,
  dataBody: {
    board: {
      targetType: fixturePosts[6]!.targetType,
      targetCode: fixturePosts[6]!.targetCode,
      targetName: fixturePosts[6]!.targetName,
    },
    posts: {
      contents: fixturePosts,
      hasNext: false,
    },
  },
}
const likedResponse: CommunityLikedPostsResponse = {
  dataHeader: successHeader,
  dataBody: {
    posts: {
      contents: fixturePosts.slice(0, 2).map((post, index) => ({
        ...post,
        likedAt: `2026-07-27T09:0${index}:00.000Z`,
      })),
      hasNext: false,
    },
  },
}
const failedListResponse: CommunityPostListResponse = {
  dataHeader: {
    success: false,
    resultCode: 'COMMUNITY_LIST_FAILED',
    resultMessage: '게시글 목록 요청이 거절됐어요.',
  },
  dataBody: {
    board: null,
    posts: {
      contents: [],
      hasNext: false,
    },
  },
}

const handlers = {
  onSearchValueChange: vi.fn(),
  onSearchSubmit: vi.fn(),
  onSearchClear: vi.fn(),
  onViewChange: vi.fn(),
  onEmptyAction: vi.fn(),
  onRetry: vi.fn(),
  onLoadMore: vi.fn(),
  onRetryLoadMore: vi.fn(),
}

const baseProps: ComponentProps<typeof CommunityListView> = {
  status: 'ready',
  errorMessage: null,
  loadMoreErrorMessage: null,
  emptyCause: 'general',
  posts,
  view: 'latest',
  keyword: '',
  searchValue: '',
  boardTargetName: null,
  allPostsHref: null,
  locationPicker: createElement(
    'div',
    { 'data-location-picker': true },
    '지역 선택',
  ),
  writeHref: '/community/register?mock=1',
  hasNextPage: true,
  isFetchingNextPage: false,
  isFetching: false,
  ...handlers,
}

const renderWithStyles = (
  overrides: Partial<ComponentProps<typeof CommunityListView>> = {},
): { markup: string; styles: string } => {
  const sheet = new ServerStyleSheet()

  try {
    const markup = renderToStaticMarkup(
      sheet.collectStyles(
        createElement(CommunityListView, {
          ...baseProps,
          ...overrides,
        }),
      ),
    )

    return { markup, styles: sheet.getStyleTags() }
  } finally {
    sheet.seal()
  }
}

describe('CommunityListView', () => {
  it('renders a one-line title, an icon search form, the location slot, and underline tabs with a separate liked toggle', () => {
    const { markup } = renderWithStyles()

    // 소개 카드(Hero)는 없앴다 — 제목 한 줄과 보조 한 줄이 그 자리다.
    expect(markup).not.toContain('사장님들의 운영 이야기가 모이는 곳')
    expect(markup).toMatch(/<h1[^>]*>사장님 이야기<\/h1>/)
    expect(markup).toContain('운영 경험과 동네 소식을 나눠요')
    expect(markup).toContain('<form')
    expect(markup).toContain('role="search"')
    expect(markup).toContain('name="keyword"')
    expect(markup).toContain('enterKeyHint="search"')
    // 「검색」 제출 버튼은 없다 — Enter 로 제출한다.
    expect(markup).not.toContain('>검색</button>')
    expect(markup).not.toContain('type="submit"')
    expect(markup).toContain('>최신</button>')
    expect(markup).toContain('>인기</button>')
    expect(markup).toContain('>좋아요한 글</button>')
    expect(markup).toContain('data-location-picker="true"')
    expect(markup).toContain('role="group"')
    expect(markup).toContain('aria-label="게시글 보기"')
    expect(markup).toContain('aria-pressed="true"')
    expect(markup).not.toContain('role="tablist"')
    expect(markup).not.toContain('role="tab"')
    // 피드 전체를 live region 으로 두지 않는다 — 자동 다음 쪽(2단계)마다 붙은 글 20건을 통째로
    // 읽게 된다. 알림은 로딩(role=status)·실패(role=alert)·끝(role=status)이 각자 맡는다.
    const feedTag = markup.match(
      /<section[^>]*aria-label="커뮤니티 피드"[^>]*>/,
    )
    expect(feedTag?.[0]).toBeDefined()
    expect(feedTag?.[0]).not.toContain('aria-live')
    // 피드에 aria-busy 를 걸지 않는다 — busy 인 동안 안쪽 status 알림을 미루는 스크린리더가 있어
    // 「게시글을 불러오는 중이에요」 가 묻힌다.
    expect(feedTag?.[0]).not.toContain('aria-busy')
    // 피드 머리의 h2 제목과 「N개 불러옴」 은 제목이 h1 으로 올라가며 뺐다.
    expect(markup).not.toContain('개 불러옴')
  })

  it('keeps the liked toggle outside the latest/popular group and unselects both tabs in liked view', () => {
    const { markup } = renderWithStyles({ view: 'liked' })
    const group = markup.slice(
      markup.indexOf('aria-label="게시글 보기"'),
      markup.indexOf('</div>', markup.indexOf('aria-label="게시글 보기"')),
    )

    expect(group).toContain('>최신</button>')
    expect(group).toContain('>인기</button>')
    expect(group).not.toContain('좋아요한 글')
    expect(group).not.toContain('aria-pressed="true"')
    expect(markup).toMatch(
      /<button[^>]*aria-pressed="true"[^>]*data-liked-toggle="true"[^>]*>[\s\S]*?좋아요한 글<\/button>/,
    )
  })

  it('titles a target board by its name and links back to all posts', () => {
    const { markup } = renderWithStyles({
      boardTargetName: '성수1가1동',
      allPostsHref: '/community/list?mock=1',
    })

    expect(markup).toMatch(/<h1[^>]*>성수1가1동 이야기<\/h1>/)
    expect(markup).toMatch(
      /<a[^>]*href="\/community\/list\?mock=1"[^>]*>전체 글 보기<\/a>/,
    )
    expect(markup).not.toContain('운영 경험과 동네 소식을 나눠요')
  })

  it('titles a search by its keyword', () => {
    const { markup } = renderWithStyles({
      keyword: '점심',
      searchValue: '점심',
    })

    expect(markup).toMatch(/<h1[^>]*>「점심」 검색 결과<\/h1>/)
    expect(markup).not.toContain('전체 글 보기')
  })

  it('renders the search clear button only while the input has a value', () => {
    const empty = renderWithStyles().markup
    const filled = renderWithStyles({ searchValue: '점심' }).markup

    expect(empty).not.toContain('aria-label="검색어 지우기"')
    expect(filled).toMatch(
      /<button[^>]*aria-label="검색어 지우기"[^>]*type="button"/,
    )
  })

  it('keeps the toolbar sticky under the site header on a solid surface', () => {
    const { styles } = renderWithStyles()

    expect(styles).toContain('position:sticky')
    expect(styles).toContain('top:64px')
    expect(styles).toContain('background:var(--color-surface)')
  })

  it('renders one-column feed rows with a target or Seoul tag and only owner-friendly metadata', () => {
    const { markup } = renderWithStyles()

    expect(markup).toContain('강남역 상권')
    expect(markup).toContain('서울 전체')
    expect(markup).toContain('강남역 상권 테이크아웃 동선')
    expect(markup).toContain('첫 가게를 준비하며 배운 것들')
    expect(markup).toContain('점심 피크 시간의 대기열을 줄이기 위해')
    // 작성자는 응답의 닉네임을 그대로 적는다(BE #271). 픽스처 두 글의 작성자다.
    expect(markup).toContain('강남역 커피로드')
    expect(markup).toContain('역삼동 김사장')
    expect(markup.match(/data-community-writer="true"/g)).toHaveLength(2)
    expect(markup).toContain('aria-label="댓글 2"')
    expect(markup).not.toContain('이번 주 많이 본 게시글')
    expect(markup).not.toContain('카테고리')
    expect(markup).not.toContain('<img')
    expect(markup).not.toContain('프로필')
    expect(markup).not.toContain('readCount')
  })

  // #530 — 행 메타에 조회수, 내가 좋아요한 글은 채운 하트(표시만, 행 안에 토글 버튼 없음).
  const rowPost = (overrides: Partial<CommunityPostSummary>) => ({
    ...communityMockFixtures.posts[2]!,
    href: '/community/3',
    ...overrides,
  })
  const singleRow = (overrides: Partial<CommunityPostSummary>) => {
    const { markup } = renderWithStyles({ posts: [rowPost(overrides)] })
    return markup.match(/<li>[\s\S]*?<\/li>/)?.[0] ?? ''
  }

  it('shows the view count next to likes and comments with the detail wording', () => {
    const row = singleRow({ viewCount: 1234, likeCount: 5, commentCount: 2 })

    expect(row).toContain('aria-label="조회 1234"')
    // 표기는 상세 메타(`조회 N`)와 같은 축약 포맷이다.
    expect(row).toContain(`조회 ${formatCommunityCount(1234)}`)
    // 좋아요 · 댓글 다음 자리다.
    expect(row.indexOf('aria-label="댓글 2"')).toBeLessThan(
      row.indexOf('aria-label="조회 1234"'),
    )
  })

  it('omits the view count when an older backend response has none', () => {
    const row = singleRow({ viewCount: undefined as unknown as number })

    expect(row).not.toContain('조회')
  })

  it('fills the heart and names it for screen readers only when liked is true', () => {
    const liked = singleRow({ likeCount: 5, liked: true })

    expect(liked).toContain('aria-label="좋아요 5, 내가 좋아요한 글"')
    expect(liked).toContain('data-liked="true"')
    expect(liked).toMatch(/<svg[^>]*fill="currentColor"/)
    // 표시만 한다 — 행 전체가 링크라 안에 버튼을 두지 않는다.
    expect(liked).not.toContain('<button')
    expect(liked.match(/<a /g)).toHaveLength(1)
  })

  it('keeps the outline heart for false and for null (not signed in, unknown)', () => {
    for (const value of [false, null, undefined]) {
      const row = singleRow({
        likeCount: 5,
        liked: value as boolean | null,
      })

      expect(row).toContain('aria-label="좋아요 5"')
      expect(row).not.toContain('내가 좋아요한 글')
      expect(row).not.toContain('data-liked="true"')
      expect(row).not.toMatch(/<svg[^>]*fill="currentColor"/)
    }
  })

  it('colors a liked heart with the detail pressed-heart token, no new tokens', () => {
    const liked = renderWithStyles({ posts: [rowPost({ liked: true })] })
    const notLiked = renderWithStyles({ posts: [rowPost({ liked: false })] })
    const pressed = 'color:var(--color-text-primary-on-light)'

    const ruleFor = (result: { markup: string; styles: string }) => {
      const span = result.markup.match(
        /<span[^>]*aria-label="좋아요 [^"]*"[^>]*>/,
      )?.[0]
      const classes = span?.match(/class="([^"]+)"/)?.[1]?.split(' ') ?? []
      return classes
        .map(
          name =>
            result.styles.match(new RegExp(`\\.${name}\\{[^}]*\\}`))?.[0] ?? '',
        )
        .join('')
    }

    expect(ruleFor(liked)).toContain(pressed)
    expect(ruleFor(notLiked)).not.toContain(pressed)
  })

  it('renders the row region as a text label, not a nested link', () => {
    const { markup } = renderWithStyles()
    const rows = markup.match(/<li>[\s\S]*?<\/li>/g) ?? []

    expect(rows).toHaveLength(2)
    rows.forEach(row => {
      expect(row.match(/<a /g)).toHaveLength(1)
      expect(row).toMatch(/<span[^>]*data-post-region="true"[^>]*>/)
    })
    expect(markup).toMatch(/data-post-region="true"[^>]*>강남역 상권</)
  })

  it('renders a lazy decorative thumbnail only for posts with a thumbnailUrl', () => {
    const withThumbnail = renderWithStyles({
      posts: [{ ...posts[0], thumbnailUrl: '/images/sample.png' }, posts[1]],
    })

    expect(withThumbnail.markup.match(/<img /g)).toHaveLength(1)
    expect(withThumbnail.markup).toMatch(
      /<img[^>]*alt=""[^>]*loading="lazy"[^>]*src="\/images\/sample.png"/,
    )
    expect(withThumbnail.styles).toContain('object-fit:cover')
    expect(withThumbnail.styles).toContain('width:72px')
    expect(withThumbnail.styles).toMatch(
      /@media \(min-width:\s*480px\)\{[^}]*width:96px/,
    )
  })

  it('ranks only the top three rows in the popular view', () => {
    const popularPosts = fixturePosts.slice(0, 4).map(post => ({
      ...post,
      href: createCommunityPostHref(post.postId, contextKey, true),
    }))
    const popular = renderWithStyles({
      view: 'popular',
      posts: popularPosts,
    }).markup
    const latest = renderWithStyles({ posts: popularPosts }).markup

    expect(popular).toContain('data-post-rank="1"')
    expect(popular).toContain('data-post-rank="2"')
    expect(popular).toContain('data-post-rank="3"')
    expect(popular).not.toContain('data-post-rank="4"')
    expect(popular).toContain('인기 1위')
    expect(latest).not.toContain('data-post-rank')
  })

  it('renders encoded context and mock mode in target post links', () => {
    const { markup } = renderWithStyles()
    const expectedHref = posts[0].href.replaceAll('&', '&amp;')

    expect(expectedHref).toContain('from=%7B%22view%22%3A%22latest%22')
    expect(markup).toContain(`href="${expectedHref}"`)
    expect(markup).toContain('mock=1')
  })

  it('renders a desktop write link and a fixed mobile write action with accessible sizing', () => {
    const { markup, styles } = renderWithStyles()

    expect(markup).toContain('href="/community/register?mock=1"')
    expect(markup).toContain('data-desktop-write-action="true"')
    expect(markup).toContain('data-mobile-write-action="true"')
    expect(styles).toMatch(/@media \(max-width:\s*479px\)/)
    // 커뮤니티는 레거시 640·760·768 을 쓰지 않는다(community.md §S4).
    expect(styles).not.toMatch(/(max|min)-width:\s*(640|760|768)px/)
    expect(styles).toContain('position:fixed')
    expect(styles).toMatch(/min-height:(44|48|50|52|56)px/)
    expect(styles).toContain('padding-bottom')
    expect(styles).toContain('var(--radius-pill)')
    expect(styles).not.toContain('border-radius:999px')
  })

  it('keeps the mobile write action named 글쓰기 and styles its collapsed 56px circle', () => {
    const { markup, styles } = renderWithStyles()
    const fab = markup.match(/<a[^>]*data-mobile-write-action="true"[^>]*>/)

    // 접혀 글자가 사라져도 이름이 남는다. 펼친 상태의 보이는 글자와 같다(label in name).
    expect(fab?.[0]).toContain('aria-label="글쓰기"')
    // 첫 렌더(SSR·hydration 전)는 펼친 상태다.
    expect(fab?.[0]).toContain('data-collapsed="false"')
    expect(markup).toMatch(
      /data-mobile-write-action="true"[\s\S]*?<span[^>]*>글쓰기<\/span><\/a>/,
    )
    // 접힌 모양은 속성 선택자라 정적 CSS 에 늘 실린다.
    const collapsedRule = styles.match(
      /\[data-collapsed=["']?true["']?\][^{]*\{[^}]*\}/,
    )
    expect(collapsedRule?.[0]).toContain('padding:0')
    expect(collapsedRule?.[0]).toContain('gap:0')
    // 원형은 펼친 상태에도 걸린 min-width·min-height 56 이 지킨다 — 접힌 규칙에만 두면
    // 펼칠 때 폭이 56 → 아이콘 폭으로 한 번 꺼졌다가 자란다.
    expect(styles).toContain('min-width:56px')
    expect(styles).toContain('min-height:56px')
    // 모양 전환은 모션 토큰을 쓰고 reduced motion 이면 끈다.
    expect(styles).toContain('var(--motion-standard)')
    expect(styles).toMatch(
      /@media \(prefers-reduced-motion:\s*reduce\)\{[^@]*transition:none/,
    )
  })

  it('tags each row link with its post id for scroll restoration', () => {
    const { markup } = renderWithStyles()

    expect(markup).toMatch(
      new RegExp(`<a[^>]*data-community-post-id="${posts[0]!.postId}"`),
    )
    expect(markup).toMatch(
      new RegExp(`<a[^>]*data-community-post-id="${posts[1]!.postId}"`),
    )
  })

  it('renders five row skeletons as the first-load state, not the generic feedback card', () => {
    const { markup, styles } = renderWithStyles({
      status: 'loading',
      posts: [],
      hasNextPage: false,
    })

    // 로딩 알림(role=status)은 busy 아래에 두지 않는다 — 자기 자신에도, 피드에도.
    expect(markup).toMatch(
      /<div[^>]*data-community-list-skeleton="initial"[^>]*role="status"/,
    )
    expect(markup).not.toContain('aria-busy')
    expect(markup.match(/data-community-row-skeleton="true"/g)).toHaveLength(5)
    // 막대는 장식이다. 스크린리더는 문장 하나만 읽는다.
    expect(markup).toMatch(
      /data-community-row-skeleton="true"[^>]*aria-hidden="true"|aria-hidden="true"[^>]*data-community-row-skeleton="true"/,
    )
    expect(markup).toContain('게시글을 불러오는 중이에요')
    expect(markup).not.toContain('data-load-more-sentinel')
    expect(markup).not.toContain('여기까지 다 봤어요')
    // 반짝임은 reduced motion 이면 멈춘다.
    expect(styles).toMatch(
      /@media \(prefers-reduced-motion:\s*reduce\)\{[^@]*animation:none/,
    )
  })

  it('renders retryable error feedback', () => {
    const error = renderWithStyles({
      status: 'error',
      posts: [],
      errorMessage: '네트워크 연결을 확인해 주세요.',
    }).markup

    expect(error).toContain('role="alert"')
    expect(error).toContain('네트워크 연결을 확인해 주세요.')
    expect(error).toContain('>다시 시도</button>')
  })

  it.each([
    ['keyword', '검색어 초기화'],
    ['target', '지역 필터 해제'],
    ['liked', '전체 글 보기'],
    ['general', '첫 게시글 작성'],
  ] as const)('renders the %s empty action', (emptyCause, actionLabel) => {
    const { markup } = renderWithStyles({
      status: 'empty',
      posts: [],
      emptyCause,
    })

    expect(markup).toContain(`>${actionLabel}</button>`)
  })

  it('watches the end of the list with a hidden sentinel instead of a load-more button', () => {
    const { markup } = renderWithStyles()
    const listEnd = markup.indexOf('</ul>')

    // 「게시글 더 보기」 버튼은 없앴다(2단계, CM-029).
    expect(markup).not.toContain('게시글 더 보기')
    expect(markup).not.toMatch(/<button[^>]*>[^<]*더 보기[^<]*<\/button>/)
    expect(markup).toMatch(
      /<div[^>]*aria-hidden="true"[^>]*data-load-more-sentinel="true"/,
    )
    // 감시 요소는 글 목록 뒤에 있다.
    expect(markup.indexOf('data-load-more-sentinel')).toBeGreaterThan(listEnd)
    expect(markup).not.toContain('data-community-list-skeleton')
    expect(markup).not.toContain('여기까지 다 봤어요')
  })

  it('replaces the sentinel with two row skeletons while the next page loads', () => {
    const { markup } = renderWithStyles({ isFetchingNextPage: true })

    // 이미 받은 글은 그대로 둔다.
    expect(markup).toContain('강남역 상권 테이크아웃 동선')
    expect(markup).toMatch(
      /<div[^>]*data-community-list-skeleton="more"[^>]*role="status"/,
    )
    expect(markup.match(/data-community-row-skeleton="true"/g)).toHaveLength(2)
    expect(markup).toContain('게시글을 불러오는 중이에요')
    expect(markup).not.toContain('data-load-more-sentinel')
    expect(markup).not.toContain('aria-busy')
  })

  it('keeps ready posts visible and renders an inline 다시 불러오기 in place of the sentinel', () => {
    const { markup } = renderWithStyles({
      loadMoreErrorMessage: '다음 게시글을 불러오지 못했어요.',
    })

    expect(markup).toContain('강남역 상권 테이크아웃 동선')
    expect(markup).toContain('data-load-more-error="true"')
    expect(markup).toContain('role="alert"')
    expect(markup).toContain('다음 게시글을 불러오지 못했어요.')
    expect(markup).toMatch(
      /<button[^>]*type="button"[^>]*>다시 불러오기<\/button>/,
    )
    // 실패한 채로 감시 요소가 보이면 자동으로 또 부른다 — 사용자가 누를 때까지 내린다.
    expect(markup).not.toContain('data-load-more-sentinel')
    expect(markup).not.toContain('게시글 더 보기')
  })

  it('keeps the retry in place while the retry is in flight', () => {
    const { markup } = renderWithStyles({
      loadMoreErrorMessage: '다음 게시글을 불러오지 못했어요.',
      isFetchingNextPage: true,
    })

    expect(markup).toContain('>다시 불러오기</button>')
    expect(markup).not.toContain('data-community-list-skeleton')
  })

  it('marks the end of the feed with a write link once the last page is loaded', () => {
    const { markup } = renderWithStyles({ hasNextPage: false })
    const end = markup.slice(markup.indexOf('data-community-list-end'))

    expect(markup).toMatch(
      /<div[^>]*data-community-list-end="true"[^>]*role="status"/,
    )
    expect(end).toContain('여기까지 다 봤어요')
    expect(end).toMatch(
      /<a[^>]*href="\/community\/register\?mock=1"[^>]*>글쓰기<\/a>/,
    )
    expect(markup).not.toContain('data-load-more-sentinel')
    expect(markup).not.toContain('게시글 더 보기')
  })

  it('does not mark the end of an empty feed', () => {
    const { markup } = renderWithStyles({
      status: 'empty',
      posts: [],
      hasNextPage: false,
    })

    expect(markup).not.toContain('여기까지 다 봤어요')
    expect(markup).not.toContain('data-load-more-sentinel')
  })
})

/*
  개편 4단계 「넓은 화면」(community.md §S4 「목록 3단」, CM-037·038). 골격은 CSS 그리드 영역으로
  잡고, 레일·내비는 목록 페이지가 폭을 판정해 넘길 때만 그린다.
*/
describe('CommunityListView — 넓은 화면 골격', () => {
  /** markup 에서 data 속성으로 요소의 styled-components 클래스를 찾아 그 클래스의 규칙만 모은다. */
  const classRules = (markup: string, styles: string, attribute: string) => {
    const tag = markup.match(new RegExp(`<[a-z]+[^>]*${attribute}[^>]*>`))?.[0]
    const classes = tag?.match(/class="([^"]+)"/)?.[1].split(/\s+/) ?? []
    // 마지막 클래스가 그 컴포넌트 고유 규칙이다(앞쪽은 styled 식별자).
    const className = classes.at(-1)

    return className
      ? [
          ...styles.matchAll(
            new RegExp(`[^{}]*\\.${className}[^{]*\\{[^}]*\\}`, 'g'),
          ),
        ]
          .map(match => match[0])
          .join('\n')
      : ''
  }

  const rail = createElement('div', { 'data-rail-slot': true }, '레일')
  const nav = createElement('div', { 'data-nav-slot': true }, '내비')

  it('keeps one --w-read column under 1080, feed + rail 300 at 1080, nav 240 · feed · rail 300 at 1360', () => {
    const { styles } = renderWithStyles({ rail, nav })
    const compact = styles.replace(/\s+/g, ' ')

    expect(compact).toContain('grid-template-columns:minmax(0, var(--w-read));')
    expect(compact).toContain("grid-template-areas:'feed';")
    expect(compact).toMatch(
      /@media \(min-width: ?1080px\)\{\.[\w-]+\{grid-template-columns:minmax\(0, var\(--w-read\)\) 300px;grid-template-areas:'feed rail';\}\}/,
    )
    expect(compact).toMatch(
      /@media \(min-width: ?1360px\)\{\.[\w-]+\{grid-template-columns:240px minmax\(0, var\(--w-read\)\) 300px;grid-template-areas:'nav feed rail';\}\}/,
    )
    // 묶음을 가운데로 모은다(상세 1단계 골격과 같다) — 피드와 레일 사이가 벌어지지 않는다.
    expect(compact).toContain('justify-content:center')
    expect(compact).toContain('column-gap:24px')
    // 상한 없는 auto-fit 은 쓰지 않는다(DESIGN.md §5).
    expect(compact).not.toContain('auto-fit')
    expect(compact).not.toContain('auto-fill')
    // 레거시 구간을 쓰지 않는다.
    expect(compact).not.toMatch(/(min|max)-width: ?(640|760|768)px/)
  })

  it('renders the rail and nav slots only when given, in nav · feed · rail order', () => {
    const one = renderWithStyles().markup
    const two = renderWithStyles({ rail }).markup
    const three = renderWithStyles({ rail, nav }).markup

    expect(one).toContain('data-community-list-layout="one"')
    expect(one).not.toContain('data-rail-slot')
    expect(one).not.toContain('data-nav-slot')
    expect(two).toContain('data-community-list-layout="two"')
    expect(two).toContain('data-rail-slot')
    expect(two).not.toContain('data-nav-slot')
    expect(three).toContain('data-community-list-layout="three"')
    expect(three.indexOf('data-nav-slot')).toBeLessThan(
      three.indexOf('aria-label="커뮤니티 피드"'),
    )
    expect(three.indexOf('aria-label="커뮤니티 피드"')).toBeLessThan(
      three.indexOf('data-rail-slot'),
    )
  })

  it('hides the tab row at 1360 only when the left nav replaces it', () => {
    const withNav = renderWithStyles({ rail, nav })
    const withoutNav = renderWithStyles({ rail })
    const navRules = classRules(
      withNav.markup,
      withNav.styles,
      'data-community-tab-row',
    )
    const plainRules = classRules(
      withoutNav.markup,
      withoutNav.styles,
      'data-community-tab-row',
    )

    expect(withNav.markup).toContain('data-community-tab-row="true"')
    expect(withNav.styles).toMatch(
      /@media \(min-width: ?1360px\)\{\.[\w-]+\{display:none;\}\}/,
    )
    expect(navRules).not.toBe('')
    expect(plainRules).not.toBe('')
    expect(plainRules).not.toContain('display:none')
    // 1080–1359 에서는 탭 줄이 피드 위에 그대로다.
    expect(withoutNav.markup).toContain('>최신</button>')
  })

  it('docks the toolbar at the top while the list hides the site header under 480', () => {
    const { styles } = renderWithStyles()

    expect(styles).toMatch(
      /@media \(max-width: ?479px\)\{html\[data-community-header-hidden='true'\]:not\(:has\(\[data-site-header\]\[data-menu-open='true'\],\s*\[data-site-header\] :focus-visible\)\) \.[\w-]+\{top:0;\}\}/,
    )
    expect(styles).toContain(
      'transition:top var(--motion-standard) var(--ease-standard)',
    )
  })
})

describe('community list container helpers', () => {
  const baseState: CommunityListState = {
    view: 'latest',
    keyword: '',
    targetType: undefined,
    targetCode: undefined,
    mock: false,
  }

  it('selects liked, search, and board requests with exact cursor params', () => {
    const cursor = { lastPostId: '7', lastLikeCount: 31 }

    expect(
      createCommunityListRequest({ ...baseState, view: 'liked' }, cursor),
    ).toEqual({
      mode: 'liked',
      params: {
        sortType: 'LATEST',
        orderType: 'DESC',
        lastPostId: '7',
        lastLikeCount: 31,
        size: 20,
      },
    })
    expect(
      createCommunityListRequest(
        { ...baseState, view: 'popular', keyword: '점심' },
        cursor,
      ),
    ).toEqual({
      mode: 'search',
      params: {
        sortType: 'POPULAR',
        orderType: 'DESC',
        lastPostId: '7',
        lastLikeCount: 31,
        size: 20,
        keyword: '점심',
      },
    })
    expect(
      createCommunityListRequest(
        {
          ...baseState,
          targetType: 'COMMERCIAL',
          targetCode: '3110008',
        },
        cursor,
      ),
    ).toEqual({
      mode: 'list',
      params: {
        sortType: 'LATEST',
        orderType: 'DESC',
        lastPostId: '7',
        lastLikeCount: 31,
        size: 20,
        targetType: 'COMMERCIAL',
        targetCode: '3110008',
      },
    })
  })

  it('resolves liked access and scopes protected query keys by member', () => {
    const likedState = { ...baseState, view: 'liked' as const }

    expect(getCommunityLikedAccess(likedState, false, false)).toBe('wait')
    expect(getCommunityLikedAccess(likedState, true, true)).toBe('query')
    expect(getCommunityLikedAccess(likedState, true, false)).toBe('redirect')
    expect(
      getCommunityLikedAccess({ ...likedState, mock: true }, true, true),
    ).toBe('none')
    expect(getCommunityLikedAccess(baseState, true, false)).toBe('none')

    const memberKey = createCommunityListQueryKey(likedState, {
      authenticated: true,
      memberId: '42',
    })
    const otherMemberKey = createCommunityListQueryKey(likedState, {
      authenticated: true,
      memberId: '84',
    })
    const mockKey = createCommunityListQueryKey(
      { ...likedState, mock: true },
      { authenticated: true, memberId: 'not-used' },
    )

    expect(memberKey).toContain('42')
    expect(otherMemberKey).toContain('84')
    expect(memberKey).not.toEqual(otherMemberKey)
    expect(mockKey).toContain('9001')
  })

  it('scopes every list query key by viewer once — member id or anonymous (#530)', () => {
    const member = { authenticated: true, memberId: '42' }
    const anonymous = { authenticated: false, memberId: null }
    const likedState = { ...baseState, view: 'liked' as const }

    expect(createCommunityListQueryKey(baseState, member)).toEqual([
      'community',
      'list',
      baseState,
      '42',
    ])
    expect(createCommunityListQueryKey(baseState, anonymous)).toEqual([
      'community',
      'list',
      baseState,
      COMMUNITY_ANONYMOUS_VIEWER,
    ])
    // 좋아요한 글 보기에 붙이던 'member' 세그먼트와 합쳤다 — 조회자는 한 번만 붙는다.
    const likedKey = createCommunityListQueryKey(likedState, member)
    expect(likedKey).toEqual(['community', 'list', likedState, '42'])
    expect(likedKey).not.toContain('member')
    // 목 모드는 늘 목 회원으로 본다.
    expect(
      createCommunityListQueryKey({ ...baseState, mock: true }, anonymous).at(
        -1,
      ),
    ).toBe('9001')
  })

  it('waits for auth hydration before starting public list queries (#530)', () => {
    expect(isCommunityViewerReady(false, false)).toBe(false)
    expect(isCommunityViewerReady(false, true)).toBe(true)
    expect(isCommunityViewerReady(true, false)).toBe(true)
    // 대기 상한이 지나면 확인이 끝나지 않아도 익명으로 시작한다.
    expect(isCommunityViewerReady(false, false, true)).toBe(true)
  })

  it('throws typed query errors for unsuccessful envelopes and returns successes', () => {
    expect(validateCommunityListResponse(listResponse)).toBe(listResponse)
    expect(() => validateCommunityListResponse(failedListResponse)).toThrow(
      CommunityListQueryError,
    )
    expect(() => validateCommunityListResponse(failedListResponse)).toThrow(
      '게시글 목록 요청이 거절됐어요.',
    )
  })

  it('classifies axios 401 and disables retry while bounding other retries', () => {
    const unauthorized = {
      isAxiosError: true,
      response: { status: 401 },
    }
    const networkError = new Error('network')

    expect(isCommunityUnauthorizedError(unauthorized)).toBe(true)
    expect(isCommunityUnauthorizedError(networkError)).toBe(false)
    expect(shouldRetryCommunityListQuery(0, unauthorized)).toBe(false)
    expect(shouldRetryCommunityListQuery(0, networkError)).toBe(true)
    expect(shouldRetryCommunityListQuery(1, networkError)).toBe(true)
    expect(shouldRetryCommunityListQuery(2, networkError)).toBe(false)
  })

  it('transitions an authenticated actual liked view to redirect on 401', () => {
    const likedState = { ...baseState, view: 'liked' as const }
    const unauthorized = {
      isAxiosError: true,
      response: { status: 401 },
    }

    expect(getCommunityLikedAccess(likedState, true, true)).toBe('query')
    expect(getCommunityLikedAccess(likedState, true, true, unauthorized)).toBe(
      'redirect',
    )
    expect(
      getCommunityLikedAccess(
        { ...likedState, mock: true },
        true,
        true,
        unauthorized,
      ),
    ).toBe('none')
  })

  it('removes only the failed member liked query before clearing and navigating', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const likedState = { ...baseState, view: 'liked' as const }
    const failedKey = createCommunityListQueryKey(likedState, {
      authenticated: true,
      memberId: '42',
    })
    const otherKey = createCommunityListQueryKey(likedState, {
      authenticated: true,
      memberId: '84',
    })
    const unauthorized = Object.assign(new Error('unauthorized'), {
      isAxiosError: true,
      response: { status: 401 },
    })
    const cachedData = { pages: [likedResponse], pageParams: [] }

    queryClient.setQueryData(failedKey, cachedData)
    queryClient.setQueryData(otherKey, cachedData)
    await expect(
      queryClient.fetchQuery({
        queryKey: failedKey,
        queryFn: async () => {
          throw unauthorized
        },
        retry: false,
      }),
    ).rejects.toBe(unauthorized)

    const failedQuery = queryClient
      .getQueryCache()
      .find({ queryKey: failedKey, exact: true })
    expect(failedQuery?.state.data).toEqual(cachedData)
    expect(failedQuery?.state.error).toBe(unauthorized)

    const clearSession = vi.fn()
    const navigate = vi.fn()

    await recoverCommunityLikedUnauthorized({
      queryClient,
      queryKey: failedKey,
      clearSession,
      navigate,
      loginHref: '/login?redirect=liked',
    })

    expect(
      queryClient.getQueryCache().find({ queryKey: failedKey, exact: true }),
    ).toBeUndefined()
    expect(
      queryClient.getQueryCache().find({ queryKey: otherKey, exact: true }),
    ).toBeDefined()
    expect(clearSession).toHaveBeenCalledTimes(1)
    expect(navigate).toHaveBeenCalledOnce()
    expect(navigate).toHaveBeenCalledWith('/login?redirect=liked')

    queryClient.clear()
  })

  it('keeps an anonymous public list query cached while cancelling and retrying it', async () => {
    const queryClient = new QueryClient()
    const publicKey = createCommunityListQueryKey(baseState, {
      authenticated: false,
      memberId: null,
    })
    const cancelSpy = vi.spyOn(queryClient, 'cancelQueries')
    const removeSpy = vi.spyOn(queryClient, 'removeQueries')
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    const clearSession = vi.fn()
    const refetch = vi.fn(async () => {})

    queryClient.setQueryData(publicKey, {
      pages: [listResponse],
      pageParams: [],
    })

    await recoverCommunityPublicListUnauthorized({
      queryClient,
      queryKey: publicKey,
      viewerKey: COMMUNITY_ANONYMOUS_VIEWER,
      clearSession,
      refetch,
    })

    expect(cancelSpy).toHaveBeenCalledWith({
      queryKey: publicKey,
      exact: true,
    })
    expect(removeSpy).not.toHaveBeenCalled()
    expect(queryClient.getQueryData(publicKey)).toBeDefined()
    expect(clearSession).toHaveBeenCalledOnce()
    expect(refetch).toHaveBeenCalledOnce()
    expect(cancelSpy.mock.invocationCallOrder[0]).toBeLessThan(
      clearSession.mock.invocationCallOrder[0]!,
    )
    expect(clearSession.mock.invocationCallOrder[0]).toBeLessThan(
      refetch.mock.invocationCallOrder[0]!,
    )
    // 같은 401 로 실패해 비어 있던 레일 인기 글도 익명으로 다시 받는다(목록과 따로 둔 키).
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['community', 'popular'],
    })
    expect(refetch.mock.invocationCallOrder[0]).toBeLessThan(
      invalidateSpy.mock.invocationCallOrder[0]!,
    )
  })

  it('drops a member-keyed public list on 401 and lets the anonymous key refetch instead (#530)', async () => {
    const queryClient = new QueryClient()
    const memberKey = createCommunityListQueryKey(baseState, {
      authenticated: true,
      memberId: '42',
    })
    const anonymousKey = createCommunityListQueryKey(baseState, {
      authenticated: false,
      memberId: null,
    })
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    const clearSession = vi.fn()
    const refetch = vi.fn(async () => {})

    queryClient.setQueryData(memberKey, {
      pages: [listResponse],
      pageParams: [],
    })
    queryClient.setQueryData(anonymousKey, {
      pages: [listResponse],
      pageParams: [],
    })

    await recoverCommunityPublicListUnauthorized({
      queryClient,
      queryKey: memberKey,
      viewerKey: '42',
      clearSession,
      refetch,
    })

    /*
      세션을 지우면 조회자 세그먼트가 'anonymous' 로 바뀌어 새 키가 알아서 익명으로 받는다. 옛 회원 키를
      다시 부르면 같은 목록을 두 번 받고(상세라면 조회수도 두 번), 401 을 품은 채 남기면 다시 로그인했을 때
      그 오류로 복구가 또 돈다 — 그래서 지우기만 한다.
    */
    expect(
      queryClient.getQueryCache().find({ queryKey: memberKey, exact: true }),
    ).toBeUndefined()
    expect(queryClient.getQueryData(anonymousKey)).toBeDefined()
    expect(clearSession).toHaveBeenCalledOnce()
    expect(refetch).not.toHaveBeenCalled()
    expect(invalidateSpy).not.toHaveBeenCalled()
  })

  it('retries a public list 401 only once per list scope while allowing a new scope', async () => {
    const recovery = vi.fn(async () => {})
    const recoveryRef = {
      scope: null as string | null,
      attempted: false,
      current: null as Promise<void> | null,
    }

    const first = startCommunityPublicListRecovery(
      recoveryRef,
      'latest',
      recovery,
    )
    const concurrent = startCommunityPublicListRecovery(
      recoveryRef,
      'latest',
      recovery,
    )
    await first
    const repeated = startCommunityPublicListRecovery(
      recoveryRef,
      'latest',
      recovery,
    )

    expect(concurrent).toBe(first)
    expect(repeated).toBeNull()
    expect(recovery).toHaveBeenCalledOnce()

    await startCommunityPublicListRecovery(recoveryRef, 'popular', recovery)
    expect(recovery).toHaveBeenCalledTimes(2)
  })

  it('separates initial failures from fetch-next failures with existing posts', () => {
    expect(
      getCommunityListRenderState({
        waitingForAccess: false,
        isInitialLoading: false,
        postsLength: 0,
        error: new Error('첫 목록 실패'),
        isFetchNextPageError: false,
      }),
    ).toEqual({
      status: 'error',
      errorMessage: '첫 목록 실패',
      loadMoreErrorMessage: null,
    })
    expect(
      getCommunityListRenderState({
        waitingForAccess: false,
        isInitialLoading: false,
        postsLength: 2,
        error: new Error('다음 목록 실패'),
        isFetchNextPageError: true,
      }),
    ).toEqual({
      status: 'ready',
      errorMessage: null,
      loadMoreErrorMessage: '다음 목록 실패',
    })
  })

  it('serializes only normalized state and drops legacy or conflicting params', () => {
    const parsedLegacy = parseCommunityListState(
      new URLSearchParams(
        'view=popular&category=STARTUP&targetType=DISTRICT&mock=1',
      ),
    )
    const parsedConflict = parseCommunityListState(
      new URLSearchParams(
        'keyword=%20%EC%A0%90%EC%8B%AC%20&targetType=DISTRICT&targetCode=11680&mock=1',
      ),
    )

    expect(serializeCommunityListState(parsedLegacy).toString()).toBe(
      'view=popular&mock=1',
    )
    expect(serializeCommunityListState(parsedConflict).toString()).toBe(
      'keyword=%EC%A0%90%EC%8B%AC&mock=1',
    )
  })

  it('creates canonical search, location, and tab URLs from normalized state', () => {
    const likedMock = {
      ...baseState,
      view: 'liked' as const,
      mock: true,
    }

    expect(
      createCommunityListActionHref('/community/list', likedMock, {
        type: 'search',
        keyword: '  점심  ',
      }),
    ).toBe('/community/list?keyword=%EC%A0%90%EC%8B%AC&mock=1')
    expect(
      createCommunityListActionHref('/community/list', likedMock, {
        type: 'location',
        value: {
          targetType: 'COMMERCIAL',
          targetCode: '3110008',
        },
      }),
    ).toBe('/community/list?targetType=COMMERCIAL&targetCode=3110008&mock=1')
    expect(
      createCommunityListActionHref(
        '/community/list',
        { ...baseState, view: 'popular', keyword: '점심', mock: true },
        { type: 'view', view: 'liked' },
      ),
    ).toBe('/community/list?view=liked&mock=1')
    expect(
      createCommunityListActionHref(
        '/community/list',
        { ...baseState, keyword: '점심', mock: true },
        { type: 'view', view: 'popular' },
      ),
    ).toBe('/community/list?view=popular&keyword=%EC%A0%90%EC%8B%AC&mock=1')
  })

  it('extracts the board target name and falls back to the normalized code', () => {
    const targetState: CommunityListState = {
      ...baseState,
      targetType: 'COMMERCIAL',
      targetCode: '3110008',
    }

    expect(getCommunityBoardTargetName([listResponse], targetState)).toBe(
      '강남역 상권',
    )
    expect(getCommunityBoardTargetName([], targetState)).toBe('3110008')
    // 제목용은 응답 이름만 쓴다 — 응답 전에 `3110008 이야기` 가 뜨지 않게.
    expect(getCommunityBoardResponseName([listResponse], targetState)).toBe(
      '강남역 상권',
    )
    expect(getCommunityBoardResponseName([], targetState)).toBeUndefined()
    expect(
      getCommunityBoardTargetName([likedResponse], {
        ...baseState,
        view: 'liked',
      }),
    ).toBeUndefined()
  })

  it('computes adjacent state for the first, middle, and last fixture post', () => {
    const currentPosts = fixturePosts.slice(0, 3)
    const first = createCommunityAdjacentState(
      currentPosts,
      currentPosts[0]!.postId,
      contextKey,
    )
    const middle = createCommunityAdjacentState(
      currentPosts,
      currentPosts[1]!.postId,
      contextKey,
    )
    const last = createCommunityAdjacentState(
      currentPosts,
      currentPosts[2]!.postId,
      contextKey,
    )

    expect(first).toMatchObject({
      currentPostId: currentPosts[0]!.postId,
      previous: null,
      next: {
        postId: currentPosts[1]!.postId,
        title: currentPosts[1]!.title,
      },
    })
    expect(middle).toMatchObject({
      currentPostId: currentPosts[1]!.postId,
      previous: {
        postId: currentPosts[0]!.postId,
        title: currentPosts[0]!.title,
      },
      next: {
        postId: currentPosts[2]!.postId,
        title: currentPosts[2]!.title,
      },
    })
    expect(last).toMatchObject({
      currentPostId: currentPosts[2]!.postId,
      previous: {
        postId: currentPosts[1]!.postId,
        title: currentPosts[1]!.title,
      },
      next: null,
    })
  })
})
