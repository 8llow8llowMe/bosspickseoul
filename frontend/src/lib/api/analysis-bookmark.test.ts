import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '@/lib/api/client'
import {
  ANALYSIS_BOOKMARK_DUPLICATE_CODE,
  ANALYSIS_BOOKMARK_LIMIT_CODE,
  buildAnalysisBookmarkListParams,
  classifyAnalysisBookmarkSaveError,
  createAnalysisBookmark,
  deleteAnalysisBookmark,
  fetchAnalysisBookmarks,
  readExistingBookmarkId,
  updateAnalysisBookmarkName,
} from './analysis-bookmark'

/** Snowflake — Number 로 파싱하면 값이 손상되는 크기다. */
const BIG_ID = '7345678901234567890'

const okResponse = {
  dataHeader: { success: true, resultCode: null, resultMessage: null },
  dataBody: null,
}

const axiosError = (
  status: number,
  resultCode: string,
  resultMessage: string,
  dataBody: unknown = null,
) =>
  Object.assign(new Error('Request failed'), {
    isAxiosError: true,
    response: {
      status,
      data: {
        dataHeader: { success: false, resultCode, resultMessage },
        dataBody,
      },
    },
  })

afterEach(() => vi.restoreAllMocks())

describe('bookmarkId 는 문자열이다', () => {
  it('Number 로 바꾸면 값이 손상되는 크기임을 확인한다 (회귀 방지)', () => {
    expect(Number(BIG_ID)).toBeGreaterThan(Number.MAX_SAFE_INTEGER)
    expect(String(Number(BIG_ID))).not.toBe(BIG_ID)
  })

  it('DELETE 경로에 받은 문자열을 그대로 넣는다', async () => {
    const del = vi
      .spyOn(apiClient, 'delete')
      .mockResolvedValue({ data: okResponse })

    await deleteAnalysisBookmark(BIG_ID)

    expect(del).toHaveBeenCalledWith(`/analysis-bookmarks/${BIG_ID}`)
    expect(del.mock.calls[0][0]).toContain(BIG_ID)
  })

  it('PATCH 경로에도 문자열을 그대로 넣는다', async () => {
    const patch = vi
      .spyOn(apiClient, 'patch')
      .mockResolvedValue({ data: okResponse })

    await updateAnalysisBookmarkName(BIG_ID, '역삼역 한식 후보')

    expect(patch).toHaveBeenCalledWith(`/analysis-bookmarks/${BIG_ID}`, {
      bookmarkName: '역삼역 한식 후보',
    })
  })

  it('이름을 null 로 보내면 이름을 제거한다', async () => {
    const patch = vi
      .spyOn(apiClient, 'patch')
      .mockResolvedValue({ data: okResponse })

    await updateAnalysisBookmarkName(BIG_ID, null)

    expect(patch.mock.calls[0][1]).toEqual({ bookmarkName: null })
  })

  it('409 응답의 existingBookmarkId 를 문자열 그대로 읽는다', () => {
    expect(
      readExistingBookmarkId({ dataBody: { existingBookmarkId: BIG_ID } }),
    ).toBe(BIG_ID)
  })

  it('숫자로 온 existingBookmarkId 는 이미 손상됐으므로 토글 불가(null)로 둔다', () => {
    expect(
      readExistingBookmarkId({
        dataBody: { existingBookmarkId: 7345678901234567890 },
      }),
    ).toBeNull()
    expect(readExistingBookmarkId({ dataBody: {} })).toBeNull()
    expect(readExistingBookmarkId(null)).toBeNull()
  })
})

describe('목록 조회', () => {
  it('shareType 필터와 페이지 파라미터를 붙인다', () => {
    expect(
      buildAnalysisBookmarkListParams({
        shareType: 'COMMERCIAL_ANALYSIS',
      }).toString(),
    ).toBe('shareType=COMMERCIAL_ANALYSIS&page=0&size=20')
  })

  it('필터가 없으면 shareType 을 보내지 않는다', () => {
    expect(buildAnalysisBookmarkListParams({}).toString()).toBe(
      'page=0&size=20',
    )
  })

  it('GET 경로를 조립한다', async () => {
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue({
      data: {
        dataHeader: { success: true, resultCode: null, resultMessage: null },
        dataBody: {
          bookmarks: [],
          page: 0,
          size: 20,
          totalElements: 0,
          totalPages: 0,
        },
      },
    })

    await fetchAnalysisBookmarks({ shareType: 'AI_REPORT', page: 1 })

    expect(get).toHaveBeenCalledWith(
      '/analysis-bookmarks?shareType=AI_REPORT&page=1&size=20',
    )
  })
})

