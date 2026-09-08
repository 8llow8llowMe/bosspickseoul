import { describe, expect, it } from 'vitest'

import {
  SIMULATION_CONDITION_SECTIONS,
  createSimulationConditionState,
} from '@/lib/simulation/conditions'
import { resolveOpenSection } from '@/lib/simulation/step-flow'

const state = (
  over: Parameters<typeof createSimulationConditionState>[0] = {},
) => createSimulationConditionState(over)

describe('resolveOpenSection', () => {
  it('빈 상태면 첫 단계를 연다', () => {
    expect(resolveOpenSection(state(), null)).toBe('franchise')
  })

  it('앞이 채워져 있으면 첫 미완료 단계를 연다 — 프리필과 복원이 같은 경로다', () => {
    expect(
      resolveOpenSection(
        state({ franchisee: false, districtCode: '11680' }),
        null,
      ),
    ).toBe('service')
  })

  it('전부 완료면 열지 않는다 — 결과로 시선을 넘긴다', () => {
    const complete = state({
      franchisee: false,
      districtCode: '11680',
      serviceCode: 'CS100001',
      storeSize: 66,
      floorType: 'FIRST_FLOOR',
    })

    expect(resolveOpenSection(complete, null)).toBeNull()
  })

  /*
    사용자가 완료된 단계를 직접 눌러 편집 중이면 그 의사를 이긴다.
    이게 없으면 재편집 화면이 열자마자 닫힌다.
  */
  it('사용자가 연 단계가 아직 유효하면 그대로 둔다', () => {
    const complete = state({
      franchisee: false,
      districtCode: '11680',
      serviceCode: 'CS100001',
      storeSize: 66,
      floorType: 'FIRST_FLOOR',
    })

    expect(resolveOpenSection(complete, 'district')).toBe('district')
  })

  /*
    selectService 가 storeSize 를 비운다. 접힌 화면에서는 그 빈칸이 안 보이므로
    비워진 첫 단계를 강제로 연다 — 사용자가 연 단계보다 우선한다.
  */
  it('앞을 고쳐 뒤가 비워지면 비워진 단계를 연다', () => {
    const broken = state({
      franchisee: false,
      districtCode: '11680',
      serviceCode: 'CS100001',
      storeSize: null,
      floorType: 'FIRST_FLOOR',
    })

    expect(resolveOpenSection(broken, 'service')).toBe('store')
  })

  /*
    resolveOpenSection 은 잠금을 따로 검사하지 않는다. 업종 전 매장 조건이 열리지
    않는 이유는 순회 순서가 service 를 먼저 잡기 때문이다. 이 순서가 깨지면 잠긴
    단계가 펼쳐지므로 여기서 못박는다.
  */
  it('업종이 매장 조건보다 앞에 온다 — 잠금이 순서로 보장된다', () => {
    const order = SIMULATION_CONDITION_SECTIONS

    expect(order.indexOf('service')).toBeLessThan(order.indexOf('store'))
  })
})
