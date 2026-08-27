/**
 * 리포트 계산의 **React Query 캐시 키**.
 *
 * 별도 모듈인 이유: 입력 화면(`useMutation` 성공 시 캐시 시딩)과 리포트 화면(`useQuery`)이
 * 반드시 **같은 키**를 만들어야 재호출 없이 이어진다. 키 만드는 코드가 두 벌이 되는 순간
 * 리포트 화면이 이미 계산된 결과를 두고 다시 POST 한다.
 */

import { toSimulationReportSearchParams } from '@/lib/simulation/report-route'
import type { SimulationReportRequest } from '@/types/simulation'

export const SIMULATION_REPORT_QUERY_SCOPE = 'simulation-report'

/**
 * 조건을 정렬된 쿼리스트링 문자열 하나로 눌러 키를 만든다.
 * 객체를 그대로 키에 넣으면 `franchiseeId` 키의 유무(undefined vs 없음)로 키가 갈릴 수 있다.
 *
 * ⚠️ 이 키는 `periodCode` 를 담지 않는다 — `toSimulationReportSearchParams` 가 싣지 않기 때문이다.
 *    오늘은 아무도 `periodCode` 를 보내지 않아 무해하지만, 분기를 조건으로 노출하게 되면
 *    **키에도 반드시 함께 넣어야 한다.** 안 그러면 다른 분기의 결과가 재사용된다.
 */
export const simulationReportQueryKey = (
  request: SimulationReportRequest,
): readonly unknown[] => {
  const params = toSimulationReportSearchParams(request)
  params.sort()
  return [SIMULATION_REPORT_QUERY_SCOPE, params.toString()]
}

export const SIMULATION_COMPARE_QUERY_SCOPE = 'simulation-compare'

/**
 * A/B 비교의 캐시 키. **단일 리포트 키의 직렬화를 그대로 두 번 쓴다.**
 *
 * 비교 키를 따로 직렬화하면 "같은 조건"의 정의가 두 벌이 된다 — 단일 리포트 화면은 캐시를
 * 맞히는데 비교 화면은 빗나가는 식으로 어긋나고, 그건 화면을 봐서는 알 수 없는 종류의 어긋남이다.
 *
 * 좌우는 **자리로 구분한다.** 왼쪽·오른쪽을 맞바꾼 URL 은 같은 비교가 아니다 — 화면이
 * `A안`/`B안` 라벨과 미러 막대의 좌우를 그 순서로 그리기 때문이다.
 */
export const simulationComparePairQueryKey = (
  left: SimulationReportRequest,
  right: SimulationReportRequest,
): readonly unknown[] => [
  SIMULATION_COMPARE_QUERY_SCOPE,
  simulationReportQueryKey(left)[1],
  simulationReportQueryKey(right)[1],
]
