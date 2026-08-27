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
 */
export const simulationReportQueryKey = (
  request: SimulationReportRequest,
): readonly unknown[] => {
  const params = toSimulationReportSearchParams(request)
  params.sort()
  return [SIMULATION_REPORT_QUERY_SCOPE, params.toString()]
}
