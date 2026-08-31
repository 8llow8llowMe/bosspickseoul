import { describe, expect, it } from 'vitest'

import {
  createInitialRecommendationState,
  createStableCommercialCodes,
  formatRecommendationPeriod,
  recommendationReducer,
  type RecommendationState,
} from './recommend-state'

const readyState = (): RecommendationState => ({
  ...createInitialRecommendationState(),
  draft: {
    district: { code: '11680', name: '강남구' },
    administration: { code: '11680101', name: '역삼1동' },
    service: { code: 'CS100010', name: '커피-음료' },
  },
})

describe('createInitialRecommendationState', () => {
  it('creates empty criteria in the expanded criteria view', () => {
    expect(createInitialRecommendationState()).toEqual({
      draft: {
        district: null,
        administration: null,
        service: null,
      },
      submitted: null,
      view: 'criteria',
      pickerStep: null,
      selectedCommercialCode: null,
      resultSelectionSource: null,
      sheetSnap: 'expanded',
    })
  })
})

describe('createStableCommercialCodes', () => {
  it('normalizes, removes empty and duplicate codes, and sorts them', () => {
    expect(
      createStableCommercialCodes(['3110012', 3110008, '', '3110012']),
    ).toEqual(['3110008', '3110012'])
  })
})

describe('recommendationReducer', () => {
  it('행정동을 고르면 업종 선택 뷰를 바로 연다 — 업종은 지도에 없다', () => {
    const state = recommendationReducer(createInitialRecommendationState(), {
      type: 'districtSelected',
      district: { code: '11680', name: '강남구' },
    })

    const next = recommendationReducer(state, {
      type: 'administrationSelected',
      administration: { code: '11680650', name: '역삼2동' },
    })

    expect(next.view).toBe('picker')
    expect(next.pickerStep).toBe('service')
    // 목록이 길어 접힌 시트에서 열면 아무것도 안 보인다.
    expect(next.sheetSnap).toBe('expanded')
  })

  it('업종을 이미 골랐으면 행정동을 바꿔도 선택 뷰를 열지 않는다', () => {
    const withService = recommendationReducer(
      recommendationReducer(createInitialRecommendationState(), {
        type: 'districtSelected',
        district: { code: '11680', name: '강남구' },
      }),
      {
        type: 'serviceSelected',
        service: { code: 'CS100010', name: '커피-음료' },
      },
    )

    const next = recommendationReducer(withService, {
      type: 'administrationSelected',
      administration: { code: '11680650', name: '역삼2동' },
    })

    expect(next.view).toBe('criteria')
    expect(next.pickerStep).toBeNull()
  })

  it('keeps the service while resetting district-dependent state', () => {
    const initial: RecommendationState = {
      ...readyState(),
      submitted: {
        district: { code: '11680', name: '강남구' },
        administration: { code: '11680101', name: '역삼1동' },
        service: { code: 'CS100010', name: '커피-음료' },
        commercialCodes: ['3110008'],
        commercialCodesKey: '3110008',
        requestKey: 'existing-request',
      },
      view: 'results',
      pickerStep: null,
      selectedCommercialCode: '3110008',
      sheetSnap: 'collapsed',
    }

    const next = recommendationReducer(initial, {
      type: 'districtSelected',
      district: { code: '11110', name: '종로구' },
    })

    expect(next).toEqual({
      draft: {
        district: { code: '11110', name: '종로구' },
        administration: null,
        service: { code: 'CS100010', name: '커피-음료' },
      },
      submitted: null,
      view: 'criteria',
      pickerStep: null,
      selectedCommercialCode: null,
      resultSelectionSource: null,
      sheetSnap: 'expanded',
    })
  })

  it('resets submitted results when the administration changes', () => {
    const initial: RecommendationState = {
      ...readyState(),
      submitted: {
        district: { code: '11680', name: '강남구' },
        administration: { code: '11680101', name: '역삼1동' },
        service: { code: 'CS100010', name: '커피-음료' },
        commercialCodes: ['3110008'],
        commercialCodesKey: '3110008',
        requestKey: 'existing-request',
      },
      view: 'results',
      pickerStep: null,
      selectedCommercialCode: '3110008',
      sheetSnap: 'collapsed',
    }

    const next = recommendationReducer(initial, {
      type: 'administrationSelected',
      administration: { code: '11680102', name: '역삼2동' },
    })

    expect(next).toMatchObject({
      draft: {
        district: { code: '11680', name: '강남구' },
        administration: { code: '11680102', name: '역삼2동' },
        service: { code: 'CS100010', name: '커피-음료' },
      },
      submitted: null,
      view: 'criteria',
      pickerStep: null,
      selectedCommercialCode: null,
      sheetSnap: 'expanded',
    })
  })

  it('returns to criteria and clears the submitted snapshot when the service changes', () => {
    const initial: RecommendationState = {
      ...readyState(),
      submitted: {
        district: { code: '11680', name: '강남구' },
        administration: { code: '11680101', name: '역삼1동' },
        service: { code: 'CS100010', name: '커피-음료' },
        commercialCodes: ['3110008'],
        commercialCodesKey: '3110008',
        requestKey: 'existing-request',
      },
      view: 'results',
      pickerStep: null,
      selectedCommercialCode: '3110008',
      sheetSnap: 'collapsed',
    }

    const next = recommendationReducer(initial, {
      type: 'serviceSelected',
      service: { code: 'CS100020', name: '한식음식점' },
    })

    expect(next.draft.service).toEqual({
      code: 'CS100020',
      name: '한식음식점',
    })
    expect(next.submitted).toBeNull()
    expect(next.view).toBe('criteria')
    expect(next.selectedCommercialCode).toBeNull()
    expect(next.sheetSnap).toBe('expanded')
  })

  it('does not submit incomplete criteria or an empty commercial list', () => {
    const incomplete = createInitialRecommendationState()
    const ready = readyState()

    expect(
      recommendationReducer(incomplete, {
        type: 'submitted',
        commercialCodes: ['3110008'],
      }),
    ).toBe(incomplete)
    expect(
      recommendationReducer(ready, {
        type: 'submitted',
        commercialCodes: ['', ''],
      }),
    ).toBe(ready)
  })

  it('creates a stable submitted snapshot only on submit', () => {
    const submitted = recommendationReducer(readyState(), {
      type: 'submitted',
      commercialCodes: ['3110012', 3110008, '3110012'],
    })

    expect(submitted.submitted).toEqual({
      district: { code: '11680', name: '강남구' },
      administration: { code: '11680101', name: '역삼1동' },
      service: { code: 'CS100010', name: '커피-음료' },
      commercialCodes: ['3110008', '3110012'],
      commercialCodesKey: '3110008,3110012',
      requestKey: JSON.stringify([
        '11680',
        '11680101',
        'CS100010',
        '3110008,3110012',
      ]),
    })
    expect(submitted.view).toBe('results')
    expect(submitted.selectedCommercialCode).toBeNull()
    expect(submitted.sheetSnap).toBe('expanded')
  })

  it('loads the first result code or null while keeping the sheet expanded', () => {
    const submitted = recommendationReducer(readyState(), {
      type: 'submitted',
      commercialCodes: ['3110008'],
    })
    const state = { ...submitted, sheetSnap: 'collapsed' as const }
    const requestKey = submitted.submitted?.requestKey ?? ''

    expect(
      recommendationReducer(state, {
        type: 'resultsLoaded',
        requestKey,
        commercialCode: '3110008',
      }),
    ).toMatchObject({
      selectedCommercialCode: '3110008',
      resultSelectionSource: 'auto',
      sheetSnap: 'expanded',
    })
    expect(
      recommendationReducer(state, {
        type: 'resultsLoaded',
        requestKey,
        commercialCode: null,
      }),
    ).toMatchObject({
      selectedCommercialCode: null,
      resultSelectionSource: 'auto',
      sheetSnap: 'expanded',
    })
  })

  // 자동 선택된 1위로 카메라를 당기면 나머지 추천이 화면 밖으로 밀린다.
  // 지도가 상권 하나로 좁혀지는 것은 사용자가 직접 골랐을 때뿐이어야 한다.
  it('marks who picked the result so the camera can tell them apart', () => {
    const state = recommendationReducer(readyState(), {
      type: 'submitted',
      commercialCodes: ['3110008', '3110009'],
    })
    const requestKey = state.submitted?.requestKey ?? ''
    const autoSelected = recommendationReducer(state, {
      type: 'resultsLoaded',
      requestKey,
      commercialCode: '3110008',
    })

    expect(autoSelected.resultSelectionSource).toBe('auto')
    expect(
      recommendationReducer(autoSelected, {
        type: 'resultSelected',
        commercialCode: '3110009',
      }).resultSelectionSource,
    ).toBe('user')
  })

  it('ignores a stale results response after returning to criteria', () => {
    const submitted = recommendationReducer(readyState(), {
      type: 'submitted',
      commercialCodes: ['3110008'],
    })
    const requestKey = submitted.submitted?.requestKey ?? ''
    const editing = recommendationReducer(submitted, {
      type: 'editRequested',
    })

    expect(
      recommendationReducer(editing, {
        type: 'resultsLoaded',
        requestKey,
        commercialCode: '3110008',
      }),
    ).toBe(editing)
  })

  it('ignores a results response for a different submitted request', () => {
    const submitted = recommendationReducer(readyState(), {
      type: 'submitted',
      commercialCodes: ['3110008'],
    })

    expect(
      recommendationReducer(submitted, {
        type: 'resultsLoaded',
        requestKey: 'stale-request',
        commercialCode: '3110008',
      }),
    ).toBe(submitted)
  })

  it('ignores a loaded result outside the submitted candidates', () => {
    const submitted = recommendationReducer(readyState(), {
      type: 'submitted',
      commercialCodes: ['3110008'],
    })

    expect(
      recommendationReducer(submitted, {
        type: 'resultsLoaded',
        requestKey: submitted.submitted?.requestKey ?? '',
        commercialCode: '9999999',
      }),
    ).toBe(submitted)
  })

  it('selects a result in collapsed mode without changing the submitted snapshot', () => {
    const submitted = recommendationReducer(readyState(), {
      type: 'submitted',
      commercialCodes: ['3110008', '3110012'],
    })
    const snapshot = structuredClone(submitted.submitted)

    const selected = recommendationReducer(submitted, {
      type: 'resultSelected',
      commercialCode: '3110012',
    })

    expect(selected.selectedCommercialCode).toBe('3110012')
    expect(selected.sheetSnap).toBe('collapsed')
    expect(selected.submitted).toEqual(snapshot)
  })

  it('ignores result selection in criteria or outside submitted candidates', () => {
    const criteria = readyState()
    const submitted = recommendationReducer(criteria, {
      type: 'submitted',
      commercialCodes: ['3110008'],
    })

    expect(
      recommendationReducer(criteria, {
        type: 'resultSelected',
        commercialCode: '3110008',
      }),
    ).toBe(criteria)
    expect(
      recommendationReducer(submitted, {
        type: 'resultSelected',
        commercialCode: '9999999',
      }),
    ).toBe(submitted)
  })

  it('copies submitted options and codes into an independent snapshot', () => {
    const district = { code: '11680', name: '강남구' }
    const administration = { code: '11680101', name: '역삼1동' }
    const service = { code: 'CS100010', name: '커피-음료' }
    const commercialCodes = ['3110008']
    const draft: RecommendationState = {
      ...createInitialRecommendationState(),
      draft: { district, administration, service },
    }

    const submitted = recommendationReducer(draft, {
      type: 'submitted',
      commercialCodes,
    })

    expect(submitted.submitted?.district).not.toBe(district)
    expect(submitted.submitted?.administration).not.toBe(administration)
    expect(submitted.submitted?.service).not.toBe(service)
    expect(submitted.submitted?.commercialCodes).not.toBe(commercialCodes)

    district.name = '변경된 자치구'
    administration.name = '변경된 행정동'
    service.name = '변경된 업종'
    commercialCodes[0] = '9999999'

    expect(submitted.submitted).toMatchObject({
      district: { code: '11680', name: '강남구' },
      administration: { code: '11680101', name: '역삼1동' },
      service: { code: 'CS100010', name: '커피-음료' },
      commercialCodes: ['3110008'],
    })
  })

  it('returns to expanded criteria while keeping the draft on edit', () => {
    const submitted = recommendationReducer(readyState(), {
      type: 'submitted',
      commercialCodes: ['3110008'],
    })
    const selected = recommendationReducer(submitted, {
      type: 'resultSelected',
      commercialCode: '3110008',
    })

    expect(recommendationReducer(selected, { type: 'editRequested' })).toEqual({
      draft: readyState().draft,
      submitted: null,
      view: 'criteria',
      pickerStep: null,
      selectedCommercialCode: null,
      resultSelectionSource: null,
      sheetSnap: 'expanded',
    })
  })

  it('updates the sheet snap in both criteria and results', () => {
    const criteria = readyState()
    const results = recommendationReducer(criteria, {
      type: 'submitted',
      commercialCodes: ['3110008'],
    })

    expect(
      recommendationReducer(criteria, {
        type: 'sheetSnapChanged',
        snap: 'collapsed',
      }),
    ).toEqual({ ...criteria, sheetSnap: 'collapsed' })
    expect(
      recommendationReducer(results, {
        type: 'sheetSnapChanged',
        snap: 'collapsed',
      }),
    ).toEqual({ ...results, sheetSnap: 'collapsed' })
  })
})

