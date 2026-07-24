import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '@/lib/api/client'
import {
  buildRecommendationSearchParams,
  fetchAdministrations,
  fetchCommercialMapAreas,
  fetchCommercialRecommendations,
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
