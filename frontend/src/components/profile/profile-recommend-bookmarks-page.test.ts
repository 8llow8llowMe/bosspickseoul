import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { MemberBookmark } from '@/types/bookmark'
import {
  COMMERCIAL_BOOKMARK_OPEN_FAILED,
  createProfileRecommendBookmarkView,
  ProfileRecommendBookmarkCards,
} from './profile-recommend-bookmarks-page'

const bookmarks: MemberBookmark[] = [
  {
    bookmarkId: '10',
    targetType: 'COMMERCIAL',
    targetCode: 'C001',
    targetName: '테헤란로 상권',
    createdAt: '2026-07-24T10:00:00+09:00',
  },
  {
    bookmarkId: '11',
    targetType: 'DISTRICT',
    targetCode: '11680',
    targetName: '강남구',
    createdAt: '2026-07-24T10:00:00+09:00',
  },
]

describe('profile recommendation bookmarks', () => {
  it('builds a view model from COMMERCIAL targets only and preserves bookmarkId', () => {
    expect(createProfileRecommendBookmarkView(bookmarks)).toEqual([
      {
        bookmarkId: '10',
        targetCode: 'C001',
        targetName: '테헤란로 상권',
        createdAt: '2026-07-24T10:00:00+09:00',
      },
    ])
  })

  const cardsMarkup = (props: { openingCode?: string; failedCode?: string }) =>
    renderToStaticMarkup(
      createElement(ProfileRecommendBookmarkCards, {
        bookmarks: createProfileRecommendBookmarkView(bookmarks),
        onOpen: () => {},
        onRemove: () => {},
        ...props,
      }),
    )

  it('renders only the new generic bookmark contract without legacy region fields', () => {
    const markup = cardsMarkup({})

    expect(markup).toContain('상권 북마크')
    expect(markup).toContain('테헤란로 상권')
    expect(markup).not.toContain('강남구')
    expect(markup).not.toContain('administrationCodeName')
    expect(markup).not.toContain('districtCodeName')
  })

  /* #574 — 「상권 코드 C001」 같은 내부 코드 대신 카드를 누르면 무엇이 열리는지 적는다. */
  it('내부 코드를 보여 주지 않고 카드 전체가 분석 화면을 여는 버튼이다', () => {
    const markup = cardsMarkup({})

    expect(markup).not.toContain('상권 코드')
    expect(markup).toContain('aria-label="테헤란로 상권 상권 분석 열기"')
    expect(markup).toContain('aria-label="테헤란로 상권 북마크 해제"')
  })

  it('역조회 중이면 그 카드만 잠그고, 실패하면 그 카드에 이유를 적는다', () => {
    expect(cardsMarkup({ openingCode: 'C001' })).toContain(
      '분석 화면을 여는 중이에요.',
    )
    expect(cardsMarkup({ failedCode: 'C001' })).toContain(
      COMMERCIAL_BOOKMARK_OPEN_FAILED,
    )
    expect(cardsMarkup({})).not.toContain(COMMERCIAL_BOOKMARK_OPEN_FAILED)
  })
})