describe('formatRecommendationPeriod', () => {
  it('formats a valid quarter period code', () => {
    expect(formatRecommendationPeriod('20233')).toBe('2023년 3분기 기준')
  })

  it('keeps an invalid period code without implying a valid quarter', () => {
    expect(formatRecommendationPeriod('unknown')).toBe('unknown 기준')
  })
})

// URL 로 복원한 행정동은 이름을 모른 채 들어온다. 목록이 오면 이름만 채운다.
describe('administrationNameResolved', () => {
  const seeded = () =>
    recommendationReducer(
      createInitialRecommendationState({
        district: { code: '11680', name: '강남구' },
        administration: { code: '11680640', name: '' },
        service: { code: 'CS100001', name: '한식음식점' },
      }),
      { type: 'submitted', commercialCodes: ['3110008', '3110009'] },
    )

  /**
   * 가장 중요한 성질이다. `administrationSelected` 와 합쳤다면 링크로 들어온 결과
   * 화면이 이름이 도착하는 순간 조건 화면으로 되돌아간다.
   */
  it('이름만 채우고 제출·화면 단계를 버리지 않는다', () => {
    const before = seeded()
    const after = recommendationReducer(before, {
      type: 'administrationNameResolved',
      administration: { code: '11680640', name: '역삼1동' },
    })

    expect(after.draft.administration).toEqual({
      code: '11680640',
      name: '역삼1동',
    })
    expect(after.view).toBe('results')
    // 제출 자체는 살아 있다 — 이름만 채워지고 재요청 키는 그대로다.
    expect(after.submitted?.requestKey).toBe(before.submitted?.requestKey)
    expect(after.submitted?.commercialCodes).toEqual(
      before.submitted?.commercialCodes,
    )
  })

  it('그 사이 다른 행정동을 골랐으면 낡은 이름을 버린다', () => {
    const other = recommendationReducer(seeded(), {
      type: 'administrationSelected',
      administration: { code: '11680700', name: '세곡동' },
    })

    expect(
      recommendationReducer(other, {
        type: 'administrationNameResolved',
        administration: { code: '11680640', name: '역삼1동' },
      }),
    ).toBe(other)
  })
})

