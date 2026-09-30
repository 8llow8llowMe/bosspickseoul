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
 * — 목록 N개를 미리 조회하면 N+1 이므로 눌린 항목만 조회한다.
 *
 * 지금 세 곳이 이 API 를 쓴다.
 * - 홈 「지금 많이 본 지역」: 왕복이 필요 없는 `DISTRICT`
 * - `/analysis` 1단계 「지금 많이 본 상권」: `COMMERCIAL` + 눌린 항목 역조회
 *   (`components/analysis/popular-commercials-shortcut.tsx`, 인벤토리 B4)
 * - `/recommend` 조건 뷰 「실시간 많이 본 상권」 띠: `COMMERCIAL`, 표시만(역조회 없음)
 *   (`components/recommend/recommend-live-popular.tsx`)
 *
 * 홈 섹션은 `/analysis?districtCode=` 로 보낸다(25개 자치구 모두 유효). 이 결정을 할
 * 때는 `/status?district=` 가 「현재 지표 Top10」 밖 코드를 버려서 목적지로 쓸 수
 * 없었다. 2026-09-30 부터는 25개 구 모두 유효하다(status.md 1.2) — 목적지를 바꿀지는
 * 별도 판단이다. 「많이 본 지역」을 눌러 기대하는 건 분석이라 지금은 그대로 둔다.
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
