import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { MemberBookmark } from '@/types/bookmark'
import {
  createProfileRegionBookmarkView,
  ProfileRegionBookmarkCards,
} from './profile-analysis-bookmarks-page'

const bookmarks: MemberBookmark[] = [
  {
    bookmarkId: 10,
    targetType: 'DISTRICT',
    targetCode: '11680',
    targetName: '강남구',
    createdAt: '2026-07-24T10:00:00+09:00',
  },
  {
    bookmarkId: 11,
    targetType: 'ADMINISTRATION',
    targetCode: '11680510',
    targetName: '신사동',
    createdAt: '2026-07-24T10:00:00+09:00',
  },
  {
    bookmarkId: 12,
    targetType: 'COMMERCIAL',
    targetCode: 'C001',
    targetName: '테헤란로 상권',
    createdAt: '2026-07-24T10:00:00+09:00',
  },
]

describe('profile region bookmarks', () => {
  it('keeps DISTRICT and ADMINISTRATION targets without COMMERCIAL targets', () => {
    expect(createProfileRegionBookmarkView(bookmarks)).toEqual([
      expect.objectContaining({
        bookmarkId: 10,
        targetType: 'DISTRICT',
        targetName: '강남구',
      }),
      expect.objectContaining({
        bookmarkId: 11,
        targetType: 'ADMINISTRATION',
        targetName: '신사동',
      }),
    ])
  })

  it('renders V2 target labels and does not invent analysis result parameters', () => {
    const markup = renderToStaticMarkup(
      createElement(ProfileRegionBookmarkCards, {
        bookmarks: createProfileRegionBookmarkView(bookmarks),
      }),
    )

    expect(markup).toContain('자치구')
    expect(markup).toContain('행정동')
    expect(markup).toContain('강남구')
    expect(markup).toContain('신사동')
    expect(markup).not.toContain('테헤란로 상권')
    expect(markup).not.toContain('/analysis/result')
  })
})
