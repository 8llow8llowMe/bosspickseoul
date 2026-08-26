import { describe, expect, it } from 'vitest'

import {
  CAMERA_BOUNDS_ANCHOR_LAT_SPAN,
  CAMERA_BOUNDS_ANCHOR_LEVEL,
  CAMERA_BOUNDS_ANCHOR_LNG_SPAN,
  createCameraBounds,
  createMapCamera,
  isSameMapCamera,
  MAP_BOUNDS_QUANTIZE_STEP,
  MAP_CAMERA_LEVEL_MAX,
  MAP_CAMERA_LEVEL_MIN,
  parseMapCamera,
  quantizeBoundsOutward,
  SEOUL_DEFAULT_CAMERA,
  serializeMapCamera,
  shouldApplyUrlCamera,
  type MapCamera,
} from '@/lib/analysis/map-camera'
import { SEOUL_MAP_BOUNDS } from '@/lib/api/recommend'
import type { GeoBounds } from '@/types/recommend'

describe('parseMapCamera / serializeMapCamera', () => {
  // TC-MS-001
  it('직렬화 → 파싱 라운드트립이 같은 카메라를 돌려준다', () => {
    const cameras: MapCamera[] = [
      { lat: 37.5665, lng: 126.978, level: 8 },
      { lat: 37.54893, lng: 127.06612, level: 3 },
      { lat: 35.17954, lng: 129.07564, level: 1 },
      { lat: 33.4996, lng: 126.53119, level: 14 },
    ]

    cameras.forEach(camera => {
      expect(parseMapCamera(serializeMapCamera(camera))).toEqual(camera)
    })
  })

  // TC-MS-002
  it('좌표를 소수 5자리로 양자화한다', () => {
    expect(parseMapCamera('37.5665123,126.9780456,4')).toEqual({
      lat: 37.56651,
      lng: 126.97805,
      level: 4,
    })
  })

  // TC-MS-003
  it('직렬화 문자열에 소수 6자리 이상이 나타나지 않는다', () => {
    const serialized = serializeMapCamera({
      lat: 37.5665123456,
      lng: 126.9780456789,
      level: 4,
    })

    expect(serialized).toBe('37.56651,126.97805,4')
    serialized.split(',').forEach(token => {
      const decimals = token.split('.')[1] ?? ''
      expect(decimals.length).toBeLessThanOrEqual(5)
    })
  })

  // TC-MS-004
  it('숫자가 아닌 토큰은 카메라 전체를 폐기한다', () => {
    expect(parseMapCamera('abc,126.97,4')).toBeNull()
    expect(parseMapCamera('NaN,NaN,NaN')).toBeNull()
    expect(parseMapCamera('37.56,,4')).toBeNull()
    expect(parseMapCamera('Infinity,126.97,4')).toBeNull()
  })

  // TC-MS-005
  it('토큰 수가 3이 아니거나 값이 비면 폐기한다', () => {
    expect(parseMapCamera('37.56,126.97')).toBeNull()
    expect(parseMapCamera('37.56,126.97,4,0')).toBeNull()
    expect(parseMapCamera('')).toBeNull()
    expect(parseMapCamera(null)).toBeNull()
    expect(parseMapCamera(undefined)).toBeNull()
  })

  // TC-MS-006
  it('좌표 범위 밖은 카메라 전체를 폐기한다', () => {
    expect(parseMapCamera('90,126.97,4')).toBeNull()
    expect(parseMapCamera('37.56,10,4')).toBeNull()
    expect(parseMapCamera('-37.56,126.97,4')).toBeNull()
  })

  // TC-MS-007
  it('lat/lng 뒤바뀜을 한국 범위 가드로 걸러낸다', () => {
    expect(parseMapCamera('127.033,37.548,4')).toBeNull()
    expect(parseMapCamera('126.978,37.5665,8')).toBeNull()
  })

  // TC-MS-008
  it('level 은 클램프·라운드하고 중심은 유지한다', () => {
    expect(parseMapCamera('37.56,126.97,0')).toEqual({
      lat: 37.56,
      lng: 126.97,
      level: MAP_CAMERA_LEVEL_MIN,
    })
    expect(parseMapCamera('37.56,126.97,99')).toEqual({
      lat: 37.56,
      lng: 126.97,
      level: MAP_CAMERA_LEVEL_MAX,
    })
    expect(parseMapCamera('37.56,126.97,4.7')?.level).toBe(5)
    expect(parseMapCamera('37.56,126.97,4.2')?.level).toBe(4)
  })
})

