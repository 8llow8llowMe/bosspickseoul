import { apiClient } from '@/lib/api/client'
import type { SharePayload, ShareType } from '@/lib/share/payload'
import type {
  ShareLinkCreateResponse,
  ShareLinkResolveResponse,
} from '@/types/share'
import type {
  SharedSimulationPayloadResponse,
  SimulationShareRequest,
  SimulationShareResponse,
} from '@/types/simulation'

/**
 * V2 공유 링크 생성. 로그인 없이도 호출된다(BFF 가 세션이 있으면 Bearer 를 얹어
 * 최초 공유자를 기록한다). 공유 버튼에 로그인 게이트를 두지 않는다.
 *
 * 같은 화면 상태를 다시 공유하면 새 코드가 아니라 기존 코드가 재사용되고 만료만 연장된다.
 * key 순서가 달라도 백엔드가 정규화해 같은 상태로 인식하므로 버튼 연타에 안전하다.
 */
export const createShareLink = async (request: {
  shareType: ShareType
  payload: SharePayload
}) => {
  const response = await apiClient.post<ShareLinkCreateResponse>(
    '/share-links',
    request,
  )
  return response.data
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

/**
 * 레거시 V1 시뮬레이션 공유(`/share`, `/share/{token}`).
 *
 * 백엔드 `ShareTargetType` 에 시뮬레이션이 없어 V2 로 옮길 수 없다. 아직
 * `src/components/simulation/**`(시뮬레이션 리포트 공유/수신 화면)이 쓰고 있으므로 남겨 둔다.
 * 시뮬레이션 공유가 V2 계약을 얻거나 화면에서 제거되면 이 두 함수도 함께 지운다.
 */
export const createSimulationShareLink = async (
  payload: SimulationShareRequest,
) => {
  const response = await apiClient.post<SimulationShareResponse>(
    '/share',
    payload,
  )

  return response.data
}

export const fetchSharedSimulationPayload = async (token: string) => {
  const response = await apiClient.get<SharedSimulationPayloadResponse>(
    `/share/${token}`,
  )

  return response.data
}
