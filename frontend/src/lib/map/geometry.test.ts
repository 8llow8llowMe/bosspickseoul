import { describe, expect, it } from 'vitest'

import {
  createBounds,
  createCenterFallbackBounds,
  normalizeBoundary,
  normalizeViewportBounds,
  isPointInPolygon,
  computeRingArea,
  findAreaContainingPoint,
  findAreasContainingPoint,
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

describe('findAreaContainingPoint', () => {
  const areas: AreaBoundaryItem[] = [
    {
      areaCode: 'a',
      areaName: '안쪽',
      centerLng: 5,
      centerLat: 5,
      boundaryCoords: [
        [0, 0],
        [0, 10],
        [10, 10],
        [10, 0],
      ],
    },
    {
      areaCode: 'broken',
      areaName: '경계 없음',
      centerLng: 100,
      centerLat: 50,
      boundaryCoords: [],
    },
  ]
  it('점을 품은 area 를 반환한다', () => {
    expect(findAreaContainingPoint({ lng: 5, lat: 5 }, areas)?.areaCode).toBe(
      'a',
    )
  })
  it('어디에도 없으면 최근접으로 물러나지 않고 null 이다(#596)', () => {
    expect(findAreaContainingPoint({ lng: 100, lat: 50 }, areas)).toBeNull()
  })
})

describe('findAreasContainingPoint · computeRingArea', () => {
  const box = (areaCode: string, size: number): AreaBoundaryItem => ({
    areaCode,
    areaName: areaCode,
    centerLng: size / 2,
    centerLat: size / 2,
    boundaryCoords: [
      [0, 0],
      [size, 0],
      [size, size],
      [0, size],
    ],
  })

  it('점을 품은 영역을 모두 돌려준다', () => {
    expect(
      findAreasContainingPoint({ lng: 1, lat: 1 }, [
        box('big', 10),
        box('small', 2),
        box('tiny', 0.5),
      ]).map(area => area.areaCode),
    ).toEqual(['big', 'small'])
  })

  it('다각형 면적을 감는 방향과 상관없이 양수로 낸다', () => {
    const square = [
      { lng: 0, lat: 0 },
      { lng: 2, lat: 0 },
      { lng: 2, lat: 2 },
      { lng: 0, lat: 2 },
    ]
    expect(computeRingArea(square)).toBe(4)
    expect(computeRingArea([...square].reverse())).toBe(4)
  })
})

describe('resolveDistrictCodeFromAdministration', () => {
  it('앞 5자리를 반환', () => {
    expect(resolveDistrictCodeFromAdministration('11215530')).toBe('11215')
  })
})
