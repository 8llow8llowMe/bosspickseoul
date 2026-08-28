import { describe, expect, it, vi } from 'vitest'

import type {
  CandidateCommercial,
  CandidateCommercialsResponse,
  CommercialProfile,
  CommercialProfileResponse,
  MapAreasResponse,
} from '@/types/recommend'

import {
  applyRecommendationPreviewChange,
  collectSuccessfulProfiles,
  consumeRecommendationResponse,
  createCommercialProfileQueryCombiner,
  createResultsLoadedAction,
  getRecommendationStage,
  getRecommendBookmarkLoginHref,
  handleRecommendationBookmarkToggle,
  isRecommendationBookmarkReserved,
  isRecommendationBookmarkPending,
  handleRecommendationResponseOnce,
  isRecommendationQueryBusy,
  normalizeRecommendationBasis,
  normalizeRecommendationResults,
  readAdministrations,
  readCommercials,
  readMapAreas,
  readRecommendationPeriodCode,
  releaseRecommendationBookmarkMutation,
  reserveRecommendationBookmarkMutation,
  resetHandledRecommendationMarker,
  selectResultHeadingForViewport,
  shouldApplyRecommendationBookmarkMutation,
} from './recommend-page'

const candidate = (
  rank: number,
  commercialCode: string,
): CandidateCommercial => ({
  rank,
  commercialCode,
  commercialName: `${commercialCode} 상권`,
  compositeScore: 80,
  grade: null,
  summaryLabel: null,
  selectionReason: null,
  opportunityLabel: null,
  riskLabel: null,
  metricBreakdown: [],
  reasonTags: [],
})

const successfulResponse = <T>(dataBody: T) => ({
  dataHeader: {
    success: true,
    resultCode: null,
    resultMessage: null,
  },
  dataBody,
})

