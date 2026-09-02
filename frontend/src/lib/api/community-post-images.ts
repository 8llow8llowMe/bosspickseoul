import { getApiMessage, isApiSuccess } from '@/lib/api/response'
import type { ApiResponse } from '@/types/api'
import type { CommunityPostImageUpload } from '@/types/community'

/**
 * 게시글 이미지 업로드 (`POST /community/posts/images`, multipart `imageFiles`).
 *
 * **2단계다.** 여기서는 게시글에 연결하지 않고 **키만 발급**받는다. 그 키를 게시글
 * 작성/수정 요청의 `imageKeys` 에 담아야 연결된다 — 그래서 글을 쓰기 전에 먼저 올려
 * 미리보기를 보여 줄 수 있고, 서버는 연결 시점에 소유권을 검증한다.
 *
 * ⚠️ **연결되지 않은 키는 고아 파일로 남는다.** 백엔드에 회수 배치가 아직 없다
 * (`file-upload-guide.md` "알려진 한계"). 화면이 할 수 있는 일은 **올리기 전에 거를 수
 * 있는 것을 거르는 것**뿐이라 장수·크기·형식을 미리 본다.
 *
 * A3(프로필 이미지)와 같은 이유로 BFF 를 그대로 쓰고 `apiClient`(axios)는 피한다 —
 * 그 인스턴스는 `Content-Type: application/json` 을 전역으로 박아 두는데, multipart 는
 * boundary 가 포함된 헤더를 브라우저가 직접 만들어야 한다.
 */

export class CommunityPostImageError extends Error {
  readonly code: string | null

  constructor(message: string, code: string | null) {
    super(message)
    this.name = 'CommunityPostImageError'
    this.code = code
  }
}

const ENDPOINT = '/api/bff/community/posts/images'

export const uploadCommunityPostImages = async (
  files: File[],
): Promise<CommunityPostImageUpload[]> => {
  if (files.length === 0) return []

  const formData = new FormData()
  // 같은 이름으로 반복해 담는 것이 배열 파트다(`imageFiles`). 인덱스를 붙이면 안 된다.
  files.forEach(file => formData.append('imageFiles', file))

  const response = await fetch(ENDPOINT, { method: 'POST', body: formData })

  const data = (await response.json().catch(() => null)) as ApiResponse<
    CommunityPostImageUpload[] | null
  > | null

  // 상태코드와 본문을 둘 다 본다 — 이 백엔드는 200 에 success:false 를 싣기도 한다.
  if (!response.ok || !isApiSuccess(data ?? undefined)) {
    throw new CommunityPostImageError(
      getApiMessage(
        data ?? undefined,
        '이미지를 올리지 못했어요. 잠시 후 다시 시도해 주세요.',
      ),
      data?.dataHeader.resultCode ?? null,
    )
  }

  return data?.dataBody ?? []
}
