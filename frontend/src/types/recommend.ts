import type { ApiResponse } from '@/types/api'

export type CoordinateTuple = readonly [lng: number, lat: number]

export type GeoBounds = {
  lngSW: number
  latSW: number
  lngNE: number
  latNE: number
}

export type AreaBoundaryItem = {
  areaCode: string
  areaName: string
  centerLng: number
  centerLat: number
  boundaryCoords: CoordinateTuple[]
}

export type AdministrationArea = {
  administrationCode: string
  administrationName: string
  centerLat: number
  centerLng: number
}

export type CommercialArea = {
  commercialCode: string
  commercialName: string
  commercialClassificationCode: string
  commercialClassificationName: string
  centerLat: number
  centerLng: number
}

export type CodeNameDescriptionMetadata = {
  code: string
  name: string
  description: string
} | null

export type ScoreMetricMetadata = {
  code: string
  name: string
  description: string
  scoreDescription: string
} | null

export type MetricBreakdownItem = {
  metricType: ScoreMetricMetadata
  score: number | null
  grade: string | null
  summaryLabel: string | null
}

export type CandidateCommercial = {
  rank: number
  commercialCode: string
  commercialName: string
  compositeScore: number | null
  grade: string | null
  summaryLabel: string | null
  selectionReason: string | null
  opportunityLabel: string | null
  riskLabel: string | null
  metricBreakdown: MetricBreakdownItem[]
  reasonTags: string[]
}

export type CandidateCommercials = {
  serviceCode: string
  periodCode: string
  preset: CodeNameDescriptionMetadata
  priorityMetric: ScoreMetricMetadata
  topN: number
  summary: string
  items: CandidateCommercial[]
}

export type CommercialProfile = {
  commercialCode: string
  commercialName: string
  districtCode: string
  districtName: string
  administrationCode: string
  administrationName: string
  centerLng: number
  centerLat: number
  boundaryCoords: CoordinateTuple[]
  keyMetrics: {
    totalSalesAmount?: number | null
    totalFootTraffic?: number | null
    totalStoreCount?: number | null
    similarStoreCount?: number | null
    openingRate?: number | null
    closureRate?: number | null
    totalResidentPopulation?: number | null
    monthlyAverageIncomeAmount?: number | null
    totalFacilityCount?: number | null
  } | null
}

export type MapAreasBody = { areas: AreaBoundaryItem[] }
export type AdministrationAreasResponse = ApiResponse<AdministrationArea[]>
export type CommercialAreasResponse = ApiResponse<CommercialArea[]>
export type MapAreasResponse = ApiResponse<MapAreasBody>
export type CandidateCommercialsResponse = ApiResponse<CandidateCommercials>
export type CommercialProfileResponse = ApiResponse<CommercialProfile>

export type RecommendationRequest = {
  serviceCode: string
  commercialCodes: string[]
  periodCode: string
  topN: 5
}
