import type {
  AreaBoundaryItem,
  CandidateCommercial,
  CommercialArea,
  CommercialProfile,
  CoordinateTuple,
  GeoBounds,
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

export const filterAreasByCodes = (
  areas: readonly AreaBoundaryItem[],
  codes: readonly (string | number)[],
): AreaBoundaryItem[] => {
  const allowedCodes = new Set(codes.map(String))

  return areas.filter(area => allowedCodes.has(String(area.areaCode)))
}

const rankOpacity = [0.42, 0.29, 0.23, 0.17, 0.11] as const

export const getScoreFillOpacity = (
  score: number | null,
  rank: number,
): number => {
  if (!Number.isFinite(score)) {
    const normalizedRank = Number.isFinite(rank)
      ? Math.min(Math.max(Math.trunc(rank), 1), 5)
      : 5

    return rankOpacity[normalizedRank - 1] ?? rankOpacity[4]
  }

  const normalizedScore = Math.min(Math.max(score ?? 0, 0), 100) / 100

  return Number((0.11 + normalizedScore * 0.31).toFixed(2))
}

export type RecommendationMapItem = {
  rank: number
  commercialCode: string
  commercialName: string
  compositeScore: number | null
  centerLng: number
  centerLat: number
  boundaryCoords: CoordinateTuple[]
}

export const buildRecommendationMapItems = (
  results: readonly CandidateCommercial[],
  profiles: readonly CommercialProfile[],
  commercials: readonly CommercialArea[],
): RecommendationMapItem[] => {
  const profilesByCode = new Map(
    profiles.map(profile => [String(profile.commercialCode), profile]),
  )
  const commercialsByCode = new Map(
    commercials.map(commercial => [
      String(commercial.commercialCode),
      commercial,
    ]),
  )

  return results.flatMap(result => {
    const commercialCode = String(result.commercialCode)
    const profile = profilesByCode.get(commercialCode)
    const commercial = commercialsByCode.get(commercialCode)
    const hasValidProfileCenter =
      profile !== undefined &&
      isValidPoint(profile.centerLng, profile.centerLat)
    const centerLng = hasValidProfileCenter
      ? profile.centerLng
      : commercial?.centerLng
    const centerLat = hasValidProfileCenter
      ? profile.centerLat
      : commercial?.centerLat

    if (
      centerLng === undefined ||
      centerLat === undefined ||
      !isValidPoint(centerLng, centerLat)
    ) {
      return []
    }

    const boundaryCoords = hasValidProfileCenter
      ? profile.boundaryCoords.filter(([lng, lat]) => isValidPoint(lng, lat))
      : []

    return [
      {
        rank: result.rank,
        commercialCode,
        commercialName: result.commercialName,
        compositeScore: result.compositeScore,
        centerLng,
        centerLat,
        boundaryCoords,
      },
    ]
  })
}
