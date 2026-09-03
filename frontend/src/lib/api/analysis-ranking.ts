import { apiClient } from '@/lib/api/client'
import type { AnalysisRankingResponse } from '@/types/status'

/**
 * 분석 인기 순위 (`GET /analysis-rankings`).
 *
 * ⚠️ **이 API 만 따로 죽는다.** 집계 파이프라인(Kafka/Redis)이 멈추면 여기만
 * `RANKING_001`(503)로 응답하고 다른 분석 API 는 영향받지 않는다(스냅샷 설명 그대로).
 * 그래서 호출부는 이 실패를 **화면 전체의 실패로 번지지 않게** 다뤄야 한다.
 *
 * ℹ️ **`COMMERCIAL` 순위는 링크 한 번에 이어지지 않는다 — 역조회를 한 번 거쳐야 한다.**
 * 응답은 `areaCode`(상권코드) 하나뿐인데 `/analysis/result` 는
 * `isCompleteAnalysisSelection` 으로 자치구·행정동·상권·업종 **4개를 전부** 요구하고,
 * `summaries/sales`·`summaries/income` 두 쿼리는 실제로 `districtCode`·
 * `administrationCode` 를 인자로 받는다.
 *
 * 상위 코드는 **`GET /regions/commercials/{commercialCode}/administration`** 이 준다
 * (`region-map.json` 스냅샷. `districtCode`·`administrationCode` 와 이름까지 함께 온다).
 * 즉 막힌 것이 아니라 **정적 `href` 로는 안 되고 클릭 시 한 번 더 부르는 설계가 된다**
 * — 목록 N개를 미리 조회하면 N+1 이므로, 붙일 때 눌린 항목만 조회할 것.
 * 홈 섹션은 그 왕복이 필요 없는 `DISTRICT` 만 쓴다(인벤토리 B4 참고).
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
