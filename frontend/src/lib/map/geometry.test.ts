import { describe, expect, it } from 'vitest'

import {
  createBounds,
  createCenterFallbackBounds,
  normalizeBoundary,
  normalizeViewportBounds,
} from '@/lib/map/geometry'

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
