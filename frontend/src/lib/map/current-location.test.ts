import { describe, expect, it } from 'vitest'

import { SEOUL_MAP_BOUNDS } from '@/lib/api/recommend'

import {
  describeGeolocationError,
  resolveCurrentLocation,
} from './current-location'
import { isInSeoul } from './seoul-boundary'

const insideSquare = (point: { lat: number; lng: number }) =>
  point.lat >= SEOUL_MAP_BOUNDS.latSW &&
  point.lat <= SEOUL_MAP_BOUNDS.latNE &&
  point.lng >= SEOUL_MAP_BOUNDS.lngSW &&
  point.lng <= SEOUL_MAP_BOUNDS.lngNE

describe('isInSeoul', () => {
  it.each([
    ['서울시청', 37.5665, 126.978],
    ['강남역', 37.4979, 127.0276],
    ['김포공항(강서구)', 37.5586, 126.7945],
    ['천호역(강동구)', 37.5386, 127.1236],
    ['노원역', 37.6551, 127.0613],
  ])('%s 는 서울이다', (_name, lat, lng) => {
    expect(isInSeoul({ lat, lng })).toBe(true)
  })

  /*
   * 뷰포트 조회용 사각형(SEOUL_MAP_BOUNDS)은 이 도시들을 전부 「서울」로 잡는다.
   * 사각형으로 판정하던 첫 구현에서 경기·인천 사용자가 빈 지도로 옮겨 가던 경우다.
   */
  it.each([
    ['부천시청', 37.5035, 126.766],
    ['과천시청', 37.4292, 126.9876],
    ['성남 수정구청', 37.4504, 127.1456],
    ['구리시청', 37.5943, 127.1296],
    ['인천 부평역', 37.4895, 126.7245],
    ['고양 일산', 37.6584, 126.7697],
  ])('%s 는 서울이 아니다(사각형은 통과시키는 곳)', (_name, lat, lng) => {
    expect(insideSquare({ lat, lng })).toBe(true)
    expect(isInSeoul({ lat, lng })).toBe(false)
  })

  it('부산·좌표 이상값은 서울이 아니다', () => {
    expect(isInSeoul({ lat: 35.1796, lng: 129.0756 })).toBe(false)
    expect(isInSeoul({ lat: Number.NaN, lng: 126.978 })).toBe(false)
  })
})

describe('resolveCurrentLocation', () => {
  it('판정이 참이면 이동한다', () => {
    expect(
      resolveCurrentLocation({ lat: 37.4979, lng: 127.0276 }, isInSeoul),
    ).toEqual({ kind: 'moved', point: { lat: 37.4979, lng: 127.0276 } })
  })

  it('판정이 거짓이면 옮기지 않는다', () => {
    expect(
      resolveCurrentLocation({ lat: 37.5035, lng: 126.766 }, isInSeoul).kind,
    ).toBe('outside')
  })
})

describe('describeGeolocationError', () => {
  it.each([
    [1, '위치 권한이 꺼져 있어요'],
    [2, '현재 위치를 확인하지 못했어요'],
    [3, '시간이 너무 걸려요'],
    [null, '사용할 수 없어요'],
  ])('코드 %s 는 원인에 맞는 안내를 준다', (code, expected) => {
    expect(describeGeolocationError(code)).toContain(expected)
  })
})
