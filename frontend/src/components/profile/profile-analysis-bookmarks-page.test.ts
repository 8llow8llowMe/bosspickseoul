import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { AnalysisBookmark, MemberBookmark } from '@/types/bookmark'
import {
  createProfileRegionBookmarkView,
  getArchiveItemTitle,
  ProfileAnalysisArchiveCards,
  ProfileRegionBookmarkCards,
  summarizeArchivePayload,
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
})
