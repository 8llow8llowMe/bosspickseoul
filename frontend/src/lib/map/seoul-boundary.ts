/**
 * 경위도 점이 서울 안인지 판정한다. 구별현황 지도 데이터(약 59KB)를 읽으므로 지도 화면이
 * 정적으로 끌어오지 않게 따로 둔다 — `current-location` 을 동적 import 할 때만 실린다.
 */

import {
  SEOUL_STATUS_FEATURES,
  SEOUL_STATUS_GEO_BOUNDS,
  SEOUL_STATUS_VIEW_BOX,
} from '@/data/seoul-status-map'

type GeoPoint = { lat: number; lng: number }

type SvgPoint = { x: number; y: number }

const [, , VIEW_WIDTH, VIEW_HEIGHT] =
  SEOUL_STATUS_VIEW_BOX.split(' ').map(Number)

/** 경위도 → 구별현황 SVG 좌표. 생성기(`scripts/generate-status-map.mjs`)의 투영과 같은 식이다. */
const projectToStatusMap = ({ lat, lng }: GeoPoint): SvgPoint => ({
  x:
    ((lng - SEOUL_STATUS_GEO_BOUNDS.minLng) /
      (SEOUL_STATUS_GEO_BOUNDS.maxLng - SEOUL_STATUS_GEO_BOUNDS.minLng)) *
    VIEW_WIDTH,
  y:
    ((SEOUL_STATUS_GEO_BOUNDS.maxLat - lat) /
      (SEOUL_STATUS_GEO_BOUNDS.maxLat - SEOUL_STATUS_GEO_BOUNDS.minLat)) *
    VIEW_HEIGHT,
})

/** `M x yL x y…Z` 만 쓰는 생성 경로를 고리 목록으로 푼다(생성기의 `createPath` 역함수). */
const parseRings = (path: string): SvgPoint[][] =>
  path
    .split('Z')
    .filter(Boolean)
    .map(ring =>
      ring
        .split(/[ML]/)
        .filter(Boolean)
        .map(pair => {
          const [x, y] = pair.trim().split(/\s+/).map(Number)
          return { x, y }
        }),
    )

let seoulRings: SvgPoint[][][] | null = null
const getSeoulRings = () =>
  (seoulRings ??= SEOUL_STATUS_FEATURES.map(feature =>
    parseRings(feature.path),
  ))

/** 짝홀 규칙. 한 구의 고리들을 함께 세므로 구멍(다른 구를 둘러싼 고리)도 맞게 빠진다. */
const isInsideRings = (point: SvgPoint, rings: readonly SvgPoint[][]) => {
  let inside = false
  for (const ring of rings) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
      const a = ring[i]
      const b = ring[j]
      if (
        a.y > point.y !== b.y > point.y &&
        point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x
      ) {
        inside = !inside
      }
    }
  }
  return inside
}

/**
 * 서울 25개 자치구 경계 안인지. 사각형(`SEOUL_MAP_BOUNDS`)으로 재면 부천·과천·성남·구리처럼
 * 경계에 붙은 도시가 전부 「서울」로 잡혀 빈 지도로 옮겨 간다 — 구별현황 지도가 이미 번들에
 * 들고 있는 자치구 경계로 판정한다(단순화 허용치 0.25px ≈ 10m 라 경계 판정에 충분하다).
 */
export const isInSeoul = (point: GeoPoint): boolean => {
  if (!Number.isFinite(point.lat) || !Number.isFinite(point.lng)) return false
  if (
    point.lng < SEOUL_STATUS_GEO_BOUNDS.minLng ||
    point.lng > SEOUL_STATUS_GEO_BOUNDS.maxLng ||
    point.lat < SEOUL_STATUS_GEO_BOUNDS.minLat ||
    point.lat > SEOUL_STATUS_GEO_BOUNDS.maxLat
  ) {
    return false
  }

  const projected = projectToStatusMap(point)
  return getSeoulRings().some(rings => isInsideRings(projected, rings))
}
