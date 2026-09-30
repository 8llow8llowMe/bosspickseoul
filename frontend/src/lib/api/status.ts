import { ANALYSIS_PERIOD_CODE } from '@/lib/analysis/selection'
import { apiClient } from '@/lib/api/client'
import type {
  DistrictDetailResponse,
  DistrictTopTenResponse,
} from '@/types/status'

/*
 * 기준 분기(`currentPeriodCode`)는 **늘 명시해서** 보낸다. 백엔드 기본값에 기대던 동안
 * 그 값이 20233 이라 구별현황이 2023년 3분기에 묶여 있었다(#409, status.md 1.6).
 * `previousPeriodCode` 는 생략한다 — 백엔드가 직전 분기를 비교 기준으로 쓴다.
 */
const periodSearchParams = (currentPeriodCode: string) =>
  new URLSearchParams({ currentPeriodCode })

export const buildStatusTopTenPath = (
  currentPeriodCode: string = ANALYSIS_PERIOD_CODE,
): string => `/districts/top-ten?${periodSearchParams(currentPeriodCode)}`

export const buildStatusDetailPath = (
  districtCode: string,
  currentPeriodCode: string = ANALYSIS_PERIOD_CODE,
): string =>
  `/districts/${encodeURIComponent(districtCode)}?${periodSearchParams(currentPeriodCode)}`

export const fetchStatusTopTen = async (
  currentPeriodCode: string = ANALYSIS_PERIOD_CODE,
) => {
  const response = await apiClient.get<DistrictTopTenResponse>(
    buildStatusTopTenPath(currentPeriodCode),
  )

  return response.data
}

export const fetchStatusDetail = async (
  districtCode: string,
  currentPeriodCode: string = ANALYSIS_PERIOD_CODE,
) => {
  const response = await apiClient.get<DistrictDetailResponse>(
    buildStatusDetailPath(districtCode, currentPeriodCode),
  )

  return response.data
}
