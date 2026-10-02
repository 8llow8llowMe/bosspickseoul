'use client'

import { useQuery } from '@tanstack/react-query'

import { fetchAnalysisPeriods } from '@/lib/api/analysis-period'
import { retryUnlessClientError } from '@/lib/api/api-error'
import { getResponseBody } from '@/lib/api/response'
import {
  readCatalogLatest,
  toAnalysisPeriodRange,
  type AnalysisPeriodRange,
} from '@/lib/analysis/period-catalog'

export const ANALYSIS_PERIOD_CATALOG_QUERY_KEY = [
  'analysis',
  'periods',
] as const

/** BE 가 5분마다 다시 계산한다. 그보다 자주 묻지 않는다(D2-1). */
export const ANALYSIS_PERIOD_CATALOG_STALE_TIME = 5 * 60 * 1000

/**
 * 기동 직후 카탈로그가 없으면 503(`ANALYSIS_PERIOD_001`)이다. 첫 계산은 수 초 안에 끝나므로 1s·2s·4s
 * 로 세 번 더 묻는다(D5-3). 4xx 는 다시 물어도 같아 묻지 않는다.
 */
export const analysisPeriodCatalogRetry = retryUnlessClientError(3)
export const analysisPeriodCatalogRetryDelay = (attempt: number) =>
  1000 * 2 ** attempt

export type AnalysisPeriodCatalogState = {
  /** 드롭다운 범위. 대기·실패·`defaultPeriodCode: null` 이면 null. */
  range: AnalysisPeriodRange | null
  /** 서버 기본 분기(= 「최신」). */
  latest: string | null
  isPending: boolean
  /** 최종 실패이거나 서버가 기본 분기를 정하지 못했다. */
  isUnavailable: boolean
  /** 다시 묻는 중인가 — 재시도 버튼이 눌렸다는 것을 보여 준다. */
  isFetching: boolean
  refetch: () => void
}

/**
 * 분석 기준 분기 카탈로그(period-catalog.md D3-1). 여러 화면이 같은 키를 써 한 번만 부른다.
 */
export const useAnalysisPeriodCatalog = (): AnalysisPeriodCatalogState => {
  const query = useQuery({
    queryKey: ANALYSIS_PERIOD_CATALOG_QUERY_KEY,
    queryFn: fetchAnalysisPeriods,
    staleTime: ANALYSIS_PERIOD_CATALOG_STALE_TIME,
    retry: analysisPeriodCatalogRetry,
    retryDelay: analysisPeriodCatalogRetryDelay,
  })

  const latest = readCatalogLatest(getResponseBody(query.data))
  const range = toAnalysisPeriodRange(latest)

  return {
    range,
    latest: range?.latest ?? null,
    isPending: query.isPending,
    isUnavailable: !query.isPending && range === null,
    isFetching: query.isFetching,
    refetch: () => void query.refetch(),
  }
}
