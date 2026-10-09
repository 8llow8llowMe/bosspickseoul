import { apiClient } from '@/lib/api/client'
import type {
  DistrictDetailResponse,
  DistrictRankingsResponse,
  DistrictTopTenResponse,
} from '@/types/status'

/*
 * 기준 분기(`currentPeriodCode`)는 사용자가 고른 분기면 명시하고, 「최신」이면 **생략**한다 — 서버가
 * 적재 기준 최신 분기로 해석하고 응답 `currentPeriodCode` 로 알려 준다(BE #464, period-catalog.md D3-3).
 * 예전에는 FE 상수를 늘 명시했다(백엔드 기본값이 20233 이던 때의 #409 대응). `previousPeriodCode` 는
 * 생략한다 — 백엔드가 직전 분기를 비교 기준으로 쓴다.
 */
const periodQuery = (currentPeriodCode?: string): string =>
  currentPeriodCode ? `?${new URLSearchParams({ currentPeriodCode })}` : ''

export const buildStatusTopTenPath = (currentPeriodCode?: string): string =>
  `/districts/top-ten${periodQuery(currentPeriodCode)}`

/** 25개 구 전체 순위(BE #433). 분기 파라미터는 `top-ten` 과 같게 해석된다. */
export const buildStatusRankingsPath = (currentPeriodCode?: string): string =>
  `/districts/rankings${periodQuery(currentPeriodCode)}`

export const buildStatusDetailPath = (
  districtCode: string,
  currentPeriodCode?: string,
): string =>
  `/districts/${encodeURIComponent(districtCode)}${periodQuery(currentPeriodCode)}`

export const fetchStatusTopTen = async (currentPeriodCode?: string) => {
  const response = await apiClient.get<DistrictTopTenResponse>(
    buildStatusTopTenPath(currentPeriodCode),
  )

  return response.data
}

export const fetchStatusRankings = async (currentPeriodCode?: string) => {
  const response = await apiClient.get<DistrictRankingsResponse>(
    buildStatusRankingsPath(currentPeriodCode),
  )

  return response.data
}

export const fetchStatusDetail = async (
  districtCode: string,
  currentPeriodCode?: string,
) => {
  const response = await apiClient.get<DistrictDetailResponse>(
    buildStatusDetailPath(districtCode, currentPeriodCode),
  )

  return response.data
}
