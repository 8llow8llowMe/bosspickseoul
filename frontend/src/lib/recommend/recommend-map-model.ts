import type {
  AreaBoundaryItem,
  CandidateCommercial,
  CommercialArea,
  CommercialProfile,
  CoordinateTuple,
} from '@/types/recommend'

export {
  createBounds,
  createCenterFallbackBounds,
  normalizeBoundary,
  normalizeViewportBounds,
  type MapPoint,
} from '@/lib/map/geometry'

const isValidPoint = (lng: number, lat: number): boolean =>
  Number.isFinite(lng) &&
  Number.isFinite(lat) &&
  lng >= -180 &&
  lng <= 180 &&
  lat >= -90 &&
  lat <= 90

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
