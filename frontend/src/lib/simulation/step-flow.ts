import {
  SIMULATION_CONDITION_SECTIONS,
  isSimulationSectionComplete,
  type SimulationConditionSection,
  type SimulationConditionState,
} from '@/lib/simulation/conditions'

/*
  잠긴 단계(업종 전 매장 조건)를 따로 걸러내지 않는다. store 에 닿으려면 service 가
  완료여야 하고, service 의 완료 조건이 serviceCode 를 요구하므로 그 시점엔 이미
  잠금이 풀려 있다. 이 정확성은 SIMULATION_CONDITION_SECTIONS 에서 service 가
  store 보다 앞선다는 데 기댄다 — 아래 테스트가 그 순서를 지킨다.
*/
const firstIncomplete = (
  state: SimulationConditionState,
): SimulationConditionSection | null =>
  SIMULATION_CONDITION_SECTIONS.find(
    section => !isSimulationSectionComplete(state, section),
  ) ?? null

/**
 * 어느 단계를 펼칠 것인가. 화면·React 를 모르는 순수 함수다.
 *
 * **사용자가 연 단계가 이긴다.** 호출부가 선택할 때마다 `opened` 를 비우므로,
 * 선택 직후에는 자연히 「비어 있는 첫 단계」가 잡힌다 — 자동 진행과 무효화 연쇄
 * 노출이 그 한 규칙에서 함께 나온다.
 *
 * gap 을 사용자 의사보다 앞세우면 안 된다. 그러면 뒤가 비어 있는 동안 앞 단계의
 * 「변경」이 눌러도 아무 일이 없는 죽은 컨트롤이 된다.
 *
 * @param opened 사용자가 직접 펼친 단계. 없으면 null.
 */
export const resolveOpenSection = (
  state: SimulationConditionState,
  opened: SimulationConditionSection | null,
): SimulationConditionSection | null => {
  if (opened !== null) return opened

  return firstIncomplete(state)
}
