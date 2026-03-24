import type { ApiResponse } from '@/types/api'

export type SizeItem = {
  squareMeter: number
  pyeong: number
}

export type StoreSize = {
  small: SizeItem
  medium: SizeItem
  large: SizeItem
}

export type FranchiseListItem = {
  brandName: string
  franchiseeId: number
  serviceCode: string
  serviceCodeName: string
}

export type SimulationReportRequest = {
  isFranchisee: boolean | null
  brandName: string | null
  gugun: string
  serviceCode: string
  serviceCodeName: string
  storeSize: number
  floor: string
}

export type SimulationComparisonRequest = SimulationReportRequest & {
  selectedType: string
}

export type SimulationReport = {
  request: SimulationReportRequest
  totalPrice: number
  keyMoneyInfo: {
    keyMoneyRatio: number
    keyMoney: number
    keyMoneyLevel: number
  }
  detail: {
    rentPrice: number
    deposit: number
    interior: number
    levy: number | null
  }
  franchisees: {
    totalPrice: number
    brandName: string
    subscription: number
    education: number
    deposit: number
    etc: number
    interior: number
  }[]
  genderAndAgeAnalysisInfo: {
    maleSalesPercent: number
    femaleSalesPercent: number
    first: {
      sales: number
      name: string
    }
    second: {
      sales: number
      name: string
    }
    third: {
      sales: number
      name: string
    }
  }
  monthAnalysisInfo: {
    peakSeasons: number[]
    offPeakSeasons: number[]
  }
}

export type SimulationShareRequest = {
  url: string
  input: SimulationReportRequest
}

export type SharedSimulationPayload = {
  url?: string
  input: SimulationReportRequest
}

export type SimulationSaveRequest = {
  totalPrice: number
  isFranchisee: boolean
  brandName: string | null
  gugun: string
  serviceCode: string
  serviceCodeName: string
  storeSize: number
  floor: string
}

export type SimulationSavedItem = {
  id: number
  memberId: number
  totalPrice: number
  isFranchisee: boolean
  brandName: string | null
  gugun: string
  serviceCode: string
  serviceCodeName: string
  storeSize: number
  floor: string
}

export type SimulationSavedListBody = {
  data: SimulationSavedItem[]
  pageInfo: {
    page: number
    size: number
    totalElements: number
    totalPages: number
  }[]
}

export type StoreSizeResponse = ApiResponse<StoreSize>
export type FranchiseListResponse = ApiResponse<FranchiseListItem[]>
export type SimulationReportResponse = ApiResponse<SimulationReport>
export type SimulationShareResponse = ApiResponse<{
  token: string
}>
export type SharedSimulationPayloadResponse =
  ApiResponse<SharedSimulationPayload>
export type SimulationSavedListResponse = ApiResponse<SimulationSavedListBody>
