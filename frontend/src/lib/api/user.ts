import type { AxiosResponseTransformer } from 'axios'
import { apiClient } from '@/lib/api/client'
import type { ApiResponse } from '@/types/api'
import type { VerifyEmailCodePayload } from '@/types/auth'
import type {
  CreateMemberBookmarkPayload,
  MemberBookmarkResponse,
  MemberBookmarksResponse,
} from '@/types/bookmark'

/* ------------------------------------------------------------------------- *
 * 회원 북마크 `bookmarkId` 정밀도 방어 (한시적 우회)
 *
 * auth-service 는 `bookmarkId` 를 Snowflake(18~19자리)로 만들면서 JSON 에 **숫자**로
 * 내려준다. `Number.MAX_SAFE_INTEGER` 는 16자리(9007199254740991)뿐이라
 * `JSON.parse('{"bookmarkId":350900094712676352}')` 는 그 시점에 이미
 * `350900094712676400` 으로 값을 망친다. 망친 값으로 DELETE 를 쏘면 없는 행이나
 * **다른 사람의 행**을 가리키므로, 파싱 전에 원문 텍스트에서 아이디를 문자열로
 * 감싸 정밀도를 지킨다. 이후 FE 전체가 `bookmarkId` 를 문자열로만 다룬다
 * (분석 보관함 `/analysis-bookmarks` 와 동일한 규약).
 *
 * ⚠️ 전역 `apiClient` 에 걸지 않는다 — 아래 북마크 요청에만 요청 단위로 붙인다.
 *
 * 걷어내는 조건: auth-service 가 `MemberBookmarkItem.bookmarkId` 를 **문자열**로
 * 내려주면 이 블록(`memberBookmarkRequestConfig` 까지)만 삭제하면 된다. 타입·검증·
 * 호출부는 이미 문자열 기준이라 손댈 곳이 없다. 이미 문자열인 응답도 이 변환을
 * 그대로 통과하므로 백엔드 배포와 FE 배포 순서를 맞출 필요도 없다.
 * ------------------------------------------------------------------------- */

/**
 * JSON 원문을 왼쪽부터 스캔한다. 분기 1은 "문자열 리터럴 + `:` + 숫자 토큰",
 * 분기 2는 "그 밖의 모든 문자열 리터럴"이다.
 *
 * 분기 2가 문자열 리터럴을 통째로(이스케이프 포함) 소비하기 때문에, 문자열 **값**
 * 안에 들어 있는 `"bookmarkId": 1` 같은 텍스트는 절대 다시 검사되지 않는다.
 * 키 이름은 리터럴 전체가 정확히 `bookmarkId` 인지 따로 비교하므로
 * `lastBookmarkId`·`existingBookmarkId` 처럼 접미사만 같은 키도 걸리지 않는다.
 */
const JSON_STRING_OR_NUMBER_FIELD =
  /"(?:[^"\\]|\\[\s\S])*"(\s*:\s*)(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|"(?:[^"\\]|\\[\s\S])*"/g

const BOOKMARK_ID_KEY = '"bookmarkId"'

/** `"bookmarkId": 350900094712676352` → `"bookmarkId": "350900094712676352"` */
export const quoteBookmarkIdsInRawJson = (raw: string): string =>
  raw.replace(JSON_STRING_OR_NUMBER_FIELD, (match, separator, numberToken) => {
    // 분기 2(값 문자열·비대상 키)로 매칭됐으면 원문 그대로 흘린다.
    if (separator === undefined) return match
    if (!match.startsWith(BOOKMARK_ID_KEY)) return match
    // 정수만 감싼다. 소수·지수 표기는 애초에 아이디가 아니므로 숫자로 남겨
    // 기존 검증에서 걸러지게 둔다(감싸면 JSON 만 망가진다).
    if (!/^\d+$/.test(numberToken)) return match

    return `${BOOKMARK_ID_KEY}${separator}"${numberToken}"`
  })

/**
 * axios 기본 `transformResponse` 를 대체한다 — 기본값과 같은 관용도를 유지해야 하므로
 * 파싱 실패 시 던지지 않고 원문을 그대로 넘긴다(HTML 게이트웨이 응답 등은
 * 기존 검증·`normalizeApiError` 경로에서 걸러진다). 빈 본문(204)도 그대로 통과한다.
 */
export const parseMemberBookmarkResponse = (data: unknown): unknown => {
  if (typeof data !== 'string' || data.trim() === '') return data

  try {
    return JSON.parse(quoteBookmarkIdsInRawJson(data))
  } catch {
    return data
  }
}

/** 요청 단위 옵션. 전역 `apiClient` 는 건드리지 않는다. */
const memberBookmarkRequestConfig: {
  transformResponse: AxiosResponseTransformer[]
} = {
  transformResponse: [parseMemberBookmarkResponse],
}

export const sendEmailVerificationCode = async (memberEmail: string) => {
  const response = await apiClient.post<ApiResponse<null>>(
    `/email/send/${memberEmail}`,
  )

  return response.data
}

export const verifyEmailVerificationCode = async (
  payload: VerifyEmailCodePayload,
) => {
  const response = await apiClient.post<ApiResponse<null>>(
    `/email/verify/${payload.memberEmail}/${payload.emailCode}`,
  )

  return response.data
}

export const logoutUser = async () => {
  const response = await apiClient.post<ApiResponse<null>>('/member/logout')

  return response.data
}

/** `lastBookmarkId` 는 커서로 쓰이는 `bookmarkId` 다 — 문자열 그대로 실어 보낸다. */
export const fetchMemberBookmarks = async (
  lastBookmarkId?: string,
  size = 50,
  signal?: AbortSignal,
) => {
  const searchParams = new URLSearchParams({ size: String(size) })
  if (lastBookmarkId !== undefined) {
    searchParams.set('lastBookmarkId', lastBookmarkId)
  }

  const url = `/members/me/bookmarks?${searchParams.toString()}`
  const response = signal
    ? await apiClient.get<MemberBookmarksResponse>(url, {
        ...memberBookmarkRequestConfig,
        signal,
      })
    : await apiClient.get<MemberBookmarksResponse>(
        url,
        memberBookmarkRequestConfig,
      )

  return response.data
}

export const addMemberBookmark = async (
  payload: CreateMemberBookmarkPayload,
) => {
  const response = await apiClient.post<MemberBookmarkResponse>(
    '/members/me/bookmarks',
    payload,
    memberBookmarkRequestConfig,
  )

  return response.data
}

export const removeMemberBookmark = async (bookmarkId: string) => {
  const response = await apiClient.delete<ApiResponse<null>>(
    `/members/me/bookmarks/${encodeURIComponent(bookmarkId)}`,
    memberBookmarkRequestConfig,
  )

  return response.data
}