describe('isSameMapCamera / shouldApplyUrlCamera', () => {
  // TC-MS-009
  it('양자화 이하 차이는 같은 카메라로 본다', () => {
    const left = createMapCamera(37.5665, 126.978, 8)
    const right = createMapCamera(37.5665004, 126.9780004, 8)

    expect(isSameMapCamera(left, right)).toBe(true)
  })

  it('양자화 위 차이·level 차이는 다른 카메라다', () => {
    const base = createMapCamera(37.5665, 126.978, 8)

    expect(isSameMapCamera(base, createMapCamera(37.5675, 126.978, 8))).toBe(
      false,
    )
    expect(isSameMapCamera(base, createMapCamera(37.5665, 126.978, 7))).toBe(
      false,
    )
    expect(isSameMapCamera(base, null)).toBe(false)
    expect(isSameMapCamera(null, null)).toBe(true)
  })

  // TC-MS-037 — 에코 가드
  it('emit 한 카메라가 URL로 돌아온 에코는 지도에 다시 적용하지 않는다', () => {
    const emitted = createMapCamera(37.54893, 127.06612, 3)

    expect(shouldApplyUrlCamera(emitted, emitted)).toBe(false)
    expect(
      shouldApplyUrlCamera(createMapCamera(37.548931, 127.066119, 3), emitted),
    ).toBe(false)
  })

  it('뒤로가기처럼 다른 카메라로 진입하면 지도에 적용한다', () => {
    const emitted = createMapCamera(37.54893, 127.06612, 3)
    const other = createMapCamera(37.5665, 126.978, 8)

    expect(shouldApplyUrlCamera(other, emitted)).toBe(true)
    expect(shouldApplyUrlCamera(other, null)).toBe(true)
  })

  it('URL 카메라가 없으면 적용 대상이 아니다', () => {
    expect(shouldApplyUrlCamera(null, null)).toBe(false)
    expect(
      shouldApplyUrlCamera(null, createMapCamera(37.5665, 126.978, 8)),
    ).toBe(false)
  })
})

const contains = (outer: GeoBounds, inner: GeoBounds): boolean =>
  outer.lngSW <= inner.lngSW &&
  outer.latSW <= inner.latSW &&
  outer.lngNE >= inner.lngNE &&
  outer.latNE >= inner.latNE

describe('quantizeBoundsOutward', () => {
  // TC-MS-010 — 속성 검증
  it('SW는 내림·NE는 올림이고 결과가 원본을 포함한다', () => {
    let seed = 20260826
    const random = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648
      return seed / 2147483648
    }

    for (let index = 0; index < 20; index += 1) {
      const lngSW = 126.7 + random() * 0.5
      const latSW = 37.4 + random() * 0.3
      const source: GeoBounds = {
        lngSW,
        latSW,
        lngNE: lngSW + 0.01 + random() * 0.2,
        latNE: latSW + 0.01 + random() * 0.2,
      }
      const quantized = quantizeBoundsOutward(source)

      expect(contains(quantized, source)).toBe(true)
      expect(quantized.lngSW).toBeLessThanOrEqual(source.lngSW)
      expect(quantized.latSW).toBeLessThanOrEqual(source.latSW)
      expect(quantized.lngNE).toBeGreaterThanOrEqual(source.lngNE)
      expect(quantized.latNE).toBeGreaterThanOrEqual(source.latNE)
    }
  })

  it('양자화 단위의 배수로 떨어진다', () => {
    const quantized = quantizeBoundsOutward({
      lngSW: 126.98123,
      latSW: 37.56789,
      lngNE: 127.01234,
      latNE: 37.59876,
    })

    Object.values(quantized).forEach(value => {
      const steps = value / MAP_BOUNDS_QUANTIZE_STEP
      expect(Math.abs(steps - Math.round(steps))).toBeLessThan(1e-6)
    })
  })

  // TC-MS-011 / TC-MS-036 — 미세 팬이 같은 쿼리 키로 떨어진다
  it('100m 미만 차이 나는 두 bounds는 같은 키가 된다', () => {
    const base: GeoBounds = {
      lngSW: 126.9805,
      latSW: 37.5605,
      lngNE: 127.0205,
      latNE: 37.5905,
    }
    const nudged: GeoBounds = {
      lngSW: base.lngSW + 0.0002,
      latSW: base.latSW + 0.0002,
      lngNE: base.lngNE + 0.0002,
      latNE: base.latNE + 0.0002,
    }

    expect(quantizeBoundsOutward(nudged)).toEqual(quantizeBoundsOutward(base))
    expect(JSON.stringify(quantizeBoundsOutward(nudged))).toBe(
      JSON.stringify(quantizeBoundsOutward(base)),
    )
  })
})

