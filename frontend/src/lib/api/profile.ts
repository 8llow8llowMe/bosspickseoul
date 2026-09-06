import { apiClient } from '@/lib/api/client'
import type { ApiResponse } from '@/types/api'
import type { MemberInfo } from '@/types/auth'

export const getMemberInfoData = async (signal?: AbortSignal) => {
  const response = signal
    ? await apiClient.get<ApiResponse<MemberInfo>>('/members/me', { signal })
    : await apiClient.get<ApiResponse<MemberInfo>>('/members/me')

  return response.data
}

/**
 * 닉네임 수정 (`PATCH /members/me`).
 *
 * **BFF 범용 프록시를 그대로 쓴다.** A1(탈퇴)·A2(비밀번호)가 전용 라우트였던 이유는
 * 그 동작들이 서버 세션을 파괴해야 했기 때문이다. 닉네임은 토큰을 건드리지 않으므로
 * A3(프로필 이미지)와 같은 판단으로 `apiClient` 를 쓴다.
 *
 * 프로필 이미지는 이 API 로 다루지 않는다 — 전용 업로드/삭제 API 가 따로 있다
 * (`member-profile-image.ts`). 임의 URL 을 회원 정보에 넣지 못하게 막아 둔 설계다.
 *
 * 응답은 `GET /members/me` 와 **같은 회원 정보 전체**라, 호출부가 그 값으로 스토어를
 * 바로 갱신할 수 있다(다시 조회하지 않아도 된다). 검증 실패는 `MEMBER_108`(필수)·
 * `MEMBER_109`(10자)로 오고, 문구는 `normalizeApiError` 가 서버 것을 그대로 꺼낸다.
 */
export const updateMyInfo = async (nickname: string) => {
  const response = await apiClient.patch<ApiResponse<MemberInfo>>(
    '/members/me',
    { nickname },
  )

  return response.data
}
