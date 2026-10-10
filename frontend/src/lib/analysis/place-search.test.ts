// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/*
 * 카카오 장소 검색 래퍼(#596). 실제 SDK 대신 `window.kakao` 를 스텁으로 두고, 로더는 진짜를 쓴다 —
 * 로더가 이미 실린 `window.kakao.maps` 를 그대로 초기화해 돌려주는 경로다. 로더는 모듈 안에 약속을
 * 캐시하므로 테스트마다 모듈을 새로 불러온다.
 */

vi.mock('@/lib/env', () => ({ env: { kakaoJavascriptKey: 'test-key' } }))

type Status = 'OK' | 'ZERO_RESULT' | 'ERROR'

const STATION: KakaoPlaceDocument = {
  id: '21160803',
  place_name: '강남역 2호선',
  category_group_code: 'SW8',
  category_name: '교통,수송 > 지하철,전철 > 수도권2호선',
  address_name: '서울 강남구 역삼동 858',
  road_address_name: '서울 강남구 강남대로 396',
  x: '127.0276',
  y: '37.4979',
}

const keywordSearch = vi.fn()

const stubKakao = (
  respond: { documents: KakaoPlaceDocument[]; status: Status } | null,
) => {
  keywordSearch.mockImplementation(
    (
      _keyword: string,
      callback: (documents: KakaoPlaceDocument[], status: Status) => void,
    ) => {
      if (respond) callback(respond.documents, respond.status)
    },
  )
  const services = respond
    ? {
        Status: { OK: 'OK', ZERO_RESULT: 'ZERO_RESULT', ERROR: 'ERROR' },
        Places: function Places() {
          return { keywordSearch }
        },
      }
    : undefined
  window.kakao = {
    maps: {
      load: (callback: () => void) => callback(),
      services,
    },
  } as unknown as KakaoMapSdk
}

const loadSearch = async () => {
  vi.resetModules()
  return (await import('@/lib/analysis/place-search')).searchSeoulPlaces
}

beforeEach(() => {
  keywordSearch.mockReset()
})

afterEach(() => {
  delete window.kakao
})

describe('searchSeoulPlaces', () => {
  it('OK 면 결과로 바꾸고, 서울 범위 rect 와 한 번에 받을 최대 건수를 넘긴다', async () => {
    stubKakao({ documents: [STATION], status: 'OK' })
    const searchSeoulPlaces = await loadSearch()

    await expect(searchSeoulPlaces('강남역')).resolves.toEqual([
      {
        kind: 'place',
        id: '21160803',
        name: '강남역 2호선',
        category: '지하철역',
        address: '서울 강남구 강남대로 396',
        point: { lng: 127.0276, lat: 37.4979 },
      },
    ])
    expect(keywordSearch).toHaveBeenCalledWith('강남역', expect.any(Function), {
      rect: '126.7,37.4,127.3,37.75',
      size: 15,
    })
  })

  it('ZERO_RESULT 는 빈 목록이다', async () => {
    stubKakao({ documents: [], status: 'ZERO_RESULT' })
    const searchSeoulPlaces = await loadSearch()
    await expect(searchSeoulPlaces('없는곳')).resolves.toEqual([])
  })

  it('ERROR 는 reject 한다', async () => {
    stubKakao({ documents: [], status: 'ERROR' })
    const searchSeoulPlaces = await loadSearch()
    await expect(searchSeoulPlaces('강남역')).rejects.toThrow(
      'Kakao 장소 검색에 실패했습니다.',
    )
  })

  it('services 가 실리지 않았으면 reject 한다', async () => {
    stubKakao(null)
    const searchSeoulPlaces = await loadSearch()
    await expect(searchSeoulPlaces('강남역')).rejects.toThrow(
      'Kakao 장소 검색을 불러오지 못했습니다.',
    )
    expect(keywordSearch).not.toHaveBeenCalled()
  })
})
