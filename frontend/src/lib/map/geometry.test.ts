import { describe, expect, it } from 'vitest'

import {
  createBounds,
  createCenterFallbackBounds,
  normalizeBoundary,
  normalizeViewportBounds,
  isPointInPolygon,
  findContainingArea,
  resolveDistrictCodeFromAdministration,
} from '@/lib/map/geometry'
import type { AreaBoundaryItem } from '@/types/recommend'

describe('map geometry', () => {
  it('유효하지 않은 좌표를 경계에서 제거한다', () => {
    expect(
      normalizeBoundary([
        [127.01, 37.51],
        [Number.NaN, 37.5],
        [181, 37.5],
      ]),
    ).toEqual([{ lng: 127.01, lat: 37.51 }])
  })

  it('좌표들의 최소·최대 범위를 계산한다', () => {
    expect(
      createBounds([
        { lng: 127.1, lat: 37.6 },
        { lng: 126.9, lat: 37.4 },
      ]),
    ).toEqual({
      lngSW: 126.9,
      latSW: 37.4,
      lngNE: 127.1,
      latNE: 37.6,
    })
    expect(createBounds([])).toBeNull()
  })

  it('역전되거나 범위를 벗어난 viewport를 거부한다', () => {
    expect(
      normalizeViewportBounds({
        lngSW: 127,
        latSW: 38,
        lngNE: 126,
        latNE: 37,
      }),
    ).toBeNull()
    expect(
      normalizeViewportBounds({
        lngSW: -181,
        latSW: 37,
        lngNE: 127,
        latNE: 38,
      }),
    ).toBeNull()
  })

  it('중심점 주변 fallback 범위를 만든다', () => {
    expect(createCenterFallbackBounds(127, 37.5)).toEqual({
      lngSW: 126.92,
      latSW: 37.44,
      lngNE: 127.08,
      latNE: 37.56,
    })
  })
})

describe('isPointInPolygon', () => {
  const square = [
    { lng: 0, lat: 0 },
    { lng: 0, lat: 10 },
    { lng: 10, lat: 10 },
    { lng: 10, lat: 0 },
  ]
  it('내부 점은 true', () => {
    expect(isPointInPolygon({ lng: 5, lat: 5 }, square)).toBe(true)
  })
  it('외부 점은 false', () => {
    expect(isPointInPolygon({ lng: 15, lat: 5 }, square)).toBe(false)
  })
})

describe('findContainingArea', () => {
  const areas: AreaBoundaryItem[] = [
    {
      areaCode: '11215530',
      areaName: '자양동',
      centerLng: 5,
      centerLat: 5,
      boundaryCoords: [
        [0, 0],
        [0, 10],
        [10, 10],
        [10, 0],
      ],
    },
  ]
  it('포함하는 area를 반환', () => {
    expect(findContainingArea({ lng: 5, lat: 5 }, areas)?.areaCode).toBe(
      '11215530',
    )
  })
  it('어디에도 없으면 최근접 중심점 area로 fallback', () => {
    expect(findContainingArea({ lng: 100, lat: 100 }, areas)?.areaCode).toBe(
      '11215530',
    )
  })
  it('빈 배열이면 null', () => {
    expect(findContainingArea({ lng: 5, lat: 5 }, [])).toBeNull()
  })
})

describe('resolveDistrictCodeFromAdministration', () => {
  it('앞 5자리를 반환', () => {
    expect(resolveDistrictCodeFromAdministration('11215530')).toBe('11215')
  })
})
