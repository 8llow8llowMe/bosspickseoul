import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '@/lib/api/client'
import {
  buildRecommendationSearchParams,
  clampRecommendationTopN,
  fetchAdministrations,
  fetchCommercialMapAreas,
  fetchCommercialRecommendations,
  RECOMMENDATION_TOP_N,
  RECOMMENDATION_TOP_N_MAX,
  RECOMMENDATION_TOP_N_MIN,
} from './recommend'

describe('buildRecommendationSearchParams', () => {
  it('serializes commercial codes as repeated keys without brackets', () => {
    expect(
      buildRecommendationSearchParams({
        serviceCode: 'CS100010',
        commercialCodes: ['3110008', '3110012'],
        periodCode: '20233',
        topN: 5,
      }).toString(),
    ).toBe(
      'serviceCode=CS100010&commercialCodes=3110008&commercialCodes=3110012&periodCode=20233&topN=5',
    )
  })

  /* 추천은 기간을 조건으로 받지 않는다 — 생략해 서버가 최신 분기로 해석한다(period-catalog.md D4-5). */
  it('omits periodCode when none is given so the server resolves the latest', () => {
    const params = buildRecommendationSearchParams({
      serviceCode: 'CS100010',
      commercialCodes: ['3110008'],
      topN: 5,
    })
    expect(params.has('periodCode')).toBe(false)
  })

  it('clamps topN into the range the backend accepts', () => {
    // 5~30을 벗어나면 백엔드가 400(COMMERCIAL_101)로 거절한다.
    expect(clampRecommendationTopN(1)).toBe(RECOMMENDATION_TOP_N_MIN)
    expect(clampRecommendationTopN(100)).toBe(RECOMMENDATION_TOP_N_MAX)
    expect(clampRecommendationTopN(12.7)).toBe(12)
    expect(clampRecommendationTopN(Number.NaN)).toBe(RECOMMENDATION_TOP_N)
    expect(clampRecommendationTopN(undefined)).toBe(RECOMMENDATION_TOP_N)

    expect(
      buildRecommendationSearchParams({
        serviceCode: 'CS100010',
        commercialCodes: ['3110008'],
        periodCode: '20233',
        topN: 50,
      }).get('topN'),
    ).toBe('30')
  })
})

describe('recommend API', () => {
  afterEach(() => vi.restoreAllMocks())

  it('uses the new district administration endpoint', async () => {
    const response = {
      dataHeader: { success: true, resultCode: null, resultMessage: null },
      dataBody: [],
    }
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue({ data: response })

    await fetchAdministrations('11680')

    expect(get).toHaveBeenCalledWith('/regions/districts/11680/administrations')
  })

  it('requests commercial polygons for the current viewport bounds', async () => {
    const response = {
      dataHeader: { success: true, resultCode: null, resultMessage: null },
      dataBody: { areas: [] },
    }
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue({ data: response })

    await fetchCommercialMapAreas({
      lngSW: 126.9,
      latSW: 37.45,
      lngNE: 127.1,
      latNE: 37.7,
    })

    expect(get).toHaveBeenCalledWith(
      '/map/commercials?lngSW=126.9&latSW=37.45&lngNE=127.1&latNE=37.7',
    )
  })

  it('sends the strict commercial code scope to by-service', async () => {
    const response = {
      dataHeader: { success: true, resultCode: null, resultMessage: null },
      dataBody: {
        serviceCode: 'CS100010',
        periodCode: '20233',
        preset: null,
        priorityMetric: null,
        topN: 5,
        summary: '',
        items: [],
      },
    }
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue({ data: response })

    await fetchCommercialRecommendations({
      serviceCode: 'CS100010',
      commercialCodes: ['3110008', '3110012'],
      periodCode: '20233',
      topN: 5,
    })

    expect(get).toHaveBeenCalledWith(
      '/commercials/recommendations/by-service?serviceCode=CS100010&commercialCodes=3110008&commercialCodes=3110012&periodCode=20233&topN=5',
    )
  })
})
