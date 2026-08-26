import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '@/lib/api/client'
import {
  getCommercialBookmarkError,
  normalizeMemberBookmark,
} from '@/lib/recommend/recommend-bookmarks'
import {
  addMemberBookmark,
  fetchMemberBookmarks,
  parseMemberBookmarkResponse,
  quoteBookmarkIdsInRawJson,
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

/** 백엔드가 실제로 보내는 원문(숫자 리터럴)을 그대로 만든다. */
const rawListJson = (...ids: string[]) =>
  `{"dataHeader":{"success":true,"resultCode":null,"resultMessage":null},"dataBody":{"bookmarks":{"contents":[${ids
    .map(
      id =>
        `{"bookmarkId":${id},"targetType":"COMMERCIAL","targetCode":"C001","targetName":"테헤란로","createdAt":"2026-07-24T10:00:00"}`,
    )
    .join(',')}],"hasNext":false}}}`

const readContents = (parsed: unknown) =>
  (
    parsed as {
      dataBody: { bookmarks: { contents: { bookmarkId: unknown }[] } }
    }
  ).dataBody.bookmarks.contents

afterEach(() => vi.restoreAllMocks())

describe('bookmarkId 정밀도 (Snowflake)', () => {
  it('JSON.parse 가 값을 실제로 망친다는 사실을 문서화한다', () => {
    expect(Number(BIG_ID)).toBeGreaterThan(Number.MAX_SAFE_INTEGER)
    expect(String(Number(BIG_ID))).not.toBe(BIG_ID)
    // 이 변환 없이 파싱하면 이 자리에서 값이 이미 다른 행을 가리킨다.
    expect(
      String(readContents(JSON.parse(rawListJson(BIG_ID)))[0].bookmarkId),
    ).not.toBe(BIG_ID)
  })

  it('19자리 숫자 아이디를 문자열로 손실 없이 보존한다', () => {
    const parsed = parseMemberBookmarkResponse(rawListJson(BIG_ID))

    expect(readContents(parsed)[0].bookmarkId).toBe(BIG_ID)
  })

  it('백엔드가 이미 문자열로 내려주면 원문 그대로 통과한다', () => {
    const alreadyString = rawListJson(`"${BIG_ID}"`)

    expect(quoteBookmarkIdsInRawJson(alreadyString)).toBe(alreadyString)
    expect(
      readContents(parseMemberBookmarkResponse(alreadyString))[0].bookmarkId,
    ).toBe(BIG_ID)
  })

  it('생성 응답(항목 자체)의 아이디도 보존한다', () => {
    const created = `{"dataHeader":{"success":true,"resultCode":null,"resultMessage":null},"dataBody":{"bookmarkId":${BIG_ID},"targetType":"COMMERCIAL","targetCode":"C001","targetName":"테헤란로","createdAt":"2026-07-24T10:00:00"}}`
    const parsed = parseMemberBookmarkResponse(created) as {
      dataBody: { bookmarkId: unknown }
    }

    expect(parsed.dataBody.bookmarkId).toBe(BIG_ID)
    expect(normalizeMemberBookmark(parsed.dataBody)?.bookmarkId).toBe(BIG_ID)
  })

  it('예전 증상(목록 전체 폐기)이 재발하지 않는다', () => {
    const parsed = parseMemberBookmarkResponse(rawListJson(BIG_ID, '7'))

    expect(getCommercialBookmarkError(parsed, null)).toBeNull()
  })
})

describe('transformResponse 정규식 오작동 방어', () => {
  it('접미사만 같은 다른 키는 건드리지 않는다', () => {
    const raw = `{"lastBookmarkId":${BIG_ID},"existingBookmarkId":${BIG_ID},"bookmarkId":${BIG_ID}}`
    const parsed = parseMemberBookmarkResponse(raw) as Record<string, unknown>

    expect(typeof parsed.lastBookmarkId).toBe('number')
    expect(typeof parsed.existingBookmarkId).toBe('number')
    expect(parsed.bookmarkId).toBe(BIG_ID)
  })

  it('문자열 값 안에 들어 있는 유사 패턴은 그대로 둔다', () => {
    const raw = `{"targetName":"\\"bookmarkId\\": 99 저장소","bookmarkId":${BIG_ID}}`
    const parsed = parseMemberBookmarkResponse(raw) as Record<string, unknown>

    expect(parsed.targetName).toBe('"bookmarkId": 99 저장소')
    expect(parsed.bookmarkId).toBe(BIG_ID)
  })

  it('정수가 아닌 값은 감싸지 않아 JSON 을 깨뜨리지 않는다', () => {
    const raw = '{"bookmarkId":1.5,"other":null}'
    const parsed = parseMemberBookmarkResponse(raw) as Record<string, unknown>

    expect(parsed.bookmarkId).toBe(1.5)
    expect(parseMemberBookmarkResponse('{"bookmarkId":null}')).toEqual({
      bookmarkId: null,
    })
    // 정수가 아니면 검증에서 걸러진다 — 손상된 아이디를 통과시키지 않는다.
    expect(normalizeMemberBookmark(parsed)).toBeNull()
  })

  it('JSON 이 아닌 본문과 빈 본문은 그대로 흘린다', () => {
    expect(parseMemberBookmarkResponse('<html>502</html>')).toBe(
      '<html>502</html>',
    )
    expect(parseMemberBookmarkResponse('')).toBe('')
    expect(parseMemberBookmarkResponse(undefined)).toBe(undefined)
  })
})

describe('member bookmark API', () => {
  it('serializes size and the string cursor with URLSearchParams', async () => {
    const get = vi
      .spyOn(apiClient, 'get')
      .mockResolvedValue({ data: successResponse })

    await fetchMemberBookmarks(BIG_ID, 20)

    expect(get).toHaveBeenCalledWith(
      `/members/me/bookmarks?size=20&lastBookmarkId=${BIG_ID}`,
      { transformResponse: [parseMemberBookmarkResponse] },
    )
    // 커서도 Snowflake 다 — 손상된 십진 표기를 보내지 않는다.
    expect(get.mock.calls[0][0]).toContain(BIG_ID)
  })

  it('omits lastBookmarkId on the first page', async () => {
    const get = vi
      .spyOn(apiClient, 'get')
      .mockResolvedValue({ data: successResponse })

    await fetchMemberBookmarks()

    expect(get).toHaveBeenCalledWith('/members/me/bookmarks?size=50', {
      transformResponse: [parseMemberBookmarkResponse],
    })
  })

  it('passes an AbortSignal alongside the bookmark transform', async () => {
    const get = vi
      .spyOn(apiClient, 'get')
      .mockResolvedValue({ data: successResponse })
    const signal = new AbortController().signal

    await fetchMemberBookmarks('91', 20, signal)

    expect(get).toHaveBeenCalledWith(
      '/members/me/bookmarks?size=20&lastBookmarkId=91',
      { transformResponse: [parseMemberBookmarkResponse], signal },
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

    expect(post).toHaveBeenCalledWith(
      '/members/me/bookmarks',
      {
        targetType: 'COMMERCIAL',
        targetCode: 'C001',
        targetName: '테헤란로',
      },
      { transformResponse: [parseMemberBookmarkResponse] },
    )
  })

  it('DELETE 경로에 받은 문자열 아이디를 그대로 넣는다', async () => {
    const remove = vi
      .spyOn(apiClient, 'delete')
      .mockResolvedValue({ data: { ...successResponse, dataBody: null } })

    await removeMemberBookmark(BIG_ID)

    expect(remove).toHaveBeenCalledWith(`/members/me/bookmarks/${BIG_ID}`, {
      transformResponse: [parseMemberBookmarkResponse],
    })
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
