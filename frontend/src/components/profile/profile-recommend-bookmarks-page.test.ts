import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { MemberBookmark } from '@/types/bookmark'
import {
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

  it('renders only the new generic bookmark contract without legacy region fields', () => {
    const markup = renderToStaticMarkup(
      createElement(ProfileRecommendBookmarkCards, {
        bookmarks: createProfileRecommendBookmarkView(bookmarks),
      }),
    )

    expect(markup).toContain('상권 북마크')
    expect(markup).toContain('테헤란로 상권')
    expect(markup).toContain('상권 코드 C001')
    expect(markup).not.toContain('강남구')
    expect(markup).not.toContain('administrationCodeName')
    expect(markup).not.toContain('districtCodeName')
  })
})
