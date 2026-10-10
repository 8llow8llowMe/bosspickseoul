import { describe, expect, it } from 'vitest'

import {
  describeSimulationCalculateLabel,
  describeSimulationCalculationStatus,
  shouldAutoCalculate,
  simulationConditionKey,
} from '@/lib/simulation/auto-calculate'
import { createSimulationConditionState } from '@/lib/simulation/conditions'

const COMPLETE = createSimulationConditionState({
  franchisee: false,
  districtCode: '11680',
  serviceCode: 'CS100001',
  storeSize: 66,
  floorType: 'FIRST_FLOOR',
})

/** #604 — 조건이 모두 정해지면 자동 계산하되, 같은 조건으로는 두 번 보내지 않는다. */
describe('simulationConditionKey', () => {
  it('미완성 조건은 키가 없다 — 자동 계산 대상이 아니다', () => {
    expect(simulationConditionKey({ ...COMPLETE, floorType: null })).toBeNull()
  })

  it('같은 계산이면 같은 키다 — 표시용 브랜드명은 보지 않는다', () => {
    const franchise = createSimulationConditionState({
      ...COMPLETE,
      franchisee: true,
      franchiseeId: 7,
      brandName: '테스트브랜드',
    })

    expect(simulationConditionKey(franchise)).toBe(
      simulationConditionKey({ ...franchise, brandName: null }),
    )
  })

  it('계산에 들어가는 값이 하나라도 다르면 다른 키다', () => {
    const base = simulationConditionKey(COMPLETE)

    expect(
      simulationConditionKey({ ...COMPLETE, floorType: 'OTHER' }),
    ).not.toBe(base)
    expect(simulationConditionKey({ ...COMPLETE, storeSize: 67 })).not.toBe(
      base,
    )
    expect(
      simulationConditionKey({ ...COMPLETE, districtCode: '11440' }),
    ).not.toBe(base)
  })
})

describe('shouldAutoCalculate', () => {
  const key = simulationConditionKey(COMPLETE)
  const ready = {
    conditionKey: key,
    lastRequestedKey: null,
    openSection: null,
    isPending: false,
  }

  it('조건이 다 정해지고 펼친 단계가 없으면 계산한다', () => {
    expect(shouldAutoCalculate(ready)).toBe(true)
  })

  it('마지막으로 보낸 조건과 같으면 다시 보내지 않는다 — 중복 요청 방지', () => {
    expect(shouldAutoCalculate({ ...ready, lastRequestedKey: key })).toBe(false)
  })

  it('조건이 남았으면 계산하지 않는다', () => {
    expect(shouldAutoCalculate({ ...ready, conditionKey: null })).toBe(false)
  })

  it('면적을 치는 중(매장 조건이 펼쳐짐)에는 계산하지 않는다 — 66 이 6 에서 나가지 않게', () => {
    expect(shouldAutoCalculate({ ...ready, openSection: 'store' })).toBe(false)
  })

  it('요청 중이면 기다린다', () => {
    expect(shouldAutoCalculate({ ...ready, isPending: true })).toBe(false)
  })
})

describe('describeSimulationCalculationStatus', () => {
  it('계산 중·완료를 문장으로 알리고, 실패·결과 없음은 비운다(실패는 오류 안내의 alert 가 읽는다)', () => {
    expect(
      describeSimulationCalculationStatus({
        isPending: true,
        totalPrice: null,
      }),
    ).toBe('고른 조건으로 예상 창업 비용을 계산하고 있어요')
    expect(
      describeSimulationCalculationStatus({
        isPending: false,
        totalPrice: 23_450,
      }),
    ).toBe('예상 총 창업 비용 2억 3,450만원')
    expect(
      describeSimulationCalculationStatus({
        isPending: false,
        totalPrice: null,
      }),
    ).toBe('')
  })
})

describe('describeSimulationCalculateLabel', () => {
  it('지금 조건으로 이미 보냈으면 「다시 계산」, 아니면 「계산하기」다', () => {
    expect(describeSimulationCalculateLabel(true)).toBe('다시 계산')
    expect(describeSimulationCalculateLabel(false)).toBe('계산하기')
  })
})
