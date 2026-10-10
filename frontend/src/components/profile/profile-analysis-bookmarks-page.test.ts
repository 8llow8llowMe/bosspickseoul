import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ServerStyleSheet } from 'styled-components'
import { describe, expect, it, vi } from 'vitest'
import type { AnalysisBookmark, MemberBookmark } from '@/types/bookmark'
import ProfileAnalysisBookmarksPage, {
  createProfileRegionBookmarkView,
  getArchiveItemTitle,
  ProfileAnalysisArchiveCards,
  ProfileRegionBookmarkCards,
  summarizeArchivePayload,
} from './profile-analysis-bookmarks-page'

const navigation = vi.hoisted(() => ({ search: '' }))

vi.mock('next/navigation', () => ({
  usePathname: () => '/profile/bookmarks/analysis',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(navigation.search),
}))

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: (select: (state: { memberInfo: null }) => unknown) =>
    select({ memberInfo: null }),
}))

const bookmarks: MemberBookmark[] = [
  {
    bookmarkId: '10',
    targetType: 'DISTRICT',
    targetCode: '11680',
    targetName: '강남구',
    createdAt: '2026-07-24T10:00:00+09:00',
  },
  {
    bookmarkId: '11',
    targetType: 'ADMINISTRATION',
    targetCode: '11680510',
    targetName: '신사동',
    createdAt: '2026-07-24T10:00:00+09:00',
  },
  {
    bookmarkId: '12',
    targetType: 'COMMERCIAL',
    targetCode: 'C001',
    targetName: '테헤란로 상권',
    createdAt: '2026-07-24T10:00:00+09:00',
  },
]

/** Snowflake — 숫자로 파싱하면 값이 손상되는 크기다. */
const BIG_ID = '7345678901234567890'

const archiveItems: AnalysisBookmark[] = [
  {
    bookmarkId: BIG_ID,
    shareType: { code: 'COMMERCIAL_ANALYSIS', name: '상권 분석' },
    payload: {
      districtCode: '11680',
      administrationCode: '11680510',
      commercialCode: '3110008',
      serviceCode: 'CS100001',
      periodCode: '20233',
    },
    bookmarkName: '역삼역 한식 후보',
    createdAt: '2026-08-20T10:00:00+09:00',
  },
  {
    bookmarkId: '7345678901234567891',
    shareType: { code: 'COMMERCIAL_COMPARISON', name: '상권 비교' },
    payload: { commercialCodes: ['3110008', '3110012'] },
    bookmarkName: null,
    createdAt: '2026-08-21T10:00:00+09:00',
  },
]

describe('profile region bookmarks', () => {
  it('keeps DISTRICT and ADMINISTRATION targets without COMMERCIAL targets', () => {
    expect(createProfileRegionBookmarkView(bookmarks)).toEqual([
      expect.objectContaining({
        bookmarkId: '10',
        targetType: 'DISTRICT',
        targetName: '강남구',
      }),
      expect.objectContaining({
        bookmarkId: '11',
        targetType: 'ADMINISTRATION',
        targetName: '신사동',
      }),
    ])
  })

  const regionMarkup = () =>
    renderToStaticMarkup(
      createElement(ProfileRegionBookmarkCards, {
        bookmarks: createProfileRegionBookmarkView(bookmarks),
        onRemove: () => {},
      }),
    )

  it('renders V2 target labels and does not invent analysis result parameters', () => {
    const markup = regionMarkup()

    expect(markup).toContain('자치구')
    expect(markup).toContain('행정동')
    expect(markup).toContain('강남구')
    expect(markup).toContain('신사동')
    expect(markup).not.toContain('테헤란로 상권')
    expect(markup).not.toContain('/analysis/result')
  })

  /* #574 — 카드가 갈 곳 없이 이름·코드·날짜만 보여 줬다. 카드 자체가 분석 탐색 화면을 연다. */
  it('카드를 분석 탐색 화면 딥링크로 만든다', () => {
    const markup = regionMarkup()

    expect(markup).toContain('href="/analysis?districtCode=11680"')
    expect(markup).toContain(
      'href="/analysis?districtCode=11680&amp;administrationCode=11680510"',
    )
    expect(markup).toContain('aria-label="신사동 상권 분석 열기"')
  })

  it('내부 코드 대신 상위 지역 이름을 적는다', () => {
    const markup = regionMarkup()

    expect(markup).not.toContain('지역 코드')
    expect(markup).toContain('서울특별시 강남구')
  })

  it('카드마다 이름이 붙은 해제 버튼을 둔다', () => {
    const markup = regionMarkup()

    expect(markup).toContain('aria-label="강남구 북마크 해제"')
    expect(markup).toContain('aria-label="신사동 북마크 해제"')
  })
})

