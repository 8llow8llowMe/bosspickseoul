/**
 * ⚠️ V1(NowDoBoss) 시뮬레이션 API 클라이언트 — **삭제 예정**.
 *
 * 여기의 경로(`/simulation/store`, `/simulation/franchisee`, `POST /simulation`,
 * `/simulation/save`)는 V2 게이트웨이에 **존재하지 않는다**. 호출하면 404다.
 * 정본은 `@/lib/api/simulation`(V2 `/simulations/**`)이며, 이 파일은 아직 V1을 참조하는
 * 레거시 컴포넌트가 컴파일되도록 남겨둔 임시 격리 지대다. 새 코드는 여기서 import 하지 않는다.
 *
 * 제거 조건은 `@/types/simulation-v1-legacy` 주석과 동일하다.
 *
 * @deprecated V2는 `@/lib/api/simulation`을 쓴다.
 */

import { apiClient } from '@/lib/api/client'
import type {
  FranchiseListResponse,
  SimulationComparisonRequest,
  SimulationReportRequest,
  SimulationReportResponse,
  SimulationSaveRequest,
  SimulationSavedListResponse,
  StoreSizeResponse,
} from '@/types/simulation-v1-legacy'

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
