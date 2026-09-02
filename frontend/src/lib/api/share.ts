import { apiClient } from '@/lib/api/client'
import { normalizeApiError } from '@/lib/api/api-error'
import type { SharePayload, ShareType } from '@/lib/share/payload'
import type {
  ShareLinkCreateResponse,
  ShareLinkResolveResponse,
} from '@/types/share'

/**
 * 같은 payload 를 동시에 공유했을 때 진 쪽이 받는 상태.
 *
 * 백엔드는 payload 해시가 같으면 기존 링크를 돌려주는 멱등 동작인데, 동시 요청은
 * `findByPayloadHash` 를 둘 다 통과해 insert 가 겹친다. 진 쪽의 트랜잭션은 이미
 * 롤백 대상이라 같은 트랜잭션에서 기존 행을 다시 읽어 줄 수 없어서, 백엔드가
 * 조용히 기존 링크를 주는 대신 409 로 재시도를 안내한다.
 *
 * **`POST /share-links` 의 유일한 409 다**(`SHARE_LINK_007`). 그래서 코드가 아니라
 * 상태로 가른다 — 이 저장소의 규약이고, 백엔드가 코드를 재편해도 안 깨진다.
 */
const CONFLICT_STATUS = 409

/**
 * V2 공유 링크 생성. 로그인 없이도 호출된다(BFF 가 세션이 있으면 Bearer 를 얹어
 * 최초 공유자를 기록한다). 공유 버튼에 로그인 게이트를 두지 않는다.
 *
 * 같은 화면 상태를 다시 공유하면 새 코드가 아니라 기존 코드가 재사용되고 만료만 연장된다.
 * key 순서가 달라도 백엔드가 정규화해 같은 상태로 인식한다.
 *
 * **연타 안전은 여기서 만든다.** 동시 생성이 겹치면 409 가 오는데(위 주석), 이긴 쪽은
 * 이미 커밋을 끝냈으므로 곧바로 한 번 더 부르면 그 행을 찾아 기존 링크가 돌아온다.
 * 지연은 두지 않는다 — 기다릴 대상이 이미 없다. 재시도는 **한 번이면 충분하다**:
 * 몇 개가 겹치든 이긴 하나를 뺀 나머지는 재시도에서 모두 같은 행을 읽는다.
 */
export const createShareLink = async (request: {
  shareType: ShareType
  payload: SharePayload
}) => {
  try {
    const response = await apiClient.post<ShareLinkCreateResponse>(
      '/share-links',
      request,
    )
    return response.data
  } catch (error) {
    if (normalizeApiError(error).status !== CONFLICT_STATUS) throw error
    const retried = await apiClient.post<ShareLinkCreateResponse>(
      '/share-links',
      request,
    )
    return retried.data
  }
}

/** V2 공유 링크 해석. 인증 불필요 — 링크 수신자는 비로그인 상태다. */
export const resolveShareLink = async (shareCode: string) => {
  const response = await apiClient.get<ShareLinkResolveResponse>(
    `/share-links/${encodeURIComponent(shareCode)}`,
  )
  return response.data
}

/** 공유용 절대 URL. `origin` 이 없으면(SSR) 상대 경로를 돌려준다. */
export const createShareUrl = (shareCode: string, origin?: string | null) =>
  origin ? `${origin}/s/${shareCode}` : `/s/${shareCode}`
