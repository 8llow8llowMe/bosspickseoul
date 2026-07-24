import { describe, expect, it, vi } from 'vitest'
import type { MemberBookmarksResponse } from '@/types/bookmark'
import {
  collectCommercialBookmarks,
  clearMemberBookmarksQuery,
  getCommercialBookmarkCollectionError,
  getCommercialBookmarkError,
  getCommercialBookmarkNextPageParam,
  getCommercialBookmarkView,
  getMemberBookmarksQueryKey,
  invalidateMemberBookmarksQuery,
  isMemberBookmarkQueryEnabled,
  normalizeMemberBookmarkResponse,
  shouldAutoFetchNextBookmarkPage,
  validateMemberBookmarkResponse,
} from './recommend-bookmarks'

const response = (contents: unknown[], hasNext: unknown = false) =>
  ({
    dataHeader: {
      success: true,
      resultCode: null,
      resultMessage: null,
    },
    dataBody: {
      bookmarks: {
        contents,
        hasNext,
      },
    },
  }) as unknown as MemberBookmarksResponse

describe('commercial bookmark collection', () => {
  it('flattens pages, keeps only valid COMMERCIAL targets, and preserves bookmarkId', () => {
    const pages = [
      response([
        {
          bookmarkId: 41,
          targetType: 'COMMERCIAL',
          targetCode: 'C001',
          targetName: '테헤란로',
          createdAt: '2026-07-24T10:00:00',
        },
        {
          bookmarkId: 42,
          targetType: 'DISTRICT',
          targetCode: '11680',
          targetName: '강남구',
          createdAt: '2026-07-24T10:00:00',
        },
      ]),
      response([
        {
          bookmarkId: 43,
          targetType: 'COMMERCIAL',
          targetCode: 'C002',
          targetName: '가로수길',
          createdAt: '2026-07-24T11:00:00',
        },
      ]),
    ]

    expect(collectCommercialBookmarks(pages)).toEqual([
      expect.objectContaining({ bookmarkId: 41, targetCode: 'C001' }),
      expect.objectContaining({ bookmarkId: 43, targetCode: 'C002' }),
    ])
  })

  it('rejects failed and malformed success payloads without throwing', () => {
    const failed = {
      dataHeader: {
        success: false,
        resultCode: 'FAILED',
        resultMessage: '실패',
      },
      dataBody: {
        bookmarks: {
          contents: [
            {
              bookmarkId: 9,
              targetType: 'COMMERCIAL',
              targetCode: 'PRIVATE',
              targetName: '노출 금지',
              createdAt: '2026-07-24',
            },
          ],
          hasNext: false,
        },
      },
    } as MemberBookmarksResponse

    expect(() =>
      normalizeMemberBookmarkResponse({
        dataHeader: { success: true },
        dataBody: { bookmarks: { contents: 'broken', hasNext: 'yes' } },
      }),
    ).not.toThrow()
    expect(
      collectCommercialBookmarks([failed, response([null, 1, {}])]),
    ).toEqual([])
  })

  it('deduplicates repeated pages by bookmarkId', () => {
    const duplicated = {
      bookmarkId: 41,
      targetType: 'COMMERCIAL',
      targetCode: 'C001',
      targetName: '테헤란로',
      createdAt: '2026-07-24T10:00:00',
    }

    expect(
      collectCommercialBookmarks([
        response([duplicated]),
        response([duplicated]),
      ]),
    ).toHaveLength(1)
  })

  it('treats one malformed item among valid items as a malformed page', () => {
    const partiallyMalformed = response([
      {
        bookmarkId: 41,
        targetType: 'COMMERCIAL',
        targetCode: 'C001',
        targetName: '테헤란로',
        createdAt: '2026-07-24',
      },
      { bookmarkId: 'broken' },
    ])

    expect(normalizeMemberBookmarkResponse(partiallyMalformed)).toBeNull()
    expect(
      getCommercialBookmarkCollectionError([partiallyMalformed], null),
    ).toBe('상권 북마크 응답 형식을 확인하지 못했습니다.')
  })

  it('treats an all-malformed page as an error but accepts a valid empty page', () => {
    const allMalformed = response([null, {}, 1])
    const validEmpty = response([])

    expect(normalizeMemberBookmarkResponse(allMalformed)).toBeNull()
    expect(() => validateMemberBookmarkResponse(allMalformed)).toThrow(
      '상권 북마크 응답 형식을 확인하지 못했습니다.',
    )
    expect(normalizeMemberBookmarkResponse(validEmpty)).toEqual({
      contents: [],
      hasNext: false,
    })
    expect(validateMemberBookmarkResponse(validEmpty)).toBe(validEmpty)
  })
})

