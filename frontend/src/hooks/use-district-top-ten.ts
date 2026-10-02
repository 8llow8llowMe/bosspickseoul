'use client'

import { useQuery } from '@tanstack/react-query'

import { fetchStatusTopTen } from '@/lib/api/status'
import { retryUnlessClientError } from '@/lib/api/api-error'

/**
 * 01단계(스토리)와 랭킹 섹션 우측이 **같은 키**를 쓴다. React Query 가 dedupe 하므로
 * 두 곳이 그려도 네트워크 요청은 1회다. 키를 문자열로 두 번 적으면 언젠가 한쪽만 바뀐다.
 *
 * 홈은 늘 최신 분기다. 분기를 **생략**해 보내고 서버가 해석한다 — 카탈로그(`/periods`)를 먼저 부르면
 * 첫 페인트 BFF 호출이 늘고 Top10 이 그 응답을 기다린다(period-catalog.md D3-3). 실제 분기는 응답
 * `currentPeriodCode` 에 실린다. `/status` 키와는 나눈다(status.md 1.6 「쿼리 키」).
 */
export const HOME_TOP_TEN_QUERY_KEY = [
  'home',
  'districtTopTen',
  'latest',
] as const

export const useDistrictTopTen = () =>
  useQuery({
    queryKey: HOME_TOP_TEN_QUERY_KEY,
    queryFn: () => fetchStatusTopTen(),
    retry: retryUnlessClientError(1),
    staleTime: 5 * 60 * 1000,
  })
