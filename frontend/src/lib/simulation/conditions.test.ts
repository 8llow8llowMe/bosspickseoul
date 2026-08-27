import { describe, expect, it } from 'vitest'

import {
  SIMULATION_CONDITION_SECTIONS,
  SIMULATION_DISTRICT_OPTIONS,
  createEmptySimulationConditionState,
  createSimulationConditionState,
  describeSimulationConditionGap,
  describeSimulationSectionValue,
  isSameSimulationReportRequest,
  isSimulationConditionsComplete,
  isSimulationSectionComplete,
  listMissingSimulationSections,
  parseStoreSizeInput,
  resolveSimulationFieldSection,
  resolveSimulationRecoverySection,
  selectBrand,
  selectDistrict,
  selectFloorType,
  selectFranchisee,
  selectService,
  selectStoreSize,
  simulationSectionDomId,
  squareMeterToPyeong,
  toSimulationReportRequest,
  type SimulationConditionState,
} from '@/lib/simulation/conditions'

const completeState = (
  overrides: Partial<SimulationConditionState> = {},
): SimulationConditionState => ({
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

describe('섹션 완료 판정', () => {
  it('단계 잠금이 없다 — 아무 섹션이나 먼저 채울 수 있다', () => {
    // 마법사를 걷어낸 뒤의 핵심 계약이다. 창업 형태가 비어 있어도 자치구는 완료로 잡힌다.
    const state = selectDistrict(createEmptySimulationConditionState(), '11740')

    expect(isSimulationSectionComplete(state, 'district')).toBe(true)
    expect(isSimulationSectionComplete(state, 'franchise')).toBe(false)
    expect(listMissingSimulationSections(state)).toEqual([
      'franchise',
      'service',
      'store',
    ])
  })

  it('프랜차이즈 여부는 false로 골라도 완료로 본다', () => {
    const state = selectFranchisee(createEmptySimulationConditionState(), false)

    expect(isSimulationSectionComplete(state, 'franchise')).toBe(true)
    expect(listMissingSimulationSections(state)).not.toContain('franchise')
  })

  it('프랜차이즈 창업은 브랜드까지 골라야 업종 섹션이 끝난다', () => {
    let state = selectFranchisee(createEmptySimulationConditionState(), true)
    state = selectDistrict(state, '11740')
    state = selectService(state, 'CS100001')

    expect(isSimulationSectionComplete(state, 'service')).toBe(false)
    expect(describeSimulationConditionGap(state)).toBe(
      '창업할 브랜드를 선택해 주세요',
    )

    state = selectBrand(state, { franchiseeId: 101, brandName: '테스트브랜드' })
    expect(isSimulationSectionComplete(state, 'service')).toBe(true)
  })

  it('개인 창업은 업종만 고르면 업종 섹션이 끝난다', () => {
    let state = selectFranchisee(createEmptySimulationConditionState(), false)
    state = selectService(state, 'CS100001')

    expect(isSimulationSectionComplete(state, 'service')).toBe(true)
  })

  it('지원하지 않는 업종 코드는 완료로 보지 않는다', () => {
    const state = selectService(
      selectFranchisee(createEmptySimulationConditionState(), false),
      'CS999999',
    )

    expect(isSimulationSectionComplete(state, 'service')).toBe(false)
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

  it('모든 섹션이 끝나면 완료다', () => {
    const state = completeState()

    expect(
      SIMULATION_CONDITION_SECTIONS.every(section =>
        isSimulationSectionComplete(state, section),
      ),
    ).toBe(true)
    expect(isSimulationConditionsComplete(state)).toBe(true)
    expect(listMissingSimulationSections(state)).toEqual([])
    expect(describeSimulationConditionGap(state)).toBeNull()
  })
})

describe('섹션 값 요약', () => {
  it('고른 값을 그대로 보여주고, 비면 null이다', () => {
    const state = completeState({
      franchisee: true,
      franchiseeId: 7,
      brandName: '아이러브피자&치킨',
      serviceCode: 'CS100007',
    })

    expect(describeSimulationSectionValue(state, 'franchise')).toBe(
      '프랜차이즈',
    )
    expect(describeSimulationSectionValue(state, 'district')).toBe('강동구')
    expect(describeSimulationSectionValue(state, 'service')).toBe(
      '치킨전문점 · 아이러브피자&치킨',
    )
    expect(describeSimulationSectionValue(state, 'store')).toBe('66㎡ · 1층')
    expect(
      describeSimulationSectionValue(
        createEmptySimulationConditionState(),
        'district',
      ),
    ).toBeNull()
  })

  it('매장 조건은 절반만 골라도 그만큼 보여준다', () => {
    const state = completeState({ floorType: null })

    expect(describeSimulationSectionValue(state, 'store')).toBe('66㎡')
    expect(
      describeSimulationSectionValue(
        completeState({ storeSize: null }),
        'store',
      ),
    ).toBe('1층')
  })
})

describe('섹션 앵커', () => {
  it('오류 배너와 요약 바가 같은 id로 스크롤한다', () => {
    expect(simulationSectionDomId('district')).toBe(
      'simulation-section-district',
    )
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
      toSimulationReportRequest(createEmptySimulationConditionState()),
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
    const state = createSimulationConditionState({
      districtCode: '11740',
      serviceCode: 'CS100001',
    })

    expect(state.districtCode).toBe('11740')
    expect(state.serviceCode).toBe('CS100001')
    expect(state.franchisee).toBeNull()
  })

  it('지원하지 않는 값은 조용히 버린다', () => {
    const state = createSimulationConditionState({
      districtCode: '99999',
      serviceCode: 'CS999999',
      storeSize: -1,
    })

    expect(state.districtCode).toBeNull()
    expect(state.serviceCode).toBeNull()
    expect(state.storeSize).toBeNull()
  })

  it('프랜차이즈면 브랜드(아이디·이름)까지 복원한다', () => {
    const state = createSimulationConditionState({
      franchisee: true,
      franchiseeId: 101,
      brandName: '테스트브랜드',
      districtCode: '11740',
      serviceCode: 'CS100001',
    })

    expect(state.franchiseeId).toBe(101)
    expect(state.brandName).toBe('테스트브랜드')
  })

  it('비프랜차이즈에 실려 온 브랜드는 버린다', () => {
    // selectFranchisee 가 형태를 바꿀 때 브랜드를 비우는 것과 같은 규칙이다.
    // 손상된 링크로 `franchisee=false&franchiseeId=101` 이 들어와도 상태가 모순되지 않게 한다.
    const state = createSimulationConditionState({
      franchisee: false,
      franchiseeId: 101,
      brandName: '테스트브랜드',
    })

    expect(state.franchiseeId).toBeNull()
    expect(state.brandName).toBeNull()
  })

  it('브랜드 아이디가 양의 정수가 아니면 버린다', () => {
    for (const franchiseeId of [0, -1, 1.5, Number.NaN]) {
      const state = createSimulationConditionState({
        franchisee: true,
        franchiseeId,
      })

      expect(state.franchiseeId).toBeNull()
    }
  })
})

describe('오류 → 되돌릴 조건', () => {
  it('임대료 없는 자치구는 자치구로, 사라진 브랜드는 업종으로 보낸다', () => {
    expect(resolveSimulationRecoverySection('SIMULATION_002')).toBe('district')
    expect(resolveSimulationRecoverySection('SIMULATION_003')).toBe('service')
    expect(resolveSimulationRecoverySection('SIMULATION_001')).toBe('service')
  })

  it('모르는 코드는 섹션을 정하지 않는다', () => {
    expect(resolveSimulationRecoverySection(null)).toBeNull()
    expect(resolveSimulationRecoverySection('COMMERCIAL_100')).toBeNull()
  })

  it('필드 오류를 섹션으로 옮긴다', () => {
    expect(resolveSimulationFieldSection('storeSize')).toBe('store')
    expect(resolveSimulationFieldSection('districtCode')).toBe('district')
    expect(resolveSimulationFieldSection('franchiseeId')).toBe('service')
    expect(resolveSimulationFieldSection('unknown')).toBeNull()
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
