import { apiClient } from '@/lib/api/client'
import type {
  FranchiseListResponse,
  SimulationComparisonRequest,
  SimulationReportRequest,
  SimulationReportResponse,
  SimulationSaveRequest,
  SimulationSavedListResponse,
  StoreSizeResponse,
} from '@/types/simulation'

export const fetchStoreSize = async (serviceCode: string) => {
  const response = await apiClient.get<StoreSizeResponse>(
    `/simulation/store?serviceCode=${serviceCode}`,
  )

  return response.data
}

export const fetchFranchiseList = async (
  keyword: string | null,
  lastId: number,
  serviceCode: string,
) => {
  const response = await apiClient.get<FranchiseListResponse>(
    `/simulation/franchisee?keyword=${keyword ?? ''}&lastId=${lastId}&serviceCode=${serviceCode}`,
  )

  return response.data
}

export const createSimulationReport = async (
  payload: SimulationReportRequest | SimulationComparisonRequest,
) => {
  const response = await apiClient.post<SimulationReportResponse>(
    '/simulation',
    payload,
  )

  return response.data
}

export const saveSimulationReport = async (payload: SimulationSaveRequest) => {
  const response = await apiClient.post('/simulation/save', payload)

  return response.data
}

export const fetchSavedSimulationList = async (page: number, size: number) => {
  const response = await apiClient.get<SimulationSavedListResponse>(
    `/simulation?page=${page}&size=${size}`,
  )

  return response.data
}
