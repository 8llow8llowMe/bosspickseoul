import type { PolicyItem } from '@/types/policy'
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

/**
 * 블루오션 업종 — 소속 행정동에는 많지만 이 상권에는 적은(비어 있는) 업종.
 *
 * `storeRate = commercialStoreCount / administrationStoreCount * 100` (행정동 대비 점유율, %).
 * **낮을수록 비어 있다 = 진입 기회가 있다.** 백엔드가 오름차순 Top 5로 내려준다.
 */
export type BlueOceanCategory = {
  serviceCode: string
  serviceName: string
  /** 이 상권의 해당 업종 점포 수 */
  commercialStoreCount: number
  /** 소속 행정동의 해당 업종 점포 수 */
  administrationStoreCount: number
  /** 행정동 대비 상권 점유율(%). 낮을수록 비어 있다. */
  storeRate: number
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
  /**
   * 블루오션 업종 Top 5. 업종별 상권 추천 응답에서만 채워진다.
   * 백엔드가 산정에 실패하면 빈 목록으로 강등하므로 `null`·`[]` 모두 정상 상황이다.
   */
  blueOceanCategories?: BlueOceanCategory[] | null
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

/**
 * 서버가 정한 추천 기준. 사용자가 고르지 않고 응답에 실려 온다 —
 * Top N 순위를 정한 근거라서 화면에 그대로 보여 준다.
 * 읽지 못한 조각은 `null` 이고, 그 조각만 화면에서 빠진다.
 */
export type RecommendationBasis = {
  presetName: string | null
  presetDescription: string | null
  priorityMetricName: string | null
  priorityMetricDescription: string | null
  summary: string | null
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
  /**
   * 이 상권의 자치구·업종으로 매칭된 지원 정책 상위 5건.
   *
   * ⚠️ **api-docs 에 없는 필드다.** 이 엔드포인트는 백엔드에서 `@Hidden` 이라
   * OpenAPI 스냅샷에 나타나지 않아 계약 대조로 잡히지 않는다 — 응답 실측으로 적었다.
   * 백엔드가 이미 내려주고 있었는데 이 타입에 없어서 FE 가 통째로 버리고 있었다.
   */
  policyRecommendations?: PolicyItem[] | null
}

/**
 * 상권 소속 지역 (`GET /regions/commercials/{commercialCode}/administration`).
 *
 * **상권 코드 하나만 아는 자리에서 상위 코드를 얻는 유일한 역방향 조회다.** 분석 4단계는
 * 자치구·행정동·상권·업종을 전부 요구하므로, 인기 순위처럼 상권 코드만 주는 데이터는
 * 이 조회 없이는 화면에 이을 수 없다(엔드포인트 인벤토리 B4).
 */
export type CommercialRegion = {
  commercialCode: string
  commercialName: string
  districtCode: string
  districtName: string
  administrationCode: string
  administrationName: string
}

export type MapAreasBody = { areas: AreaBoundaryItem[] }
export type AdministrationAreasResponse = ApiResponse<AdministrationArea[]>
export type CommercialAreasResponse = ApiResponse<CommercialArea[]>
export type MapAreasResponse = ApiResponse<MapAreasBody>
export type CandidateCommercialsResponse = ApiResponse<CandidateCommercials>
export type CommercialProfileResponse = ApiResponse<CommercialProfile>
export type CommercialRegionResponse = ApiResponse<CommercialRegion>

export type RecommendationRequest = {
  serviceCode: string
  commercialCodes: string[]
  periodCode: string
  /** 백엔드 허용 범위는 5~30. 벗어나면 400(COMMERCIAL_101)이라 요청 직전에 clamp 한다. */
  topN: number
}
