import { apiClient } from '@/lib/api/client'
import type {
  SharedSimulationPayloadResponse,
  SimulationShareRequest,
  SimulationShareResponse,
} from '@/types/simulation'

export const createSimulationShareLink = async (
  payload: SimulationShareRequest,
) => {
  const response = await apiClient.post<SimulationShareResponse>(
    '/share',
    payload,
  )

  return response.data
}

export const fetchSharedSimulationPayload = async (token: string) => {
  const response = await apiClient.get<SharedSimulationPayloadResponse>(
    `/share/${token}`,
  )

  return response.data
}
