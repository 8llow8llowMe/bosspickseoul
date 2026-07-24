import { apiClient } from '@/lib/api/client'
import type {
  AdministrationAreasResponse,
  CandidateCommercialsResponse,
  CommercialAreasResponse,
  CommercialProfileResponse,
  GeoBounds,
  MapAreasResponse,
  RecommendationRequest,
} from '@/types/recommend'

export const RECOMMENDATION_PERIOD_CODE = '20233'
export const RECOMMENDATION_TOP_N = 5 as const
export const SEOUL_MAP_BOUNDS: GeoBounds = {
  lngSW: 126.7,
  latSW: 37.4,
  lngNE: 127.3,
  latNE: 37.75,
}

const buildBoundsSearchParams = (bounds: GeoBounds) =>
  new URLSearchParams(
    Object.entries(bounds).map(([key, value]) => [key, String(value)]),
  )

export const buildRecommendationSearchParams = ({
  serviceCode,
  commercialCodes,
  periodCode,
  topN,
}: RecommendationRequest) => {
  const params = new URLSearchParams({ serviceCode })
  commercialCodes.forEach(code => params.append('commercialCodes', code))
  params.set('periodCode', periodCode)
  params.set('topN', String(topN))
  return params
}

export const fetchDistrictMapAreas = async (
  bounds: GeoBounds = SEOUL_MAP_BOUNDS,
) => {
  const response = await apiClient.get<MapAreasResponse>(
    `/map/districts?${buildBoundsSearchParams(bounds)}`,
  )
  return response.data
}

export const fetchAdministrations = async (districtCode: string) => {
  const response = await apiClient.get<AdministrationAreasResponse>(
    `/regions/districts/${districtCode}/administrations`,
  )
  return response.data
}

export const fetchAdministrationMapAreas = async (bounds: GeoBounds) => {
  const response = await apiClient.get<MapAreasResponse>(
    `/map/administrations?${buildBoundsSearchParams(bounds)}`,
  )
  return response.data
}

export const fetchCommercialMapAreas = async (bounds: GeoBounds) => {
  const response = await apiClient.get<MapAreasResponse>(
    `/map/commercials?${buildBoundsSearchParams(bounds)}`,
  )
  return response.data
}

export const fetchCommercials = async (
  districtCode: string,
  administrationCode: string,
) => {
  const response = await apiClient.get<CommercialAreasResponse>(
    `/regions/districts/${districtCode}/administrations/${administrationCode}/commercials`,
  )
  return response.data
}

export const fetchCommercialRecommendations = async (
  request: RecommendationRequest,
) => {
  const response = await apiClient.get<CandidateCommercialsResponse>(
    `/commercials/recommendations/by-service?${buildRecommendationSearchParams(request)}`,
  )
  return response.data
}

export const fetchCommercialProfile = async (
  commercialCode: string,
  serviceCode: string,
  periodCode: string,
) => {
  const params = new URLSearchParams({ serviceCode, periodCode })
  const response = await apiClient.get<CommercialProfileResponse>(
    `/map/commercials/${commercialCode}/profile?${params}`,
  )
  return response.data
}
