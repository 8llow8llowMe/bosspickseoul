import { describe, expect, it } from 'vitest'

import {
  SIMULATION_DISTRICT_OPTIONS,
  SIMULATION_WIZARD_STEPS,
  canOpenSimulationStep,
  createEmptySimulationWizardState,
  createSimulationWizardState,
  describeSimulationWizardGap,
  getActiveSimulationStep,
  getAdjacentSimulationStep,
  isSameSimulationReportRequest,
  isSimulationStepComplete,
  isSimulationWizardComplete,
  parseStoreSizeInput,
  resolveSimulationFieldStep,
  resolveSimulationRecoveryStep,
  selectBrand,
  selectDistrict,
  selectFloorType,
  selectFranchisee,
  selectService,
  selectStoreSize,
  squareMeterToPyeong,
  toSimulationReportRequest,
  type SimulationWizardState,
} from '@/lib/simulation/wizard'

const completeState = (
  overrides: Partial<SimulationWizardState> = {},
): SimulationWizardState => ({
  franchisee: false,
  franchiseeId: null,
  brandName: null,
  districtCode: '11740',
  serviceCode: 'CS100001',
  storeSize: 66,
  floorType: 'FIRST_FLOOR',
  ...overrides,
})

describe('SIMULATION_DISTRICT_OPTIONS', () => {
  it('자치구 25개를 문자열 코드로 제공한다', () => {
    expect(SIMULATION_DISTRICT_OPTIONS).toHaveLength(25)
    expect(
      SIMULATION_DISTRICT_OPTIONS.every(item => /^\d{5}$/.test(item.code)),
    ).toBe(true)
  })
})

describe('단계 진행', () => {
  it('앞 단계가 비면 뒤 단계를 열 수 없다', () => {
    const state = createEmptySimulationWizardState()

    expect(canOpenSimulationStep(state, 'franchise')).toBe(true)
    expect(canOpenSimulationStep(state, 'district')).toBe(false)
    expect(canOpenSimulationStep(state, 'store')).toBe(false)
  })

  it('프랜차이즈 여부는 false로 골라도 완료로 본다', () => {
    const state = selectFranchisee(createEmptySimulationWizardState(), false)

    expect(isSimulationStepComplete(state, 'franchise')).toBe(true)
    expect(getActiveSimulationStep(state)).toBe('district')
  })

  it('프랜차이즈 창업은 브랜드까지 골라야 업종 단계가 끝난다', () => {
    let state = selectFranchisee(createEmptySimulationWizardState(), true)
    state = selectDistrict(state, '11740')
    state = selectService(state, 'CS100001')

    expect(isSimulationStepComplete(state, 'service')).toBe(false)
    expect(describeSimulationWizardGap(state)).toBe(
      '창업할 브랜드를 선택해 주세요',
    )

    state = selectBrand(state, { franchiseeId: 101, brandName: '테스트브랜드' })
    expect(isSimulationStepComplete(state, 'service')).toBe(true)
  })

  it('개인 창업은 업종만 고르면 업종 단계가 끝난다', () => {
    let state = selectFranchisee(createEmptySimulationWizardState(), false)
    state = selectService(state, 'CS100001')

    expect(isSimulationStepComplete(state, 'service')).toBe(true)
  })

  it('지원하지 않는 업종 코드는 완료로 보지 않는다', () => {
    const state = selectService(
      selectFranchisee(createEmptySimulationWizardState(), false),
      'CS999999',
    )

    expect(isSimulationStepComplete(state, 'service')).toBe(false)
  })

  it('업종을 바꾸면 브랜드와 매장 크기를 함께 비운다', () => {
    let state = completeState({
      franchisee: true,
      franchiseeId: 101,
      brandName: '테스트브랜드',
    })
    state = selectService(state, 'CS100002')

    expect(state.franchiseeId).toBeNull()
    expect(state.brandName).toBeNull()
    expect(state.storeSize).toBeNull()
  })

  it('프랜차이즈 여부를 바꾸면 브랜드 선택이 사라진다', () => {
    const state = selectFranchisee(
      completeState({ franchisee: true, franchiseeId: 101, brandName: 'A' }),
      false,
    )

    expect(state.franchiseeId).toBeNull()
    expect(state.brandName).toBeNull()
  })

  it('되돌리기는 앞뒤 단계를 순서대로 준다', () => {
    expect(getAdjacentSimulationStep('service', -1)).toBe('district')
    expect(getAdjacentSimulationStep('service', 1)).toBe('store')
    expect(getAdjacentSimulationStep('franchise', -1)).toBeNull()
    expect(getAdjacentSimulationStep('store', 1)).toBeNull()
  })

  it('모든 단계가 끝나면 완료다', () => {
    const state = completeState()

    expect(
      SIMULATION_WIZARD_STEPS.every(step =>
        isSimulationStepComplete(state, step),
      ),
    ).toBe(true)
    expect(isSimulationWizardComplete(state)).toBe(true)
    expect(describeSimulationWizardGap(state)).toBeNull()
  })
})