describe('저장 요청', () => {
  it('shareType 과 payload 를 그대로 보낸다', async () => {
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({
      data: {
        dataHeader: { success: true, resultCode: null, resultMessage: null },
        dataBody: { bookmark: { bookmarkId: BIG_ID } },
      },
    })

    await createAnalysisBookmark({
      shareType: 'COMMERCIAL_ANALYSIS',
      payload: { commercialCode: '3110008' },
      bookmarkName: '역삼역 한식 후보',
    })

    expect(post).toHaveBeenCalledWith('/analysis-bookmarks', {
      shareType: 'COMMERCIAL_ANALYSIS',
      payload: { commercialCode: '3110008' },
      bookmarkName: '역삼역 한식 후보',
    })
  })
})

describe('classifyAnalysisBookmarkSaveError', () => {
  it('409 는 중복으로 분류하고 existingBookmarkId 로 해제 토글을 넘긴다', () => {
    const failure = classifyAnalysisBookmarkSaveError(
      axiosError(
        409,
        ANALYSIS_BOOKMARK_DUPLICATE_CODE,
        '이미 보관한 화면입니다.',
        {
          existingBookmarkId: BIG_ID,
        },
      ),
    )

    expect(failure).toEqual({
      kind: 'duplicate',
      existingBookmarkId: BIG_ID,
      message: '이미 보관한 화면입니다.',
    })
  })

  it('409 인데 existingBookmarkId 가 null 이면 토글 불가로 둔다', () => {
    const failure = classifyAnalysisBookmarkSaveError(
      axiosError(
        409,
        ANALYSIS_BOOKMARK_DUPLICATE_CODE,
        '이미 보관한 화면입니다.',
        {
          existingBookmarkId: null,
        },
      ),
    )

    expect(failure.kind).toBe('duplicate')
    if (failure.kind === 'duplicate') {
      expect(failure.existingBookmarkId).toBeNull()
    }
  })

  it('400 저장 상한은 서버 resultMessage 를 그대로 쓴다', () => {
    const failure = classifyAnalysisBookmarkSaveError(
      axiosError(
        400,
        ANALYSIS_BOOKMARK_LIMIT_CODE,
        '보관함이 가득 찼습니다. 최대 100개까지 보관할 수 있습니다.',
      ),
    )

    expect(failure).toEqual({
      kind: 'limit',
      message: '보관함이 가득 찼습니다. 최대 100개까지 보관할 수 있습니다.',
    })
  })

  it('401 은 로그인 유도로 분류한다', () => {
    expect(
      classifyAnalysisBookmarkSaveError(axiosError(401, 'SECURITY_001', '만료'))
        .kind,
    ).toBe('unauthorized')
  })

  it('5xx 만 재시도 가능으로 표시한다', () => {
    const server = classifyAnalysisBookmarkSaveError(
      axiosError(500, 'SERVER', '서버 오류'),
    )
    const client = classifyAnalysisBookmarkSaveError(
      axiosError(400, 'ANALYSIS_BOOKMARK_003', 'payload 오류'),
    )

    expect(server).toMatchObject({ kind: 'other', retryable: true })
    expect(client).toMatchObject({ kind: 'other', retryable: false })
  })

  it('화면에서 직접 던진 Error 는 그 문구를 그대로 쓴다', () => {
    expect(
      classifyAnalysisBookmarkSaveError(
        new Error('분석 조건을 확인하지 못했어요.'),
      ),
    ).toEqual({
      kind: 'other',
      message: '분석 조건을 확인하지 못했어요.',
      retryable: false,
    })
  })
})
