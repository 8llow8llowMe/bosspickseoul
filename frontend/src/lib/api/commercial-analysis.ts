import { apiClient } from '@/lib/api/client'
import type {
  CommercialBenchmarkResponse,
  CommercialFacilityResponse,
  CommercialFootTrafficResponse,
  CommercialIncomeAndExpenseResponse,
  CommercialIncomeSummaryResponse,
  CommercialResidentPopulationResponse,
  CommercialSalesResponse,
  CommercialSalesSummaryResponse,
  CommercialServiceCategoriesResponse,
  CommercialStoreAnalysisResponse,
  CommercialTrendMetric,
  CommercialTrendResponse,
  DistrictAreasResponse,
} from '@/types/commercial-analysis'

export type AnalysisContextSearchParams = {
  districtCode: string
  administrationCode: string
  serviceCode: string
  periodCode: string
}

export type TrendSearchParams = {
  serviceCode: string
  metricType: CommercialTrendMetric
  periodCode: string
  periodCount: number
}

export const buildAnalysisContextSearchParams = ({
  districtCode,
  administrationCode,
  serviceCode,
  periodCode,
}: AnalysisContextSearchParams) =>
  new URLSearchParams({
    districtCode,
    administrationCode,
    serviceCode,
    periodCode,
  })

export const buildTrendSearchParams = ({
  serviceCode,
  metricType,
  periodCode,
  periodCount,
}: TrendSearchParams) =>
  new URLSearchParams({
    serviceCode,
    metricType,
    periodCode,
    periodCount: String(periodCount),
  })

export const buildDistrictsSearchParams = (periodCode: string) =>
  new URLSearchParams({ currentPeriodCode: periodCode })

const periodParams = (periodCode: string) => new URLSearchParams({ periodCode })

const servicePeriodParams = (serviceCode: string, periodCode: string) =>
  new URLSearchParams({ serviceCode, periodCode })

export const fetchDistricts = async (periodCode: string) => {
  const response = await apiClient.get<DistrictAreasResponse>(
    `/districts?${buildDistrictsSearchParams(periodCode)}`,
  )
  return response.data
}

export const fetchCommercialServiceCategories = async (
  commercialCode: string,
) => {
  const response = await apiClient.get<CommercialServiceCategoriesResponse>(
    `/commercials/${commercialCode}/service-categories`,
  )
  return response.data
}

export const fetchCommercialFootTraffic = async (
  commercialCode: string,
  periodCode: string,
) => {
  const response = await apiClient.get<CommercialFootTrafficResponse>(
    `/commercials/${commercialCode}/foot-traffic?${periodParams(periodCode)}`,
  )
  return response.data
}

export const fetchCommercialSales = async (
  commercialCode: string,
  serviceCode: string,
  periodCode: string,
) => {
  const response = await apiClient.get<CommercialSalesResponse>(
    `/commercials/${commercialCode}/services/${serviceCode}/sales?${periodParams(
      periodCode,
    )}`,
  )
  return response.data
}

export const fetchCommercialSalesSummary = async (
  commercialCode: string,
  params: AnalysisContextSearchParams,
) => {
  const response = await apiClient.get<CommercialSalesSummaryResponse>(
    `/commercials/${commercialCode}/summaries/sales?${buildAnalysisContextSearchParams(
      params,
    )}`,
  )
  return response.data
}

export const fetchCommercialStores = async (
  commercialCode: string,
  serviceCode: string,
  periodCode: string,
) => {
  const response = await apiClient.get<CommercialStoreAnalysisResponse>(
    `/commercials/${commercialCode}/services/${serviceCode}/stores?${periodParams(
      periodCode,
    )}`,
  )
  return response.data
}

export const fetchCommercialPopulation = async (
  commercialCode: string,
  periodCode: string,
) => {
  const response = await apiClient.get<CommercialResidentPopulationResponse>(
    `/commercials/${commercialCode}/population?${periodParams(periodCode)}`,
  )
  return response.data
}

export const fetchCommercialIncome = async (
  commercialCode: string,
  periodCode: string,
) => {
  const response = await apiClient.get<CommercialIncomeAndExpenseResponse>(
    `/commercials/${commercialCode}/income?${periodParams(periodCode)}`,
  )
  return response.data
}

export const fetchCommercialIncomeSummary = async (
  commercialCode: string,
  districtCode: string,
  administrationCode: string,
  periodCode: string,
) => {
  const params = new URLSearchParams({
    districtCode,
    administrationCode,
    periodCode,
  })
  const response = await apiClient.get<CommercialIncomeSummaryResponse>(
    `/commercials/${commercialCode}/summaries/income?${params}`,
  )
  return response.data
}

export const fetchCommercialFacilities = async (
  commercialCode: string,
  periodCode: string,
) => {
  const response = await apiClient.get<CommercialFacilityResponse>(
    `/commercials/${commercialCode}/facilities?${periodParams(periodCode)}`,
  )
  return response.data
}

export const fetchCommercialTrend = async (
  commercialCode: string,
  params: TrendSearchParams,
) => {
  const response = await apiClient.get<CommercialTrendResponse>(
    `/commercials/${commercialCode}/trend?${buildTrendSearchParams(params)}`,
  )
  return response.data
}

export const fetchCommercialBenchmark = async (
  commercialCode: string,
  serviceCode: string,
  periodCode: string,
) => {
  const response = await apiClient.get<CommercialBenchmarkResponse>(
    `/commercials/${commercialCode}/benchmarks?${servicePeriodParams(
      serviceCode,
      periodCode,
    )}`,
  )
  return response.data
}
