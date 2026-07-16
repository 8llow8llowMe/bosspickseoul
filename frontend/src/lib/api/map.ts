import { apiClient } from '@/lib/api/client'
import type {
  AdministrationAreasResponse,
  CommercialAreasResponse,
} from '@/types/map'

export const fetchDongList = async (districtCode: number) => {
  const response = await apiClient.get<AdministrationAreasResponse>(
    `/commercial/administration/district/${districtCode}/areas`,
  )

  return response.data
}

export const fetchAdministrationList = async (administrationCode: number) => {
  const response = await apiClient.get<CommercialAreasResponse>(
    `/commercial/administration/${administrationCode}/areas`,
  )

  return response.data
}
