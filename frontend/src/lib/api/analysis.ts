import { apiClient } from '@/lib/api/client'
import type {
  AnalysisBookmarkRequest,
  AnalysisBookmarksResponse,
  ExpenditureResponse,
  FlowPopulationResponse,
  ResidentPopulationResponse,
  SalesResponse,
  ServiceListResponse,
  StoreCountResponse,
  TotalExpenditureResponse,
  TotalSalesResponse,
} from '@/types/analysis'

export const fetchServiceData = async (commercialCode: string) => {
  const response = await apiClient.get<ServiceListResponse>(
    `/commercial/service/${commercialCode}`,
  )

  return response.data
}

export const fetchFlowPopulationData = async (
  commercialCode: string,
  periodCode: string,
) => {
  const response = await apiClient.get<FlowPopulationResponse>(
    `/commercial/foot-traffic/${commercialCode}?periodCode=${periodCode}`,
  )

  return response.data
}

export const fetchSalesData = async (
  commercialCode: string,
  serviceCode: string,
  periodCode: string,
) => {
  const response = await apiClient.get<SalesResponse>(
    `/commercial/sales/${commercialCode}/${serviceCode}?periodCode=${periodCode}`,
  )

  return response.data
}

export const fetchTotalSalesData = async (
  districtCode: string,
  administrationCode: string,
  commercialCode: string,
  serviceCode: string,
  periodCode: string,
) => {
  const response = await apiClient.get<TotalSalesResponse>(
    `/commercial/sales/${districtCode}/${administrationCode}/${commercialCode}/${serviceCode}?periodCode=${periodCode}`,
  )

  return response.data
}

export const fetchStoreCountData = async (
  commercialCode: string,
  serviceCode: string,
  periodCode: string,
) => {
  const response = await apiClient.get<StoreCountResponse>(
    `/commercial/store/${commercialCode}/${serviceCode}?periodCode=${periodCode}`,
  )

  return response.data
}

export const fetchResidentPopulationData = async (
  commercialCode: string,
  periodCode: string,
) => {
  const response = await apiClient.get<ResidentPopulationResponse>(
    `/commercial/population/${commercialCode}?periodCode=${periodCode}`,
  )

  return response.data
}

export const fetchExpenditureData = async (
  commercialCode: string,
  periodCode: string,
) => {
  const response = await apiClient.get<ExpenditureResponse>(
    `/commercial/income/${commercialCode}?periodCode=${periodCode}`,
  )

  return response.data
}

export const fetchTotalExpenditureData = async (
  districtCode: string,
  administrationCode: string,
  commercialCode: string,
  periodCode: string,
) => {
  const response = await apiClient.get<TotalExpenditureResponse>(
    `/commercial/income/${districtCode}/${administrationCode}/${commercialCode}?periodCode=${periodCode}`,
  )

  return response.data
}

export const saveAnalysisBookmark = async (
  payload: AnalysisBookmarkRequest,
) => {
  const response = await apiClient.post('/commercial/analysis', payload)

  return response.data
}

export const getAnalysisBookmarks = async (page: number, size: number) => {
  const response = await apiClient.get<AnalysisBookmarksResponse>(
    `/commercial/analysis-list?page=${page}&size=${size}`,
  )

  return response.data
}
