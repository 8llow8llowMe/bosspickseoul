/**
 * 로그인 기기 세션 (`auth-service` `/api/v1/auth/sessions`). 전부 로그인 필수.
 *
 * 이 두 호출은 BFF 프록시를 거쳐야 한다. 특히 목록은 백엔드가 **요청 쿠키의 refresh
 * 토큰**으로 「현재 기기」를 가리므로, BFF 가 그 쿠키를 실어 보내는 경로에 등록돼 있어야
 * `current` 가 참이 될 수 있다 (`app/api/bff/[...path]/route.ts` 의 `REFRESH_COOKIE_GETS`).
 */

import { apiClient } from '@/lib/api/client'
import type { ApiResponse } from '@/types/api'
import type { AuthSessionsBody } from '@/types/auth'

const BASE_PATH = '/auth/sessions'

/** 기기 세션 목록. 백엔드가 마지막 사용 시각 내림차순으로 정렬해 준다. */
export const fetchAuthSessions = async (signal?: AbortSignal) => {
  const response = await apiClient.get<ApiResponse<AuthSessionsBody>>(
    BASE_PATH,
    { signal },
  )
  return response.data
}

/**
 * 특정 기기 세션 해제. **멱등이다** — 이미 없는 세션이어도 성공으로 답한다.
 *
 * 해제해도 그 기기의 access 토큰은 만료까지 유효하다. 즉시 로그아웃이 아니라
 * "다음 갱신 때 끊긴다" 이므로, 화면 문구가 즉시성을 약속하지 않게 한다.
 */
export const revokeAuthSession = async (sessionId: string) => {
  const response = await apiClient.delete<ApiResponse<null>>(
    `${BASE_PATH}/${encodeURIComponent(sessionId)}`,
  )
  return response.data
}
