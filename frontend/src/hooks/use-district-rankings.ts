'use client'

import { useQuery } from '@tanstack/react-query'

import { fetchStatusRankings } from '@/lib/api/status'
import { retryUnlessClientError } from '@/lib/api/api-error'
import { statusQueryKeys } from '@/lib/status/status-query'

/**
 * `/status` 의 주 데이터. 25개 구 전체 순위 한 응답으로 Top10 목록·지도 단계 색·상세 머리를 함께 그린다
 * (status.md 「지도 단계 색」, #542). 홈 랭킹 보드·인기지역은 그대로 `top-ten` 을 쓴다.
 *
 * `currentPeriodCode` 가 null 이면 「최신」이다 — 분기를 생략해 보내 서버가 해석하고, 키는 `'latest'` 다.
 */
export const useDistrictRankings = (currentPeriodCode: string | null) =>
  useQuery({
    queryKey: statusQueryKeys.rankings(currentPeriodCode ?? 'latest'),
    queryFn: () => fetchStatusRankings(currentPeriodCode ?? undefined),
    // 404(데이터 부재)·4xx는 재시도해도 결과가 같다. 5xx/통신 실패만 재시도한다.
    retry: retryUnlessClientError(3),
    // 분기를 바꾸면 키가 바뀌어 데이터가 빈다. 그대로 두면 페이지가 로딩 화면으로 바뀌며
    // 분기 select 가 사라진다 — 새 응답이 올 때까지 직전 분기 응답을 자리 표시로 둔다.
    placeholderData: previousData => previousData,
  })
