import { apiClient } from '@/lib/api/client'
import type { AnalysisRankingResponse } from '@/types/status'

/**
 * 분석 인기 순위 (`GET /analysis-rankings`).
 *
 * ⚠️ **이 API 만 따로 죽는다.** 집계 파이프라인(Kafka/Redis)이 멈추면 여기만
 * `RANKING_001`(503)로 응답하고 다른 분석 API 는 영향받지 않는다(스냅샷 설명 그대로).
 * 그래서 호출부는 이 실패를 **화면 전체의 실패로 번지지 않게** 다뤄야 한다.
 */
export const fetchAnalysisRankings = async (
  areaType: 'COMMERCIAL' | 'DISTRICT' | 'ADMINISTRATION',
  size: number,
) => {
  const response = await apiClient.get<AnalysisRankingResponse>(
    `/analysis-rankings?areaType=${areaType}&size=${size}`,
  )

  return response.data
}