/**
 * 이상적 뷰포트 = 앵커 span 을 SDK 실측 배율(한 단계 = 2배)로 환산한 값.
 * `createCameraBounds` 는 여기에 여유를 더하므로 항상 이것을 포함해야 한다.
 */
const idealViewport = (camera: MapCamera): GeoBounds => {
  const scale = 2 ** (camera.level - CAMERA_BOUNDS_ANCHOR_LEVEL)
  const lngSpan = CAMERA_BOUNDS_ANCHOR_LNG_SPAN * scale
  const latSpan = CAMERA_BOUNDS_ANCHOR_LAT_SPAN * scale

  return {
    lngSW: camera.lng - lngSpan / 2,
    latSW: camera.lat - latSpan / 2,
    lngNE: camera.lng + lngSpan / 2,
    latNE: camera.lat + latSpan / 2,
  }
}

describe('createCameraBounds', () => {
  // TC-MS-012
  it('근사 bounds가 이상적 뷰포트를 포함한다', () => {
    ;[1, 4, 8, 14].forEach(level => {
      const camera = createMapCamera(37.5665, 126.978, level)
      expect(contains(createCameraBounds(camera), idealViewport(camera))).toBe(
        true,
      )
    })
  })

  // TC-MS-013
  it('기본 카메라의 근사 bounds가 SEOUL_MAP_BOUNDS와 같은 자릿수로 서울을 덮는다', () => {
    const bounds = createCameraBounds(SEOUL_DEFAULT_CAMERA)

    // 서울 전체(SEOUL_MAP_BOUNDS)를 포함한다.
    expect(contains(bounds, SEOUL_MAP_BOUNDS)).toBe(true)

    const lngSpan = bounds.lngNE - bounds.lngSW
    const latSpan = bounds.latNE - bounds.latSW
    const seoulLngSpan = SEOUL_MAP_BOUNDS.lngNE - SEOUL_MAP_BOUNDS.lngSW
    const seoulLatSpan = SEOUL_MAP_BOUNDS.latNE - SEOUL_MAP_BOUNDS.latSW

    // 같은 자릿수 = 같은 창을 다루고 있다는 뜻. 4배를 넘으면 과조회다.
    expect(lngSpan / seoulLngSpan).toBeLessThanOrEqual(4)
    expect(latSpan / seoulLatSpan).toBeLessThanOrEqual(4)
  })

  it('앵커 level의 span 비율이 SEOUL_MAP_BOUNDS 종횡비와 일치한다', () => {
    // 앵커가 SEOUL_MAP_BOUNDS 에서 유도됐음을 못 박는다 — 상수가 흔들리면 실패한다.
    expect(CAMERA_BOUNDS_ANCHOR_LNG_SPAN).toBeCloseTo(
      SEOUL_MAP_BOUNDS.lngNE - SEOUL_MAP_BOUNDS.lngSW,
      6,
    )
    expect(CAMERA_BOUNDS_ANCHOR_LAT_SPAN).toBeCloseTo(
      SEOUL_MAP_BOUNDS.latNE - SEOUL_MAP_BOUNDS.latSW,
      6,
    )
  })

  it('level이 한 단계 낮아지면 span이 절반이 된다', () => {
    const wide = createCameraBounds(createMapCamera(37.5665, 126.978, 8))
    const close = createCameraBounds(createMapCamera(37.5665, 126.978, 7))

    const wideSpan = wide.lngNE - wide.lngSW
    const closeSpan = close.lngNE - close.lngSW

    // 외향 양자화(0.001) 오차를 감안한 비교
    expect(closeSpan / wideSpan).toBeGreaterThan(0.49)
    expect(closeSpan / wideSpan).toBeLessThan(0.52)
  })
})
