import { apiClient } from '@/lib/api/client'
import type { AnalysisRankingResponse } from '@/types/status'

/**
 * 분석 인기 순위 (`GET /analysis-rankings`).
 *
 * ⚠️ **이 API 만 따로 죽는다.** 집계 파이프라인(Kafka/Redis)이 멈추면 여기만
 * `RANKING_001`(503)로 응답하고 다른 분석 API 는 영향받지 않는다(스냅샷 설명 그대로).
 * 그래서 호출부는 이 실패를 **화면 전체의 실패로 번지지 않게** 다뤄야 한다.
 *
 * ⚠️ **`COMMERCIAL` 순위는 아직 누를 곳을 만들 수 없다.** 응답은 `areaCode`(상권코드)
 * 하나뿐인데 `/analysis/result` 는 `isCompleteAnalysisSelection` 으로 자치구·행정동·
 * 상권·업종 **4개를 전부** 요구하고, `summaries/sales`·`summaries/income` 두 쿼리는
 * 실제로 `districtCode`·`administrationCode` 를 인자로 받는다. 상권코드에서 상위
 * 코드를 얻는 역조회 엔드포인트가 BE 에 없다 — 생기기 전까지 `DISTRICT` 만 쓴다.
 *
 * ⚠️ **`/status?district=` 는 목적지로 쓸 수 없다.** `normalizeStatusSelection` 이
 * 「현재 지표의 top-10」에 없는 코드를 버리고, 상세도 `selectedItem !== null` 로
 * 게이트돼 있다. 조회수 상위 자치구가 그 top-10 밖이면 눌러도 아무것도 안 열린다.
 * 그래서 홈 섹션은 `/analysis?districtCode=` 로 보낸다(25개 자치구 모두 유효).
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
