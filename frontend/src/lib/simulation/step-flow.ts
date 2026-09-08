import {
  SIMULATION_CONDITION_SECTIONS,
  isSimulationSectionComplete,
  type SimulationConditionSection,
  type SimulationConditionState,
} from '@/lib/simulation/conditions'

/**
 * 매장 조건은 업종 전이면 잠긴다. 잠긴 단계는 펼칠 수 없다.
 * 게이팅 자체는 원래 화면에도 있던 규칙이고, 여기서는 "열 수 있는가"만 판정한다.
 */
const isLocked = (
  state: SimulationConditionState,
  section: SimulationConditionSection,
): boolean => section === 'store' && state.serviceCode === null

const firstIncomplete = (
  state: SimulationConditionState,
): SimulationConditionSection | null =>
  SIMULATION_CONDITION_SECTIONS.find(
    section =>
      !isSimulationSectionComplete(state, section) && !isLocked(state, section),
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

  if (opened !== null && !isLocked(state, opened)) return opened

  return null
}
