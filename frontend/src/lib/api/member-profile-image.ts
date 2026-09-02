import { getApiMessage, isApiSuccess } from '@/lib/api/response'
import type { ApiResponse } from '@/types/api'

/**
 * 프로필 이미지 업로드·삭제 (`POST`/`DELETE /members/me/profile-image`).
 *
 * **BFF 범용 프록시를 그대로 쓴다.** A1(탈퇴)·A2(비밀번호)가 전용 라우트였던 이유는
 * 그 동작들이 **서버 세션을 파괴해야** 했기 때문이다. 이미지 변경은 토큰을 건드리지
 * 않으므로 전용 라우트를 만들 이유가 없다 — 오히려 BFF 를 거치면 accessToken 선재발급과
 * 401 재시도를 공짜로 얻는다(`app/api/bff/[...path]/route.ts`).
 *
 * `apiClient`(axios)를 쓰지 않는 이유: 그 인스턴스는 `Content-Type: application/json` 을
 * 전역으로 박아 둔다. multipart 는 **boundary 가 포함된 헤더**를 브라우저가 직접 만들어야
 * 하므로, `FormData` 를 그대로 넘기는 `fetch` 가 맞다.
 */

export class ProfileImageError extends Error {
  readonly code: string | null

  constructor(message: string, code: string | null) {
    super(message)
    this.name = 'ProfileImageError'
    this.code = code
  }
}

const ENDPOINT = '/api/bff/members/me/profile-image'

/**
 * 응답을 성공/실패로 가른다. **상태코드와 본문을 둘 다 본다** — 이 백엔드는 200 에
 * `success: false` 를 싣는 경우가 있어 상태코드만 믿으면 실패를 성공으로 읽는다.
 */
const readOutcome = async (response: Response, fallback: string) => {
  const data = (await response
    .json()
    .catch(() => null)) as ApiResponse<unknown> | null

  if (!response.ok || !isApiSuccess(data ?? undefined)) {
    throw new ProfileImageError(
      getApiMessage(data ?? undefined, fallback),
      /*
       * `resultCode` 를 살려 나른다. `STORAGE_001~003` 은 사용자가 다음에 무엇을 해야
       * 하는지가 코드마다 다르고, 평범한 `Error` 로 바꾸면 그 구분이 사라진다.
       */
      data?.dataHeader.resultCode ?? null,
    )
  }

  return data
}

export type ProfileImageUploadResult = {
  profileImageKey: string
  profileImageUrl: string
}

/**
 * 업로드하면 **즉시 회원 정보에 반영된다**(임시 저장 단계가 없다). 기존 이미지가
 * 있으면 교체하고 이전 객체는 서버가 지운다 — 화면이 따로 정리할 것이 없다.
 */
export const uploadProfileImage = async (
  file: File,
): Promise<ProfileImageUploadResult | null> => {
  const formData = new FormData()
  formData.append('imageFile', file)

  const response = await fetch(ENDPOINT, { method: 'POST', body: formData })
  const data = await readOutcome(
    response,
    '프로필 사진을 올리지 못했어요. 잠시 후 다시 시도해 주세요.',
  )

  return (data?.dataBody as ProfileImageUploadResult | null) ?? null
}

/** 이미지 제거 + 저장된 객체 삭제. 소셜 제공자 이미지가 있으면 그쪽으로 되돌아간다. */
export const removeProfileImage = async (): Promise<void> => {
  const response = await fetch(ENDPOINT, { method: 'DELETE' })

  await readOutcome(
    response,
    '프로필 사진을 지우지 못했어요. 잠시 후 다시 시도해 주세요.',
  )
}