describe('화면 보관함 카드', () => {
  const markup = renderToStaticMarkup(
    createElement(ProfileAnalysisArchiveCards, {
      items: archiveItems,
      onOpen: () => {},
      onRename: () => {},
      onDelete: () => {},
    }),
  )

  it('bookmarkId 를 문자열 그대로 보존한다 (숫자 변환 시 값 손상)', () => {
    expect(markup).toContain(BIG_ID)
    expect(markup).not.toContain(String(Number(BIG_ID)))
  })

  it('이름이 없으면 화면 타입 라벨로 대신한다', () => {
    expect(getArchiveItemTitle(archiveItems[0])).toBe('역삼역 한식 후보')
    expect(getArchiveItemTitle(archiveItems[1])).toBe('상권 비교')
  })

  it('payload 는 결과 데이터가 아니라 조건만 요약한다', () => {
    expect(summarizeArchivePayload(archiveItems[0])).toContain(
      'commercialCode 3110008',
    )
  })

  it('복원 가능한 항목만 열기 버튼을 활성화한다', () => {
    expect(markup).toContain('화면 열기')
    expect(markup).toContain('열 수 없음')
  })

  it('삭제 버튼에 무엇을 지우는지 이름을 붙인다', () => {
    expect(markup).toContain('aria-label="역삼역 한식 후보 보관 삭제"')
  })

  /* #574 — 삭제는 「이름 수정」과 같은 파란 tiny 버튼이었다. 위험색 ghost, 히트 영역 44px 로 바꾼다. */
  it('삭제 버튼은 위험색 ghost 이고 높이가 44px 다', () => {
    const sheet = new ServerStyleSheet()
    try {
      renderToStaticMarkup(
        sheet.collectStyles(
          createElement(ProfileAnalysisArchiveCards, {
            items: archiveItems,
            onOpen: () => {},
            onRename: () => {},
            onDelete: () => {},
          }),
        ),
      )
      const styles = sheet.getStyleTags().replace(/\s+/g, '')

      expect(styles).toContain(
        'min-height:44px;color:var(--color-negative-text)',
      )
    } finally {
      sheet.seal()
    }
  })
})

describe('지역·화면 북마크 안쪽 탭 (#606)', () => {
  const renderPage = () =>
    renderToStaticMarkup(
      createElement(
        QueryClientProvider,
        { client: new QueryClient() },
        createElement(ProfileAnalysisBookmarksPage),
      ),
    )

  it('주소에 탭이 없으면 지역 북마크를 연다', () => {
    navigation.search = ''
    const markup = renderPage()

    expect(markup).toMatch(/aria-pressed="true"[^>]*>지역 북마크</)
    expect(markup).toMatch(/aria-pressed="false"[^>]*>화면 보관함</)
  })

  it('?tab=archive 로 들어오면 화면 보관함을 연다 — 새로고침·뒤로가기에도 남는다', () => {
    navigation.search = 'tab=archive'
    const markup = renderPage()

    expect(markup).toMatch(/aria-pressed="true"[^>]*>화면 보관함</)
    expect(markup).toContain('보관한 화면을 불러오는 중입니다.')
  })
})
