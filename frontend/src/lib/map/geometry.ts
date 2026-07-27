import type { CoordinateTuple, GeoBounds } from '@/types/recommend'

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
