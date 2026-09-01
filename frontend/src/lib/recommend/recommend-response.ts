import type { ApiResponse } from '@/types/api'
import type { CommercialArea } from '@/types/recommend'

/**
 * 추천 API 응답을 **읽는** 규칙. 타입 선언은 런타임 보장이 아니라서
 * 화면에 올리기 전에 여기서 한 번 거른다.
 *
 * 이 모듈이 따로 있는 이유는 `/recommend` 와 `/recommend/compare` 가 **같은
 * 목록**을 봐야 하기 때문이다. 두 화면이 각자 응답을 읽으면 한쪽이 거르는 행을
 * 다른 쪽은 통과시키고, 그러면 추천 요청에 들어가는 상권 코드 집합과
 * `commercialCodesKey` 가 갈라진다 — 캐시가 갈라지고 점수까지 달라진다
 * (명세 §4). 읽는 규칙은 한 곳에만 둔다.
 */

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object'

export const isValidCoordinate = (lng: unknown, lat: unknown): boolean =>
  typeof lng === 'number' &&
  typeof lat === 'number' &&
  Number.isFinite(lng) &&
  Number.isFinite(lat) &&
  lng >= -180 &&
  lng <= 180 &&
  lat >= -90 &&
  lat <= 90

export const isSuccessfulApiResponse = <T>(
  response: ApiResponse<T> | null | undefined,
): response is ApiResponse<T> =>
  response?.dataHeader?.success === true && response.dataBody !== undefined

export const readCommercials = (
  response: ApiResponse<CommercialArea[]> | null | undefined,
): CommercialArea[] => {
  if (!isSuccessfulApiResponse(response) || !Array.isArray(response.dataBody)) {
    return []
  }

  return (response.dataBody as unknown[]).flatMap(commercial => {
    if (
      !isRecord(commercial) ||
      typeof commercial.commercialCode !== 'string' ||
      typeof commercial.commercialName !== 'string' ||
      typeof commercial.commercialClassificationCode !== 'string' ||
      typeof commercial.commercialClassificationName !== 'string' ||
      !isValidCoordinate(commercial.centerLng, commercial.centerLat)
    ) {
      return []
    }

    return [
      {
        commercialCode: commercial.commercialCode,
        commercialName: commercial.commercialName,
        commercialClassificationCode: commercial.commercialClassificationCode,
        commercialClassificationName: commercial.commercialClassificationName,
        centerLng: commercial.centerLng as number,
        centerLat: commercial.centerLat as number,
      },
    ]
  })
}
