'use client'

import { useQuery } from '@tanstack/react-query'

import { fetchStatusRankings } from '@/lib/api/status'
import { retryUnlessClientError } from '@/lib/api/api-error'

/**
 * 홈 히어로 지도의 값 칠(#588). 25개 구를 5분위로 칠하려면 Top10 이 아니라 전체 순위가 있어야 한다.
 *
 * 홈은 늘 최신 분기다 — 분기를 생략해 보내고 서버가 해석한다(`HOME_TOP_TEN_QUERY_KEY` 와 같은 이유).
 * `/status` 의 `statusQueryKeys.rankings('latest')` 와 키를 나눈다 — 재시도·자리 표시 옵션이 달라 한
 * 캐시를 나누면 한쪽 옵션이 다른 쪽에 끼어든다(status-query.ts 의 같은 판단).
 */
export const HOME_DISTRICT_RANKINGS_QUERY_KEY = [
  'home',
  'districtRankings',
  'latest',
] as const

export const useHomeDistrictRankings = () =>
  useQuery({
    queryKey: HOME_DISTRICT_RANKINGS_QUERY_KEY,
    queryFn: () => fetchStatusRankings(),
    retry: retryUnlessClientError(1),
    staleTime: 5 * 60 * 1000,
  })