describe('member bookmark account isolation', () => {
  it('builds a distinct query key for each member lifecycle', () => {
    expect(getMemberBookmarksQueryKey('member-a')).toEqual([
      'member',
      'member-a',
      'bookmarks',
    ])
    expect(getMemberBookmarksQueryKey('member-b')).not.toEqual(
      getMemberBookmarksQueryKey('member-a'),
    )
  })

  it('disables bookmark data between account lifecycles without a member id', () => {
    expect(isMemberBookmarkQueryEnabled('member-a', true)).toBe(true)
    expect(isMemberBookmarkQueryEnabled(null, true)).toBe(false)
    expect(isMemberBookmarkQueryEnabled('member-b', false)).toBe(false)
  })

  it('invalidates only the member captured at mutation time', async () => {
    const invalidateQueries = vi.fn().mockResolvedValue(undefined)

    await invalidateMemberBookmarksQuery({ invalidateQueries }, 'member-a')

    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: getMemberBookmarksQueryKey('member-a'),
    })
    expect(invalidateQueries).not.toHaveBeenCalledWith({
      queryKey: getMemberBookmarksQueryKey('member-b'),
    })
  })

  it('cancels and removes only the logged-out member cache before another account is used', async () => {
    const cancelQueries = vi.fn().mockResolvedValue(undefined)
    const removeQueries = vi.fn()

    await clearMemberBookmarksQuery(
      { cancelQueries, removeQueries },
      'member-a',
    )

    expect(cancelQueries).toHaveBeenCalledWith({
      queryKey: getMemberBookmarksQueryKey('member-a'),
    })
    expect(removeQueries).toHaveBeenCalledWith({
      queryKey: getMemberBookmarksQueryKey('member-a'),
    })
    expect(removeQueries).not.toHaveBeenCalledWith({
      queryKey: getMemberBookmarksQueryKey('member-b'),
    })
  })

  it('settles logout cleanup safely when cancellation and removal reject', async () => {
    const cancelQueries = vi.fn().mockRejectedValue(new Error('cancel failed'))
    const removeQueries = vi.fn(() => {
      throw new Error('remove failed')
    })

    await expect(
      clearMemberBookmarksQuery({ cancelQueries, removeQueries }, 'member-a'),
    ).resolves.toBeUndefined()
    expect(removeQueries).toHaveBeenCalledWith({
      queryKey: getMemberBookmarksQueryKey('member-a'),
    })
  })
})

