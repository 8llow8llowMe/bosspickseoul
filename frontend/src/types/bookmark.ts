import type { ApiResponse } from '@/types/api'
import type {
  SharePayload,
  ShareType,
  ShareTypeMetadata,
} from '@/lib/share/payload'

/**
 * 자치구/행정동/상권 **엔티티** 즐겨찾기(auth-service `/members/me/bookmarks`).
 * 아래 `AnalysisBookmark*`(분석 화면 보관함)와는 역할이 다르다 — 이쪽은 "지역 자체"를,
 * 저쪽은 "업종·기간까지 포함한 화면 상태"를 저장한다.
 */
export type BookmarkTargetType = 'COMMERCIAL' | 'ADMINISTRATION' | 'DISTRICT'

export type MemberBookmark = {
  /**
   * ⚠️ **문자열이다.** Snowflake 값이 `Number.MAX_SAFE_INTEGER` 를 넘으므로
   * 숫자로 파싱하면 값이 손상된다. 백엔드가 아직 JSON 숫자로 내려주기 때문에
   * `@/lib/api/user` 의 `parseMemberBookmarkResponse` 가 파싱 전에 문자열로 감싼다.
   * FE 어디에서도 `Number(...)` 로 바꾸지 않고, 받은 문자열 그대로 DELETE 경로와
   * `lastBookmarkId` 커서에 넣는다.
   */
  bookmarkId: string
  targetType: BookmarkTargetType
  targetCode: string
  targetName: string
  createdAt: string
}

export type BookmarkSlice = {
  contents: MemberBookmark[]
  hasNext: boolean
}

export type MemberBookmarksResponse = ApiResponse<{
  bookmarks: BookmarkSlice
}>

export type MemberBookmarkResponse = ApiResponse<MemberBookmark>

export type CreateMemberBookmarkPayload = Pick<
  MemberBookmark,
  'targetType' | 'targetCode' | 'targetName'
>

/* ------------------------------------------------------------------------- *
 * 분석 화면 보관함 (commercial-service `/api/v1/analysis-bookmarks`)
 * 공유 링크와 shareType·payload 계약이 완전히 동일하다.
 * ------------------------------------------------------------------------- */

export type AnalysisBookmark = {
  /**
   * ⚠️ **문자열이다.** Snowflake 값이 `Number.MAX_SAFE_INTEGER` 를 넘으므로
   * 숫자로 파싱하면 값이 손상된다. 받은 문자열 그대로 PATCH/DELETE 경로에 넣는다.
   */
  bookmarkId: string
  shareType: ShareTypeMetadata
  /** 화면 진입 상태. 해석 API 없이 이 값으로 곧장 `ROUTE_BUILDERS` 를 태운다. */
  payload: SharePayload
  /** 미지정이면 null. 50자 이하. */
  bookmarkName: string | null
  createdAt: string
}

export type AnalysisBookmarkListBody = {
  bookmarks: AnalysisBookmark[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export type AnalysisBookmarksResponse = ApiResponse<AnalysisBookmarkListBody>

export type AnalysisBookmarkCreateResponse = ApiResponse<{
  bookmark: AnalysisBookmark
}>

/** 409 `ANALYSIS_BOOKMARK_002` 응답 본문. `existingBookmarkId` 는 드물게 null 이다. */
export type AnalysisBookmarkConflictBody = {
  existingBookmarkId: string | null
}

export type CreateAnalysisBookmarkPayload = {
  shareType: ShareType
  payload: SharePayload
  /** 선택. 50자 이하. */
  bookmarkName?: string
}
