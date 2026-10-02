'use client'

import { resolveAnalysisPeriod } from '@/lib/analysis/period-catalog'
import {
  useAnalysisPeriodCatalog,
  type AnalysisPeriodCatalogState,
} from '@/hooks/use-analysis-period-catalog'

export type ResolvedAnalysisPeriod = {
  /** 요청에 쓸 분기. null 이면 아직 정할 수 없다 — 분기 종속 쿼리를 열지 않는다. */
  periodCode: string | null
  catalog: AnalysisPeriodCatalogState
}

/**
 * URL 분기 + 카탈로그 → 요청에 쓸 분기(period-catalog.md D5-1).
 *
 * URL 분기가 있으면 카탈로그를 기다리지 않는다. 없으면 카탈로그의 최신 분기가 올 때까지 null 이다.
 */
export const useResolvedAnalysisPeriod = (
  urlPeriod: string | null,
): ResolvedAnalysisPeriod => {
  const catalog = useAnalysisPeriodCatalog()
  return {
    periodCode: resolveAnalysisPeriod(urlPeriod, catalog.range),
    catalog,
  }
}
