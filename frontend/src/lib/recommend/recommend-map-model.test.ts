import { describe, expect, it } from 'vitest'

import type {
  CandidateCommercial,
  CommercialArea,
  CommercialProfile,
} from '@/types/recommend'

import {
  buildRecommendationMapItems,
  createBounds,
  createCenterFallbackBounds,
  filterAreasByCodes,
  getScoreFillOpacity,
  normalizeBoundary,
  normalizeViewportBounds,
} from './recommend-map-model'

const result = (
  overrides: Partial<CandidateCommercial> = {},
): CandidateCommercial => ({
  rank: 1,
  commercialCode: '3110008',
  commercialName: '강남역 상권',
  compositeScore: 84,
  grade: 'HIGH',
  summaryLabel: null,
  selectionReason: null,
  opportunityLabel: null,
  riskLabel: null,
  metricBreakdown: [],
  reasonTags: [],
  ...overrides,
})

const commercial = (
  overrides: Partial<CommercialArea> = {},
): CommercialArea => ({
  commercialCode: '3110008',
  commercialName: '강남역 상권',
  commercialClassificationCode: 'A',
  commercialClassificationName: '골목상권',
  centerLng: 127.03,
  centerLat: 37.5,
  ...overrides,
})

const profile = (
  overrides: Partial<CommercialProfile> = {},
): CommercialProfile => ({
  commercialCode: '3110008',
  commercialName: '강남역 상권',
  districtCode: '11680',
  districtName: '강남구',
  administrationCode: '11680101',
  administrationName: '역삼1동',
  centerLng: 127.04,
  centerLat: 37.51,
  boundaryCoords: [
    [127.03, 37.5],
    [127.05, 37.52],
  ],
  keyMetrics: null,
  ...overrides,
})

describe('recommend map geometry', () => {
  it('converts valid tuples and rejects invalid WGS84 coordinates', () => {
    expect(
      normalizeBoundary([
        [127.03, 37.5],
        [Number.NaN, 37.51],
        [181, 37.52],
        [127.04, 91],
      ]),
    ).toEqual([{ lng: 127.03, lat: 37.5 }])
  })

  it('calculates bounds from points and returns null without points', () => {
    expect(
      createBounds([
        { lng: 127.01, lat: 37.49 },
        { lng: 127.05, lat: 37.52 },
      ]),
    ).toEqual({
      lngSW: 127.01,
      latSW: 37.49,
      lngNE: 127.05,
      latNE: 37.52,
    })
    expect(createBounds([])).toBeNull()
  })

  it('creates fallback bounds around a center', () => {
    expect(createCenterFallbackBounds(127, 37.5)).toEqual({
      lngSW: 126.92,
      latSW: 37.44,
      lngNE: 127.08,
      latNE: 37.56,
    })
  })

  it('normalizes viewport bounds to six decimal places', () => {
    expect(
      normalizeViewportBounds({
        lngSW: 126.91234567,
        latSW: 37.41234567,
        lngNE: 127.11234567,
        latNE: 37.61234567,
      }),
    ).toEqual({
      lngSW: 126.912346,
      latSW: 37.412346,
      lngNE: 127.112346,
      latNE: 37.612346,
    })
  })

  it('rejects invalid or reversed viewport bounds', () => {
    expect(
      normalizeViewportBounds({
        lngSW: 127.1,
        latSW: 37.4,
        lngNE: 126.9,
        latNE: 37.7,
      }),
    ).toBeNull()
    expect(
      normalizeViewportBounds({
        lngSW: Number.NaN,
        latSW: 37.4,
        lngNE: 127.1,
        latNE: 37.7,
      }),
    ).toBeNull()
  })
})

describe('filterAreasByCodes', () => {
  it('matches area and allowed codes after string normalization', () => {
    const areas = [
      {
        areaCode: '11680101',
        areaName: '역삼1동',
        centerLng: 127.03,
        centerLat: 37.5,
        boundaryCoords: [],
      },
      {
        areaCode: '11110101',
        areaName: '청운효자동',
        centerLng: 126.97,
        centerLat: 37.58,
        boundaryCoords: [],
      },
    ]

    expect(filterAreasByCodes(areas, [11680101])).toEqual([areas[0]])
  })
})

describe('getScoreFillOpacity', () => {
  it.each([
    [100, 1, 0.42],
    [50, 3, 0.27],
    [0, 5, 0.11],
    [120, 1, 0.42],
    [-10, 5, 0.11],
  ])('maps finite score %s and rank %s to %s', (score, rank, expected) => {
    expect(getScoreFillOpacity(score, rank)).toBe(expected)
  })

  it.each([
    [null, 2, 0.29],
    [Number.NaN, 0, 0.42],
    [Number.POSITIVE_INFINITY, 6, 0.11],
  ])('maps invalid score %s by clamped rank %s', (score, rank, expected) => {
    expect(getScoreFillOpacity(score, rank)).toBe(expected)
  })
})

describe('buildRecommendationMapItems', () => {
  it('prefers valid profile geometry and filters invalid boundary tuples', () => {
    expect(
      buildRecommendationMapItems(
        [result()],
        [
          profile({
            boundaryCoords: [
              [127.03, 37.5],
              [Number.NaN, 37.51],
              [127.04, 91],
            ],
          }),
        ],
        [commercial()],
      ),
    ).toEqual([
      {
        rank: 1,
        commercialCode: '3110008',
        commercialName: '강남역 상권',
        compositeScore: 84,
        centerLng: 127.04,
        centerLat: 37.51,
        boundaryCoords: [[127.03, 37.5]],
      },
    ])
  })

  it('falls back to the matching commercial center with an empty boundary', () => {
    expect(buildRecommendationMapItems([result()], [], [commercial()])).toEqual(
      [
        {
          rank: 1,
          commercialCode: '3110008',
          commercialName: '강남역 상권',
          compositeScore: 84,
          centerLng: 127.03,
          centerLat: 37.5,
          boundaryCoords: [],
        },
      ],
    )
  })

  it('uses a valid commercial fallback when profile center geometry is invalid', () => {
    expect(
      buildRecommendationMapItems(
        [result()],
        [profile({ centerLng: Number.NaN })],
        [commercial()],
      ),
    ).toEqual([
      expect.objectContaining({
        centerLng: 127.03,
        centerLat: 37.5,
        boundaryCoords: [],
      }),
    ])
  })

  it('excludes results without a valid profile or commercial center', () => {
    expect(
      buildRecommendationMapItems(
        [
          result(),
          result({
            rank: 2,
            commercialCode: '3110012',
            commercialName: '테헤란로 상권',
          }),
        ],
        [],
        [commercial({ centerLng: Number.POSITIVE_INFINITY })],
      ),
    ).toEqual([])
  })
})