describe('매장 크기 입력', () => {
  it('양의 정수만 통과시킨다', () => {
    expect(parseStoreSizeInput('66')).toBe(66)
    expect(parseStoreSizeInput(' 66 ')).toBe(66)
    expect(parseStoreSizeInput('66.9')).toBe(66)
    expect(parseStoreSizeInput('0')).toBeNull()
    expect(parseStoreSizeInput('-3')).toBeNull()
    expect(parseStoreSizeInput('66평')).toBeNull()
    expect(parseStoreSizeInput('')).toBeNull()
  })

  it('잘못된 크기는 상태에 남기지 않는다', () => {
    expect(selectStoreSize(completeState(), 0).storeSize).toBeNull()
    expect(selectStoreSize(completeState(), 33).storeSize).toBe(33)
  })

  it('㎡를 평으로 환산한다', () => {
    expect(squareMeterToPyeong(66)).toBe(20)
    expect(squareMeterToPyeong(36)).toBe(10.9)
  })
})

describe('요청 정규화', () => {
  it('미완성이면 요청을 만들지 않는다', () => {
    expect(
      toSimulationReportRequest(createEmptySimulationWizardState()),
    ).toBeNull()
  })

  it('비프랜차이즈면 franchiseeId 키가 없고 periodCode도 싣지 않는다', () => {
    const request = toSimulationReportRequest(completeState())

    expect(request).not.toBeNull()
    expect(Object.keys(request as object)).not.toContain('franchiseeId')
    expect(Object.keys(request as object)).not.toContain('periodCode')
    expect(request).toEqual({
      franchisee: false,
      districtCode: '11740',
      serviceCode: 'CS100001',
      storeSize: 66,
      floorType: 'FIRST_FLOOR',
    })
  })

  it('프랜차이즈면 franchiseeId를 싣는다', () => {
    const request = toSimulationReportRequest(
      completeState({
        franchisee: true,
        franchiseeId: 101,
        brandName: '테스트브랜드',
        floorType: 'OTHER',
      }),
    )

    expect(request?.franchiseeId).toBe(101)
    expect(request?.floorType).toBe('OTHER')
  })

  it('브랜드명은 요청 본문에 넣지 않는다', () => {
    const request = toSimulationReportRequest(
      completeState({ franchisee: true, franchiseeId: 7, brandName: '브랜드' }),
    )

    expect(Object.keys(request as object)).not.toContain('brandName')
  })
})

describe('초기값 복원', () => {
  it('분석에서 넘어온 자치구·업종을 채운다', () => {
    const state = createSimulationWizardState({
      districtCode: '11740',
      serviceCode: 'CS100001',
    })

    expect(state.districtCode).toBe('11740')
    expect(state.serviceCode).toBe('CS100001')
    expect(state.franchisee).toBeNull()
  })

  it('지원하지 않는 값은 조용히 버린다', () => {
    const state = createSimulationWizardState({
      districtCode: '99999',
      serviceCode: 'CS999999',
      storeSize: -1,
    })

    expect(state.districtCode).toBeNull()
    expect(state.serviceCode).toBeNull()
    expect(state.storeSize).toBeNull()
  })
})

describe('오류 → 되돌릴 단계', () => {
  it('임대료 없는 자치구는 자치구 단계로, 사라진 브랜드는 업종 단계로 보낸다', () => {
    expect(resolveSimulationRecoveryStep('SIMULATION_002')).toBe('district')
    expect(resolveSimulationRecoveryStep('SIMULATION_003')).toBe('service')
    expect(resolveSimulationRecoveryStep('SIMULATION_001')).toBe('service')
  })

  it('모르는 코드는 단계를 정하지 않는다', () => {
    expect(resolveSimulationRecoveryStep(null)).toBeNull()
    expect(resolveSimulationRecoveryStep('COMMERCIAL_100')).toBeNull()
  })

  it('필드 오류를 단계로 옮긴다', () => {
    expect(resolveSimulationFieldStep('storeSize')).toBe('store')
    expect(resolveSimulationFieldStep('districtCode')).toBe('district')
    expect(resolveSimulationFieldStep('franchiseeId')).toBe('service')
    expect(resolveSimulationFieldStep('unknown')).toBeNull()
  })
})

describe('floorType', () => {
  it('enum 값만 상태에 들어간다', () => {
    const state = selectFloorType(completeState(), 'OTHER')

    expect(state.floorType).toBe('OTHER')
  })
})

describe('isSameSimulationReportRequest', () => {
  it('조건이 같으면 결과를 계속 보여줄 수 있다고 본다', () => {
    const request = toSimulationReportRequest(completeState())

    expect(isSameSimulationReportRequest(request, request)).toBe(true)
    expect(
      isSameSimulationReportRequest(
        request,
        toSimulationReportRequest(completeState()),
      ),
    ).toBe(true)
  })

  it('조건이 하나라도 다르면 앞 결과를 내린다', () => {
    const request = toSimulationReportRequest(completeState())

    expect(
      isSameSimulationReportRequest(
        request,
        toSimulationReportRequest(completeState({ storeSize: 99 })),
      ),
    ).toBe(false)
    expect(
      isSameSimulationReportRequest(
        request,
        toSimulationReportRequest(completeState({ floorType: 'OTHER' })),
      ),
    ).toBe(false)
    expect(isSameSimulationReportRequest(request, null)).toBe(false)
    expect(isSameSimulationReportRequest(null, null)).toBe(false)
  })
})
