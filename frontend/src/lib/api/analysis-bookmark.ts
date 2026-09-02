/**
 * 분석 화면 보관함 (`commercial-service` `/api/v1/analysis-bookmarks`). 전부 로그인 필수.
 *
 * 공유 링크와 shareType·payload 계약이 완전히 같다 — payload 는 `@/lib/share/payload` 빌더로 만든다.
 *
 * ⚠️ `bookmarkId` 는 **문자열**이다. Snowflake 값이 `Number.MAX_SAFE_INTEGER` 를 넘어
 * 숫자로 파싱하면 값이 손상되므로 이 파일 어디에서도 `Number(...)` 로 바꾸지 않는다.
 */

import { apiClient } from '@/lib/api/client'
import { normalizeApiError, readAppThrownMessage } from '@/lib/api/api-error'
import type { ShareType } from '@/lib/share/payload'
import type { ApiResponse } from '@/types/api'
import type {
  AnalysisBookmarkCreateResponse,
  AnalysisBookmarksResponse,
  CreateAnalysisBookmarkPayload,
} from '@/types/bookmark'

const BASE_PATH = '/analysis-bookmarks'

/** 목록 페이지 크기. 백엔드 허용 범위는 1~50. */
export const ANALYSIS_BOOKMARK_PAGE_SIZE = 20

export const buildAnalysisBookmarkListParams = ({
  shareType,
  page = 0,
  size = ANALYSIS_BOOKMARK_PAGE_SIZE,
}: {
  shareType?: ShareType | null
  page?: number
  size?: number
}): URLSearchParams => {
  const params = new URLSearchParams()
  if (shareType) params.set('shareType', shareType)
  params.set('page', String(page))
  params.set('size', String(size))
  return params
}

export const fetchAnalysisBookmarks = async (
  options: {
    shareType?: ShareType | null
    page?: number
    size?: number
  } = {},
) => {
  const response = await apiClient.get<AnalysisBookmarksResponse>(
    `${BASE_PATH}?${buildAnalysisBookmarkListParams(options)}`,
  )
  return response.data
}

export const createAnalysisBookmark = async (
  request: CreateAnalysisBookmarkPayload,
) => {
  const response = await apiClient.post<AnalysisBookmarkCreateResponse>(
    BASE_PATH,
    request,
  )
  return response.data
}

/** 이름 수정. `bookmarkName` 이 null/공백이면 이름을 제거한다. */
export const updateAnalysisBookmarkName = async (
  bookmarkId: string,
  bookmarkName: string | null,
) => {
  const response = await apiClient.patch<ApiResponse<null>>(
    `${BASE_PATH}/${encodeURIComponent(bookmarkId)}`,
    { bookmarkName },
  )
  return response.data
}

export const deleteAnalysisBookmark = async (bookmarkId: string) => {
  const response = await apiClient.delete<ApiResponse<null>>(
    `${BASE_PATH}/${encodeURIComponent(bookmarkId)}`,
  )
  return response.data
}

/* ------------------------------------------------------------------------- *
 * 저장 실패 분류
 * ------------------------------------------------------------------------- */

export const ANALYSIS_BOOKMARK_DUPLICATE_CODE = 'ANALYSIS_BOOKMARK_002'
export const ANALYSIS_BOOKMARK_LIMIT_CODE = 'ANALYSIS_BOOKMARK_006'

export type AnalysisBookmarkSaveFailure =
  /** 409 — 같은 화면 상태가 이미 있다. `existingBookmarkId` 가 있으면 해제 토글이 가능하다. */
  | { kind: 'duplicate'; existingBookmarkId: string | null; message: string }
  /** 400 `ANALYSIS_BOOKMARK_006` — 저장 상한(기본 100개) 초과. 서버 문구를 그대로 쓴다. */
  | { kind: 'limit'; message: string }
  /** 401/403 — 로그인 필요. */
  | { kind: 'unauthorized'; message: string }
  /** 그 밖의 실패. `retryable` 이면 재시도 버튼을 붙여도 된다. */
  | { kind: 'other'; message: string; retryable: boolean }

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/**
 * 409 응답 본문에서 기존 항목 id 를 읽는다.
 *
 * **문자열만 받아들인다.** 숫자로 내려오면 이미 JSON 파싱 단계에서 정밀도가 깨졌으므로,
 * 손상된 값으로 DELETE 를 쏘느니 토글 불가(null)로 처리해 안내만 하는 편이 안전하다.
 */
export const readExistingBookmarkId = (body: unknown): string | null => {
  if (!isRecord(body)) return null
  const dataBody = isRecord(body.dataBody) ? body.dataBody : body
  const value = dataBody.existingBookmarkId
  return typeof value === 'string' && value.trim() ? value : null
}

/** 저장 실패(axios rejection)를 화면 분기용으로 환산한다. */
export const classifyAnalysisBookmarkSaveError = (
  error: unknown,
): AnalysisBookmarkSaveFailure => {
  // axios 가 아닌, 화면에서 직접 던진 Error(예: 200인데 success:false)는 그 문구를 그대로 쓴다.
  const appThrown = readAppThrownMessage(error)
  if (appThrown) {
    return { kind: 'other', message: appThrown, retryable: false }
  }

  const normalized = normalizeApiError(error)
  const responseBody = isRecord(error)
    ? isRecord(error.response)
      ? error.response.data
      : undefined
    : undefined

  if (
    normalized.status === 409 ||
    normalized.code === ANALYSIS_BOOKMARK_DUPLICATE_CODE
  ) {
    return {
      kind: 'duplicate',
      existingBookmarkId: readExistingBookmarkId(responseBody),
      message: normalized.message || '이미 보관함에 저장된 화면이에요.',
    }
  }

  if (normalized.code === ANALYSIS_BOOKMARK_LIMIT_CODE) {
    return { kind: 'limit', message: normalized.message }
  }

  if (normalized.kind === 'unauthorized') {
    return { kind: 'unauthorized', message: normalized.message }
  }

  return {
    kind: 'other',
    message: normalized.message,
    retryable: normalized.kind === 'network' || normalized.kind === 'server',
  }
}
