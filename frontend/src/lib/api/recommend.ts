import { apiClient } from '@/lib/api/client'
import type {
  AdministrationAreasResponse,
  CandidateCommercialsResponse,
  CommercialAreasResponse,
  CommercialProfileResponse,
  CommercialRegionResponse,
  GeoBounds,
  MapAreasResponse,
  RecommendationRequest,
} from '@/types/recommend'

export const RECOMMENDATION_PERIOD_CODE = '20233'
/**
 * 백엔드가 허용하는 `topN` 범위. **5~30을 벗어나면 400(COMMERCIAL_101)** 이다.
 * (`GET /api/v1/commercials/recommendations/by-service`, topN: minimum 5 / maximum 30)
 */
export const RECOMMENDATION_TOP_N_MIN = 5
export const RECOMMENDATION_TOP_N_MAX = 30
/** 기본 추천 개수. 화면 문구("추천 Top 5")와 짝을 이룬다. */
export const RECOMMENDATION_TOP_N = 5 as const

export const SEOUL_MAP_BOUNDS: GeoBounds = {
  lngSW: 126.7,
  latSW: 37.4,
  lngNE: 127.3,
  latNE: 37.75,
}

/**
 * 허용 범위 밖의 `topN`을 요청 직전에 잘라낸다.
 * 값을 밖에서 받는 경로(쿼리스트링·설정 등)가 생겨도 400으로 새지 않게 하는 마지막 방어선이다.
 */
export const clampRecommendationTopN = (topN: unknown): number => {
  if (typeof topN !== 'number' || !Number.isFinite(topN)) {
    return RECOMMENDATION_TOP_N
  }

  return Math.min(
    RECOMMENDATION_TOP_N_MAX,
    Math.max(RECOMMENDATION_TOP_N_MIN, Math.trunc(topN)),
  )
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
  params.set('topN', String(clampRecommendationTopN(topN)))
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

/**
 * 상권 코드 → 소속 행정동·자치구. **눌린 항목에만** 부른다.
 *
 * 인기 순위(`/analysis-rankings?areaType=COMMERCIAL`)는 `areaCode`(상권코드) 하나만 주는데
 * 분석 화면은 상위 코드까지 있어야 열린다. 목록 N개를 미리 조회하면 N+1 이 되므로
 * 사용자가 고른 하나만 조회한다.
 */
export const fetchCommercialRegion = async (commercialCode: string) => {
  const response = await apiClient.get<CommercialRegionResponse>(
    `/regions/commercials/${encodeURIComponent(commercialCode)}/administration`,
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