describe('recommend page query orchestration helpers', () => {
  it('uses the exact recommend redirect for non-login bookmark clicks through the page handler', () => {
    const navigate = vi.fn()
    const onAuthenticatedToggle = vi.fn()

    expect(
      handleRecommendationBookmarkToggle({
        hasHydrated: true,
        isLoggedIn: false,
        navigate,
        onAuthenticatedToggle,
      }),
    ).toBe(false)
    expect(getRecommendBookmarkLoginHref()).toBe('/login?redirect=%2Frecommend')
    expect(navigate).toHaveBeenCalledWith('/login?redirect=%2Frecommend')
    expect(onAuthenticatedToggle).not.toHaveBeenCalled()
  })

  it('forwards authenticated bookmark clicks without redirecting', () => {
    const navigate = vi.fn()
    const onAuthenticatedToggle = vi.fn()

    expect(
      handleRecommendationBookmarkToggle({
        hasHydrated: true,
        isLoggedIn: true,
        navigate,
        onAuthenticatedToggle,
      }),
    ).toBe(true)
    expect(navigate).not.toHaveBeenCalled()
    expect(onAuthenticatedToggle).toHaveBeenCalledOnce()
  })

  it('does nothing and marks bookmark controls pending before auth hydration', () => {
    const navigate = vi.fn()
    const onAuthenticatedToggle = vi.fn()

    expect(
      handleRecommendationBookmarkToggle({
        hasHydrated: false,
        isLoggedIn: false,
        navigate,
        onAuthenticatedToggle,
      }),
    ).toBe(false)
    expect(navigate).not.toHaveBeenCalled()
    expect(onAuthenticatedToggle).not.toHaveBeenCalled()
    const reservations = new Map()
    reserveRecommendationBookmarkMutation(reservations, 'member-a', 'C001')
    expect(
      isRecommendationBookmarkPending(false, new Map(), null, 'C001'),
    ).toBe(true)
    expect(
      isRecommendationBookmarkPending(true, reservations, 'member-a', 'C001'),
    ).toBe(true)
    expect(
      isRecommendationBookmarkPending(true, new Map(), 'member-a', 'C001'),
    ).toBe(false)
  })

  it('releases an A reservation while B is active so A is not pending after returning', () => {
    const reservations = new Map()
    const memberAReservation = reserveRecommendationBookmarkMutation(
      reservations,
      'member-a',
      'C001',
    )
    expect(memberAReservation).not.toBeNull()
    expect(
      reserveRecommendationBookmarkMutation(reservations, 'member-a', 'C001'),
    ).toBeNull()
    expect(
      reserveRecommendationBookmarkMutation(reservations, 'member-b', 'C001'),
    ).not.toBeNull()

    releaseRecommendationBookmarkMutation(reservations, memberAReservation!)

    expect(
      isRecommendationBookmarkReserved(reservations, 'member-a', 'C001'),
    ).toBe(false)
    expect(
      isRecommendationBookmarkReserved(reservations, 'member-b', 'C001'),
    ).toBe(true)
  })

  it('does not let an older A token completion clear a newer A reservation', () => {
    const reservations = new Map()
    const older = reserveRecommendationBookmarkMutation(
      reservations,
      'member-a',
      'C001',
    )!
    expect(releaseRecommendationBookmarkMutation(reservations, older)).toBe(
      true,
    )

    const newer = reserveRecommendationBookmarkMutation(
      reservations,
      'member-a',
      'C001',
    )!
    expect(releaseRecommendationBookmarkMutation(reservations, older)).toBe(
      false,
    )
    expect(
      isRecommendationBookmarkReserved(reservations, 'member-a', 'C001'),
    ).toBe(true)
    expect(releaseRecommendationBookmarkMutation(reservations, newer)).toBe(
      true,
    )
  })

  it('applies map preview and clear events to the shared preview state', () => {
    const states: Array<string | null> = []
    const setPreview = (commercialCode: string | null) => {
      states.push(commercialCode)
    }

    applyRecommendationPreviewChange('C1', setPreview)
    applyRecommendationPreviewChange(null, setPreview)

    expect(states).toEqual(['C1', null])
  })

  it('handles the same cached response once again after edit and valid resubmit', () => {
    const handledMarker = { current: '' }

    expect(
      consumeRecommendationResponse(handledMarker, 'same-request', 123),
    ).toBe(true)
    expect(
      consumeRecommendationResponse(handledMarker, 'same-request', 123),
    ).toBe(false)

    resetHandledRecommendationMarker(handledMarker)

    expect(
      consumeRecommendationResponse(handledMarker, 'same-request', 123),
    ).toBe(true)
  })

  it('does not apply an earlier account mutation state to the current account', () => {
    expect(
      shouldApplyRecommendationBookmarkMutation('member-b', 'member-a'),
    ).toBe(false)
    expect(
      shouldApplyRecommendationBookmarkMutation('member-a', 'member-a'),
    ).toBe(true)
  })

  it('reselects rank one and focuses the visible heading exactly once per same-condition submit', () => {
    const handledMarker = { current: '' }
    const actions: unknown[] = []
    let focusCount = 0
    const input = {
      marker: handledMarker,
      requestKey: 'same-request',
      dataUpdatedAt: 123,
      results: [candidate(1, 'C1')],
      dispatch: (action: unknown) => actions.push(action),
      heading: {
        focus: () => {
          focusCount += 1
        },
      },
    }

    expect(handleRecommendationResponseOnce(input)).toBe(true)
    expect(handleRecommendationResponseOnce(input)).toBe(false)
    expect(actions).toEqual([
      {
        type: 'resultsLoaded',
        requestKey: 'same-request',
        commercialCode: 'C1',
      },
    ])
    expect(focusCount).toBe(1)

    resetHandledRecommendationMarker(handledMarker)
    expect(handleRecommendationResponseOnce(input)).toBe(true)
    expect(actions).toHaveLength(2)
    expect(focusCount).toBe(2)
  })

  it('maps criteria selection and submitted results to explicit map stages', () => {
    expect(getRecommendationStage('criteria', null)).toBe('district')
    expect(
      getRecommendationStage('criteria', {
        code: '11680',
        name: '강남구',
      }),
    ).toBe('administration')
    expect(
      getRecommendationStage(
        'criteria',
        { code: '11680', name: '강남구' },
        { code: '11680101', name: '역삼1동' },
      ),
    ).toBe('commercial')
    expect(getRecommendationStage('results', null)).toBe('results')
  })

  it('sorts recommendation rank, removes duplicate and out-of-scope codes, and caps Top 5', () => {
    const response = successfulResponse({
      serviceCode: 'CS100010',
      periodCode: '20233',
      preset: null,
      priorityMetric: null,
      topN: 5,
      summary: '',
      items: [
        candidate(4, 'C4'),
        candidate(2, 'C2'),
        candidate(1, 'C1'),
        candidate(3, 'C3'),
        candidate(2, 'C2'),
        candidate(5, 'C5'),
        candidate(6, 'C6'),
        candidate(0, 'OUTSIDE'),
        null as unknown as CandidateCommercial,
      ],
    }) satisfies CandidateCommercialsResponse

    expect(
      normalizeRecommendationResults(response, [
        'C1',
        'C2',
        'C3',
        'C4',
        'C5',
        'C6',
      ]).map(item => item.commercialCode),
    ).toEqual(['C1', 'C2', 'C3', 'C4', 'C5'])
  })

  it('treats incomplete successful map bodies as an empty collection', () => {
    const incomplete = {
      dataHeader: {
        success: true,
        resultCode: null,
        resultMessage: null,
      },
      dataBody: undefined,
    } as unknown as MapAreasResponse

    expect(readMapAreas(undefined)).toEqual([])
    expect(readMapAreas(incomplete)).toEqual([])
  })

  it('keeps valid map areas while removing malformed areas and coordinates', () => {
    const response = successfulResponse({
      areas: [
        {
          areaCode: '11680',
          areaName: '강남구',
          centerLng: 127,
          centerLat: 37.5,
          boundaryCoords: [
            [127, 37.5],
            [Number.NaN, 37.6],
            ['127', 37.7],
          ],
        },
        null,
        1,
        {
          areaCode: '11740',
          areaName: '강동구',
          centerLng: Number.POSITIVE_INFINITY,
          centerLat: 37.5,
          boundaryCoords: [],
        },
      ],
    }) as unknown as MapAreasResponse

    expect(readMapAreas(response)).toEqual([
      {
        areaCode: '11680',
        areaName: '강남구',
        centerLng: 127,
        centerLat: 37.5,
        boundaryCoords: [[127, 37.5]],
      },
    ])
  })

  it('keeps valid administrations and commercials from partially malformed arrays', () => {
    const administrations = readAdministrations(
      successfulResponse([
        {
          administrationCode: '11680101',
          administrationName: '역삼1동',
          centerLng: 127,
          centerLat: 37.5,
        },
        null,
        {
          administrationCode: '11680102',
          administrationName: '역삼2동',
          centerLng: 127,
          centerLat: Number.NaN,
        },
      ]) as never,
    )
    const commercials = readCommercials(
      successfulResponse([
        {
          commercialCode: 'C1',
          commercialName: '강남역 상권',
          commercialClassificationCode: 'A',
          commercialClassificationName: '골목상권',
          centerLng: 127,
          centerLat: 37.5,
        },
        null,
        {
          commercialCode: 'C2',
          commercialName: '잘못된 상권',
          commercialClassificationCode: 'A',
          commercialClassificationName: '골목상권',
          centerLng: Number.NaN,
          centerLat: 37.5,
        },
      ]) as never,
    )

    expect(administrations).toHaveLength(1)
    expect(administrations[0]?.administrationCode).toBe('11680101')
    expect(commercials).toHaveLength(1)
    expect(commercials[0]?.commercialCode).toBe('C1')
  })

  it('normalizes malformed recommendation tags and metric entries without dropping the valid result', () => {
    const malformedCandidate = {
      ...candidate(1, 'C1'),
      reasonTags: ['유동인구', 1, null],
      metricBreakdown: [
        null,
        {
          metricType: {
            code: 'SALES',
            name: '매출',
            description: '설명',
            scoreDescription: '점수 설명',
          },
          score: 80,
          grade: 'A',
          summaryLabel: '매출 우수',
        },
      ],
    }
    const response = successfulResponse({
      serviceCode: 'CS100010',
      periodCode: '20234',
      preset: null,
      priorityMetric: null,
      topN: 5,
      summary: '',
      items: [null, malformedCandidate],
    }) as unknown as CandidateCommercialsResponse

    expect(normalizeRecommendationResults(response, ['C1'])).toEqual([
      expect.objectContaining({
        commercialCode: 'C1',
        reasonTags: ['유동인구'],
        metricBreakdown: [
          expect.objectContaining({
            score: 80,
            summaryLabel: '매출 우수',
          }),
        ],
      }),
    ])
  })

  it('keeps blue ocean categories through recommendation normalization', () => {
    const response = successfulResponse({
      serviceCode: 'CS100001',
      periodCode: '20233',
      preset: null,
      priorityMetric: null,
      topN: 5,
      summary: '',
      items: [
        {
          ...candidate(1, 'C1'),
          blueOceanCategories: [
            null,
            {
              serviceCode: 'CS100005',
              serviceName: '여관',
              commercialStoreCount: 0,
              administrationStoreCount: 29,
              storeRate: 3.33,
            },
          ],
        },
        { ...candidate(2, 'C2'), blueOceanCategories: null },
      ],
    }) as unknown as CandidateCommercialsResponse

    expect(normalizeRecommendationResults(response, ['C1', 'C2'])).toEqual([
      expect.objectContaining({
        commercialCode: 'C1',
        blueOceanCategories: [
          {
            serviceCode: 'CS100005',
            serviceName: '여관',
            commercialStoreCount: 0,
            administrationStoreCount: 29,
            storeRate: 3.33,
          },
        ],
      }),
      expect.objectContaining({
        commercialCode: 'C2',
        blueOceanCategories: [],
      }),
    ])
  })

  it('wires the current submitted request key into resultsLoaded', () => {
    expect(
      createResultsLoadedAction('current-request', [candidate(1, 'C1')]),
    ).toEqual({
      type: 'resultsLoaded',
      requestKey: 'current-request',
      commercialCode: 'C1',
    })
  })

  it('collects only successful complete profiles and ignores partial failures', () => {
    const profile: CommercialProfile = {
      commercialCode: 'C1',
      commercialName: '첫 번째 상권',
      districtCode: '11680',
      districtName: '강남구',
      administrationCode: '11680101',
      administrationName: '역삼1동',
      centerLng: 127,
      centerLat: 37.5,
      boundaryCoords: [],
      keyMetrics: null,
    }
    const success = successfulResponse(
      profile,
    ) satisfies CommercialProfileResponse
    const failure = {
      dataHeader: {
        success: false,
        resultCode: 'PROFILE_NOT_READY',
        resultMessage: null,
      },
      dataBody: profile,
    } satisfies CommercialProfileResponse

    expect(
      collectSuccessfulProfiles(
        [
          { data: success },
          { data: failure },
          { data: undefined },
          {
            data: successfulResponse(
              null,
            ) as unknown as CommercialProfileResponse,
          },
        ],
        {
          districtCode: '11680',
          administrationCode: '11680101',
          commercialCodes: ['C1', 'C2', 'C3', 'C4'],
        },
      ),
    ).toEqual([profile])
  })

  it('normalizes profile boundaries and excludes malformed profile centers', () => {
    const validProfile = {
      commercialCode: 'C1',
      commercialName: '첫 번째 상권',
      districtCode: '11680',
      districtName: '강남구',
      administrationCode: '11680101',
      administrationName: '역삼1동',
      centerLng: 127,
      centerLat: 37.5,
      boundaryCoords: [[127, 37.5], [Number.NaN, 37.6], null],
      keyMetrics: null,
    }
    const invalidCenter = {
      ...validProfile,
      commercialCode: 'C2',
      centerLng: Number.NaN,
    }

    expect(
      collectSuccessfulProfiles(
        [
          { data: successfulResponse(validProfile) as never },
          { data: successfulResponse(invalidCenter) as never },
          { data: successfulResponse(null) as never },
        ],
        {
          districtCode: '11680',
          administrationCode: '11680101',
          commercialCodes: ['C1', 'C2', 'C3'],
        },
      ),
    ).toEqual([
      expect.objectContaining({
        commercialCode: 'C1',
        boundaryCoords: [[127, 37.5]],
      }),
    ])
  })

  it('keeps only profiles matching the submitted scope, request index, and unique commercial code', () => {
    const profile = (
      commercialCode: string,
      districtCode = '11680',
      administrationCode = '11680101',
    ) => ({
      commercialCode,
      commercialName: `${commercialCode} 상권`,
      districtCode,
      districtName: '강남구',
      administrationCode,
      administrationName: '역삼1동',
      centerLng: 127,
      centerLat: 37.5,
      boundaryCoords: [],
      keyMetrics: null,
    })
    const scope = {
      districtCode: '11680',
      administrationCode: '11680101',
      commercialCodes: ['C1', 'C2', 'C3', 'C4', 'C5', 'C1'],
    }

    expect(
      collectSuccessfulProfiles(
        [
          { data: successfulResponse(profile('C1')) as never },
          { data: successfulResponse(profile('C5')) as never },
          {
            data: successfulResponse(profile('C3', '11740')) as never,
          },
          {
            data: successfulResponse(
              profile('C4', '11680', '11680102'),
            ) as never,
          },
          { data: successfulResponse(profile('C5')) as never },
          { data: successfulResponse(profile('C1')) as never },
        ],
        scope,
      ).map(item => item.commercialCode),
    ).toEqual(['C1', 'C5'])
  })

  it('captures the current submitted profile scope and rejects stale responses from the previous scope', () => {
    const oldProfile = successfulResponse({
      commercialCode: 'OLD',
      commercialName: '이전 상권',
      districtCode: '11680',
      districtName: '강남구',
      administrationCode: '11680101',
      administrationName: '역삼1동',
      centerLng: 127,
      centerLat: 37.5,
      boundaryCoords: [],
      keyMetrics: null,
    }) as never
    const combineCurrentProfiles = createCommercialProfileQueryCombiner({
      districtCode: '11740',
      administrationCode: '11740101',
      commercialCodes: ['NEW'],
    })

    expect(combineCurrentProfiles([{ data: oldProfile }])).toEqual([])
  })

  it('treats refetching as busy and prefers a valid response period', () => {
    expect(
      isRecommendationQueryBusy({
        isPending: false,
        isFetching: true,
      }),
    ).toBe(true)
    expect(
      readRecommendationPeriodCode(
        successfulResponse({
          serviceCode: 'CS100010',
          periodCode: '20234',
          preset: null,
          priorityMetric: null,
          topN: 5,
          summary: '',
          items: [],
        }),
        '20233',
      ),
    ).toBe('20234')
    expect(
      readRecommendationPeriodCode(
        successfulResponse({
          periodCode: 'invalid',
        }) as never,
        '20233',
      ),
    ).toBe('20233')
  })

  it('focuses the visible desktop or mobile result heading', () => {
    const desktopHeading = { focus: () => undefined }
    const mobileHeading = { focus: () => undefined }

    expect(
      selectResultHeadingForViewport(true, desktopHeading, mobileHeading),
    ).toBe(desktopHeading)
    expect(
      selectResultHeadingForViewport(false, desktopHeading, mobileHeading),
    ).toBe(mobileHeading)
    expect(selectResultHeadingForViewport(true, null, mobileHeading)).toBe(
      mobileHeading,
    )
  })
})

