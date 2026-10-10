import { env } from '@/lib/env'
import { loadKakaoMapSdk } from '@/lib/kakao-map'
import {
  SEOUL_SEARCH_BOUNDS,
  toKakaoRect,
  toNameSearchPlaces,
  type NameSearchPlace,
} from '@/lib/analysis/name-search'

/** 카카오가 한 번에 주는 최대 건수. 서울 밖 장소를 걸러 내고 남은 것에서 앞 몇 건만 쓴다. */
const KAKAO_PAGE_SIZE = 15

/**
 * 카카오 장소 검색으로 서울 안의 지하철역·장소를 찾는다(#596 임시안).
 *
 * TODO(BE #592): 이름 검색 API 가 지하철역까지 주면 이 함수와 `libraries=services` 로드를 걷어 낸다.
 *
 * 지도 SDK 와 같은 스크립트를 쓴다(`loadKakaoMapSdk` 가 `libraries=services` 를 싣는다). SDK 를 못
 * 불러오거나 `services` 가 없으면 reject 한다 — 호출부는 이미 받아 둔 지역 이름 결과만 보여 준다.
 */
export const searchSeoulPlaces = async (
  keyword: string,
  limit = 5,
): Promise<NameSearchPlace[]> => {
  const maps = await loadKakaoMapSdk(env.kakaoJavascriptKey)
  const services = maps.services
  if (!services) throw new Error('Kakao 장소 검색을 불러오지 못했습니다.')

  return new Promise((resolve, reject) => {
    new services.Places().keywordSearch(
      keyword,
      (documents, status) => {
        if (status === services.Status.OK) {
          resolve(toNameSearchPlaces(documents, limit))
          return
        }
        if (status === services.Status.ZERO_RESULT) {
          resolve([])
          return
        }
        reject(new Error('Kakao 장소 검색에 실패했습니다.'))
      },
      { rect: toKakaoRect(SEOUL_SEARCH_BOUNDS), size: KAKAO_PAGE_SIZE },
    )
  })
}
