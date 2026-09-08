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
 * 첫 입력 · 분석에서 넘어온 프리필 · 이력 복원 · 재편집 · 무효화 연쇄를 **한 규칙으로**
 * 처리한다: 「비어 있는 첫 단계를 연다. 없으면 사용자가 연 단계를 존중하고, 그것도
 * 없으면 닫는다.」
 *
 * 비어 있는 단계가 사용자 의사를 이기는 것이 핵심이다. selectService 가 storeSize 를
 * 비우는데(업종별 값이라 남기면 근거 없는 입력이 된다) 접힌 화면에서는 그 빈칸이
 * 보이지 않는다. 강제로 열지 않으면 "다 골랐다"고 믿는 채로 미완성 상태가 된다.
 *
 * @param opened 사용자가 직접 펼친 단계. 없으면 null.
 */
export const resolveOpenSection = (
  state: SimulationConditionState,
  opened: SimulationConditionSection | null,
): SimulationConditionSection | null => {
  const gap = firstIncomplete(state)
  if (gap !== null) return gap

  if (opened !== null) return opened

  return null
}
