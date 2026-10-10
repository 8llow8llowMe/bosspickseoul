import type {
  CoordinateTuple,
  GeoBounds,
  AreaBoundaryItem,
} from '@/types/recommend'

export type MapPoint = {
  lng: number
  lat: number
}

const isValidPoint = (lng: number, lat: number): boolean =>
  Number.isFinite(lng) &&
  Number.isFinite(lat) &&
  lng >= -180 &&
  lng <= 180 &&
  lat >= -90 &&
  lat <= 90

export const normalizeBoundary = (
  coordinates: readonly CoordinateTuple[],
): MapPoint[] =>
  coordinates.flatMap(([lng, lat]) =>
    isValidPoint(lng, lat) ? [{ lng, lat }] : [],
  )

export const createBounds = (points: readonly MapPoint[]): GeoBounds | null => {
  if (points.length === 0) return null

  const lngs = points.map(point => point.lng)
  const lats = points.map(point => point.lat)

  return {
    lngSW: Math.min(...lngs),
    latSW: Math.min(...lats),
    lngNE: Math.max(...lngs),
    latNE: Math.max(...lats),
  }
}

export const createCenterFallbackBounds = (
  lng: number,
  lat: number,
): GeoBounds => ({
  lngSW: lng - 0.08,
  latSW: lat - 0.06,
  lngNE: lng + 0.08,
  latNE: lat + 0.06,
})

export const normalizeViewportBounds = (
  bounds: GeoBounds,
): GeoBounds | null => {
  const values = [bounds.lngSW, bounds.latSW, bounds.lngNE, bounds.latNE]

  if (
    values.some(value => !Number.isFinite(value)) ||
    bounds.lngSW < -180 ||
    bounds.lngNE > 180 ||
    bounds.latSW < -90 ||
    bounds.latNE > 90 ||
    bounds.lngSW >= bounds.lngNE ||
    bounds.latSW >= bounds.latNE
  ) {
    return null
  }

  return {
    lngSW: Number(bounds.lngSW.toFixed(6)),
    latSW: Number(bounds.latSW.toFixed(6)),
    lngNE: Number(bounds.lngNE.toFixed(6)),
    latNE: Number(bounds.latNE.toFixed(6)),
  }
}

export const isPointInPolygon = (
  point: MapPoint,
  ring: readonly MapPoint[],
): boolean => {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const xi = ring[i].lng
    const yi = ring[i].lat
    const xj = ring[j].lng
    const yj = ring[j].lat
    const intersect =
      yi > point.lat !== yj > point.lat &&
      point.lng < ((xj - xi) * (point.lat - yi)) / (yj - yi) + xi
    if (intersect) inside = !inside
  }
  return inside
}

export const findContainingArea = (
  point: MapPoint,
  areas: readonly AreaBoundaryItem[],
): AreaBoundaryItem | null => {
  if (areas.length === 0) return null
  for (const area of areas) {
    const ring = normalizeBoundary(area.boundaryCoords)
    if (ring.length >= 3 && isPointInPolygon(point, ring)) return area
  }
  // fallback: 중심점 최근접
  let nearest = areas[0]
  let best = Infinity
  for (const area of areas) {
    const dl = area.centerLng - point.lng
    const da = area.centerLat - point.lat
    const dist = dl * dl + da * da
    if (dist < best) {
      best = dist
      nearest = area
    }
  }
  return nearest
}

/**
 * 점을 **실제로 품은** 영역만 돌려준다. 없으면 null.
 *
 * `findContainingArea` 는 못 찾으면 중심점이 가장 가까운 영역으로 물러난다 — 지도에서 이미 고른
 * 상권의 상위 행정동을 찾을 때는 맞지만, 검색한 장소 좌표를 분석 대상으로 바꿀 때는 서울 밖이나
 * 상권 경계 밖 좌표가 엉뚱한 상권으로 붙는다(#596). 그 경우에는 이 함수를 쓴다.
 */
export const findAreaContainingPoint = (
  point: MapPoint,
  areas: readonly AreaBoundaryItem[],
): AreaBoundaryItem | null => {
  for (const area of areas) {
    const ring = normalizeBoundary(area.boundaryCoords)
    if (ring.length >= 3 && isPointInPolygon(point, ring)) return area
  }
  return null
}

/** 점을 품은 영역을 **모두** 돌려준다. 상권처럼 경계가 겹칠 수 있는 영역에서 하나를 고를 때 쓴다. */
export const findAreasContainingPoint = (
  point: MapPoint,
  areas: readonly AreaBoundaryItem[],
): AreaBoundaryItem[] =>
  areas.filter(area => {
    const ring = normalizeBoundary(area.boundaryCoords)
    return ring.length >= 3 && isPointInPolygon(point, ring)
  })

/**
 * 다각형 면적(신발끈 공식, 경위도 제곱 단위). 서울 범위에서는 위도에 따른 왜곡이 영역 사이에 거의
 * 같으므로 **크기 비교**에만 쓴다. 실제 ㎡ 가 아니다.
 */
export const computeRingArea = (ring: readonly MapPoint[]): number => {
  let doubled = 0
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    doubled += (ring[j].lng + ring[i].lng) * (ring[j].lat - ring[i].lat)
  }
  return Math.abs(doubled) / 2
}

export const resolveDistrictCodeFromAdministration = (
  administrationCode: string,
): string => administrationCode.slice(0, 5)
