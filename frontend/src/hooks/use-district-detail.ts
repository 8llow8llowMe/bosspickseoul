'use client'

import { useQuery } from '@tanstack/react-query'

import { ANALYSIS_PERIOD_CODE } from '@/lib/analysis/selection'
import { fetchStatusDetail } from '@/lib/api/status'
import { retryUnlessClientError } from '@/lib/api/api-error'

/** 홈 Top10 키와 같이 분기를 넣는다 — `ANALYSIS_PERIOD_CODE` 를 올리면 캐시도 갈린다(status.md 1.6). */
export const homeDistrictDetailQueryKey = (districtCode: string) =>
  ['home', 'districtDetail', ANALYSIS_PERIOD_CODE, districtCode] as const

/**
 * 히어로 지도 툴팁용 자치구 상세(full-screen-sections-and-live-tooltip.md D4-4).
 *
 * `enabled` 가 false 여도 이미 받아 둔 구는 캐시에서 바로 나온다 — 지도를 가로지를 때는
 * 요청을 미루고(호출부의 120ms), 한 번 본 구는 다시 올 때 기다리지 않는다.
 */
export const useDistrictDetail = (
  districtCode: string | null,
  enabled: boolean,
) =>
  useQuery({
    queryKey: homeDistrictDetailQueryKey(districtCode ?? ''),
    queryFn: () =>
      fetchStatusDetail(districtCode as string, ANALYSIS_PERIOD_CODE),
    enabled: enabled && districtCode != null,
    select: response => response.dataBody,
    retry: retryUnlessClientError(1),
    staleTime: 5 * 60 * 1000,
  })
