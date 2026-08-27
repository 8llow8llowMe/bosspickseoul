import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '@/lib/api/client'
import {
  addMemberBookmark,
  fetchMemberBookmarks,
  removeMemberBookmark,
} from './user'

/** auth-service `SnowflakeIdGenerator` 가 실제로 만드는 크기(19자리). */
const BIG_ID = '3509000947126763521'

const successResponse = {
  dataHeader: {
    success: true,
    resultCode: null,
    resultMessage: null,
  },
  dataBody: {
    bookmarks: {
      contents: [],
      hasNext: false,
    },
  },
}

afterEach(() => vi.restoreAllMocks())

describe('member bookmark API', () => {
  it('serializes size and the string cursor with URLSearchParams', async () => {
    const get = vi
      .spyOn(apiClient, 'get')
      .mockResolvedValue({ data: successResponse })

    await fetchMemberBookmarks(BIG_ID, 20)

    expect(get).toHaveBeenCalledWith(
      `/members/me/bookmarks?size=20&lastBookmarkId=${BIG_ID}`,
    )
    // 커서도 Snowflake 다 — 손상된 십진 표기를 보내지 않는다.
    expect(get.mock.calls[0][0]).toContain(BIG_ID)
  })

  it('omits lastBookmarkId on the first page', async () => {
    const get = vi
      .spyOn(apiClient, 'get')
      .mockResolvedValue({ data: successResponse })

    await fetchMemberBookmarks()

    expect(get).toHaveBeenCalledWith('/members/me/bookmarks?size=50')
  })

  it('passes an AbortSignal through', async () => {
    const get = vi
      .spyOn(apiClient, 'get')
      .mockResolvedValue({ data: successResponse })
    const signal = new AbortController().signal

    await fetchMemberBookmarks('91', 20, signal)

    expect(get).toHaveBeenCalledWith(
      '/members/me/bookmarks?size=20&lastBookmarkId=91',
      { signal },
    )
  })

  it('creates a COMMERCIAL bookmark with the exact target payload', async () => {
    const post = vi
      .spyOn(apiClient, 'post')
      .mockResolvedValue({ data: successResponse })

    await addMemberBookmark({
      targetType: 'COMMERCIAL',
      targetCode: 'C001',
      targetName: '테헤란로',
    })

    expect(post).toHaveBeenCalledWith('/members/me/bookmarks', {
      targetType: 'COMMERCIAL',
      targetCode: 'C001',
      targetName: '테헤란로',
    })
  })

  it('DELETE 경로에 받은 문자열 아이디를 그대로 넣는다', async () => {
    const remove = vi
      .spyOn(apiClient, 'delete')
      .mockResolvedValue({ data: { ...successResponse, dataBody: null } })

    await removeMemberBookmark(BIG_ID)

    expect(remove).toHaveBeenCalledWith(`/members/me/bookmarks/${BIG_ID}`)
    expect(remove.mock.calls[0][0]).toContain(BIG_ID)
  })
})

describe('bookmarkId 숫자 변환 금지 (소스 계약)', () => {
  const sources = [
    'src/lib/api/user.ts',
    'src/lib/recommend/recommend-bookmarks.ts',
    'src/hooks/use-member-bookmarks.ts',
    'src/hooks/use-commercial-bookmarks.ts',
    'src/components/profile/profile-recommend-bookmarks-page.tsx',
    'src/components/recommend/recommend-page.tsx',
    'src/components/analysis/analysis-result-view.tsx',
  ]

  const readSource = (path: string) =>
    readFileSync(new URL(`../../../${path}`, import.meta.url), 'utf8')

  it.each(sources)('%s 는 bookmarkId 를 Number 로 바꾸지 않는다', path => {
    const source = readSource(path)

    expect(source).not.toMatch(/Number\s*\(\s*[A-Za-z.?[\]'"]*bookmarkId/i)
    expect(source).not.toMatch(/parseInt\s*\(\s*[A-Za-z.?[\]'"]*bookmarkId/i)
  })

  it('검증이 다시 Number.isSafeInteger 로 되돌아가지 않는다', () => {
    // 원래 버그: `Number.isSafeInteger(value.bookmarkId)` 가 19자리 Snowflake 를
    // 전부 탈락시켜 목록이 통째로 폐기됐다. 문자열 검증으로만 판정한다.
    expect(readSource('src/lib/recommend/recommend-bookmarks.ts')).not.toMatch(
      /isSafeInteger/,
    )
  })
})
