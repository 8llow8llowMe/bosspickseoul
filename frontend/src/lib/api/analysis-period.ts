import { apiClient } from '@/lib/api/client'
import type { AnalysisPeriodCatalogResponse } from '@/types/analysis-period'

/** 분석 기준 분기 카탈로그(period-catalog.md D3-1). BFF catch-all 이 `/api/v1` 을 붙인다. */
export const ANALYSIS_PERIOD_CATALOG_PATH = '/commercials/periods'

export const fetchAnalysisPeriods = async () => {
  const response = await apiClient.get<AnalysisPeriodCatalogResponse>(
    ANALYSIS_PERIOD_CATALOG_PATH,
  )
  return response.data
}