// 결과 헤더는 draft 가 아니라 submitted 를 읽는다. draft 만 채우면 칩이 빈 채로 남는다.
describe('administrationNameResolved — submitted 도 채운다', () => {
  it('제출된 조건의 행정동 이름도 함께 채운다', () => {
    const submittedState = recommendationReducer(
      createInitialRecommendationState({
        district: { code: '11680', name: '강남구' },
        administration: { code: '11680640', name: '' },
        service: { code: 'CS100001', name: '한식음식점' },
      }),
      { type: 'submitted', commercialCodes: ['3110008'] },
    )

    expect(submittedState.submitted?.administration.name).toBe('')

    const resolved = recommendationReducer(submittedState, {
      type: 'administrationNameResolved',
      administration: { code: '11680640', name: '역삼1동' },
    })

    expect(resolved.submitted?.administration.name).toBe('역삼1동')
    expect(resolved.draft.administration?.name).toBe('역삼1동')
    // requestKey 는 코드로 만들어지므로 이름이 채워져도 재요청이 일어나지 않는다.
    expect(resolved.submitted?.requestKey).toBe(
      submittedState.submitted?.requestKey,
    )
  })
})

// 리듀서가 매번 새 객체를 만들면, 이 값을 deps 로 쓰는 이펙트가 dispatch 를 되풀이해
// 렌더 루프에 빠진다. 백엔드가 행정동 이름을 빈 문자열로 주면 실제로 그 경로를 탄다.
describe('administrationNameResolved — 렌더 루프 방어', () => {
  const seeded = createInitialRecommendationState({
    district: { code: '11680', name: '강남구' },
    administration: { code: '11680640', name: '역삼1동' },
    service: null,
  })

  it('이름이 같으면 같은 상태를 그대로 돌려준다', () => {
    expect(
      recommendationReducer(seeded, {
        type: 'administrationNameResolved',
        administration: { code: '11680640', name: '역삼1동' },
      }),
    ).toBe(seeded)
  })

  it('이름이 실제로 바뀔 때만 새 상태를 만든다', () => {
    expect(
      recommendationReducer(seeded, {
        type: 'administrationNameResolved',
        administration: { code: '11680640', name: '역삼일동' },
      }),
    ).not.toBe(seeded)
  })
})
