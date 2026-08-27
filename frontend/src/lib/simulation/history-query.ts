/**
 * 저장 이력 조회의 **React Query 캐시 스코프**.
 *
 * 별도 모듈인 이유는 `report-query.ts`와 같다: 저장 버튼(무효화)과 목록 화면(조회)이
 * 같은 키 접두사를 써야 저장 직후 목록이 갱신된다. 두 곳에서 각각 문자열을 적으면
 * 한쪽만 바뀌어도 "저장했는데 목록에 없다"가 조용히 생긴다.
 */

export const SIMULATION_HISTORY_QUERY_SCOPE = 'simulation-histories'

export const simulationHistoriesQueryKey = (
  page: number,
  size: number,
): readonly unknown[] => [SIMULATION_HISTORY_QUERY_SCOPE, page, size]
