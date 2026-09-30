'use client'

import { useQuery } from '@tanstack/react-query'

import { ANALYSIS_PERIOD_CODE } from '@/lib/analysis/selection'
import { fetchStatusTopTen } from '@/lib/api/status'
import { retryUnlessClientError } from '@/lib/api/api-error'

/**
 * 01단계(스토리)와 랭킹 섹션 우측이 **같은 키**를 쓴다. React Query 가 dedupe 하므로
 * 두 곳이 그려도 네트워크 요청은 1회다. 키를 문자열로 두 번 적으면 언젠가 한쪽만 바뀐다.
 *
 * 홈은 늘 최신 분기다. 분기를 키에 넣어 두어 `ANALYSIS_PERIOD_CODE` 를 올리면 캐시도
 * 따라 갈린다. `/status` 키와는 같은 분기여도 나눈다(status.md 1.6 「쿼리 키」).
 */
export const HOME_TOP_TEN_QUERY_KEY = [
  'home',
  'districtTopTen',
  ANALYSIS_PERIOD_CODE,
] as const

export const useDistrictTopTen = () =>
  useQuery({
    queryKey: HOME_TOP_TEN_QUERY_KEY,
    queryFn: () => fetchStatusTopTen(ANALYSIS_PERIOD_CODE),
    retry: retryUnlessClientError(1),
    staleTime: 5 * 60 * 1000,
  })
