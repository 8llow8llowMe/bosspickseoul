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
      selectedCommercialCode: null,
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
      selectedCommercialCode: null,
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
      sheetSnap: 'expanded',
    })
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
      selectedCommercialCode: null,
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