describe('normalizeRecommendationBasis', () => {
  const wrap = (dataBody: unknown): CandidateCommercialsResponse =>
    ({
      dataHeader: { success: true, resultCode: null, resultMessage: null },
      dataBody,
    }) as unknown as CandidateCommercialsResponse

  it('프리셋·우선 지표·요약을 꺼낸다', () => {
    expect(
      normalizeRecommendationBasis(
        wrap({
          preset: {
            code: 'AGGRESSIVE_OPPORTUNITY',
            name: '공격형',
            description: '공격적 진입 프리셋입니다.',
          },
          priorityMetric: {
            code: 'OPPORTUNITY_SCORE',
            name: '기회도',
            description: '상권 기회 지표입니다.',
          },
          summary: '공격형 프리셋 기준으로 선별했습니다.',
          items: [],
        }),
      ),
    ).toEqual({
      presetName: '공격형',
      presetDescription: '공격적 진입 프리셋입니다.',
      priorityMetricName: '기회도',
      priorityMetricDescription: '상권 기회 지표입니다.',
      summary: '공격형 프리셋 기준으로 선별했습니다.',
    })
  })

  it('일부 조각만 와도 나머지는 null 로 두고 살린다', () => {
    // 기준을 못 읽는 것과 결과를 못 읽는 것은 다르다 — 순위는 그대로 써야 한다.
    expect(
      normalizeRecommendationBasis(
        wrap({ preset: { name: '공격형' }, items: [] }),
      ),
    ).toEqual({
      presetName: '공격형',
      presetDescription: null,
      priorityMetricName: null,
      priorityMetricDescription: null,
      summary: null,
    })
  })

  it('빈 문자열·공백은 값이 아니다', () => {
    expect(
      normalizeRecommendationBasis(
        wrap({ preset: { name: '   ' }, summary: '', items: [] }),
      ),
    ).toBeNull()
  })

  it('한 조각도 못 읽으면 null 이라 빈 껍데기를 렌더하지 않는다', () => {
    expect(normalizeRecommendationBasis(wrap({ items: [] }))).toBeNull()
  })

  it('프리셋이 객체가 아니어도 죽지 않는다', () => {
    expect(
      normalizeRecommendationBasis(
        wrap({ preset: '공격형', priorityMetric: null, items: [] }),
      ),
    ).toBeNull()
  })

  it('실패 응답이면 null', () => {
    expect(normalizeRecommendationBasis(null)).toBeNull()
    expect(
      normalizeRecommendationBasis({
        dataHeader: { success: false, resultCode: 'E', resultMessage: 'x' },
        dataBody: null,
      } as unknown as CandidateCommercialsResponse),
    ).toBeNull()
  })
})