describe('commercial bookmark pagination', () => {
  it('uses the last valid bookmark id only when hasNext is true', () => {
    expect(
      getCommercialBookmarkNextPageParam(
        response(
          [
            {
              bookmarkId: 91,
              targetType: 'COMMERCIAL',
              targetCode: 'C001',
              targetName: '테헤란로',
              createdAt: '2026-07-24',
            },
          ],
          true,
        ),
        [],
      ),
    ).toBe(91)
  })

  it('terminates on an empty, malformed, or repeated cursor', () => {
    expect(getCommercialBookmarkNextPageParam(response([], true), [])).toBe(
      undefined,
    )
    expect(getCommercialBookmarkNextPageParam(response([null], true), [])).toBe(
      undefined,
    )
    expect(
      getCommercialBookmarkNextPageParam(
        response(
          [
            {
              bookmarkId: 91,
              targetType: 'COMMERCIAL',
              targetCode: 'C001',
              targetName: '테헤란로',
              createdAt: '2026-07-24',
            },
          ],
          true,
        ),
        [response([], true), response([], true)] as MemberBookmarksResponse[],
        91,
      ),
    ).toBe(undefined)
  })

  it('terminates when a cursor cycles back to any previously requested page', () => {
    expect(
      getCommercialBookmarkNextPageParam(
        response(
          [
            {
              bookmarkId: 91,
              targetType: 'COMMERCIAL',
              targetCode: 'C001',
              targetName: '테헤란로',
              createdAt: '2026-07-24',
            },
          ],
          true,
        ),
        [],
        80,
        [undefined, 91, 80],
      ),
    ).toBe(undefined)
  })
})

describe('commercial bookmark visibility', () => {
  it('returns no stale private data when disabled', () => {
    const items = collectCommercialBookmarks([
      response([
        {
          bookmarkId: 41,
          targetType: 'COMMERCIAL',
          targetCode: 'C001',
          targetName: '테헤란로',
          createdAt: '2026-07-24',
        },
      ]),
    ])

    expect(getCommercialBookmarkView(false, items)).toEqual([])
    expect(getCommercialBookmarkView(true, items)).toEqual(items)
  })

  it('exposes failed API envelopes as an error instead of a successful list', () => {
    expect(
      getCommercialBookmarkError(
        {
          dataHeader: {
            success: false,
            resultCode: 'FAILED',
            resultMessage: '북마크 조회 실패',
          },
          dataBody: null,
        },
        null,
      ),
    ).toBe('북마크 조회 실패')
  })

  it('surfaces a failed later page instead of presenting a partial collection as success', () => {
    expect(
      getCommercialBookmarkCollectionError(
        [
          response([]),
          {
            dataHeader: {
              success: false,
              resultCode: 'FAILED',
              resultMessage: '다음 페이지 실패',
            },
            dataBody: null,
          },
        ],
        null,
      ),
    ).toBe('다음 페이지 실패')
  })

  it('surfaces a malformed later page even when an earlier page was valid', () => {
    expect(
      getCommercialBookmarkCollectionError(
        [response([]), response([{ bookmarkId: 'broken' }])],
        null,
      ),
    ).toBe('상권 북마크 응답 형식을 확인하지 못했습니다.')
  })
})

describe('commercial bookmark auto-fetch', () => {
  it('fetches only one next page at a time when enabled and a cursor exists', () => {
    expect(
      shouldAutoFetchNextBookmarkPage({
        enabled: true,
        hasNextPage: true,
        isFetchingNextPage: false,
        nextCursor: 91,
      }),
    ).toBe(true)
    expect(
      shouldAutoFetchNextBookmarkPage({
        enabled: true,
        hasNextPage: true,
        isFetchingNextPage: true,
        nextCursor: 91,
      }),
    ).toBe(false)
  })

  it('does not fetch with a missing cursor or while disabled', () => {
    expect(
      shouldAutoFetchNextBookmarkPage({
        enabled: true,
        hasNextPage: true,
        isFetchingNextPage: false,
        nextCursor: undefined,
      }),
    ).toBe(false)
    expect(
      shouldAutoFetchNextBookmarkPage({
        enabled: false,
        hasNextPage: true,
        isFetchingNextPage: false,
        nextCursor: 91,
      }),
    ).toBe(false)
  })

  it('does not restart automatic pagination after a next-page error', () => {
    expect(
      shouldAutoFetchNextBookmarkPage({
        enabled: true,
        hasNextPage: true,
        isFetchingNextPage: false,
        nextCursor: 91,
        hasError: true,
      }),
    ).toBe(false)
  })
})
