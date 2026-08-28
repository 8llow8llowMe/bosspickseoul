import { describe, expect, it } from 'vitest'

import type {
  CandidateCommercial,
  CommercialArea,
  CommercialProfile,
} from '@/types/recommend'

import type { AreaBoundaryItem } from '@/types/recommend'

import {
  buildRecommendationMapItems,
  buildResultBoundaryBounds,
  collectResultCameraPoints,
  createBounds,
  createCenterFallbackBounds,
  filterAreasByCodes,
  getScoreFillOpacity,
  normalizeBoundary,
  normalizeViewportBounds,
  resolveCameraPadding,
  resolveRecommendCameraTarget,
  MIN_CAMERA_PADDING,
  RESULT_BOUNDARY_PAD_DEGREES,
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
              [127.05, 37.52],
              [127.05, 37.5],
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
        boundaryCoords: [
          [127.03, 37.5],
          [127.05, 37.52],
          [127.05, 37.5],
        ],
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

const boundaryArea = (
  overrides: Partial<AreaBoundaryItem> = {},
): AreaBoundaryItem => ({
  areaCode: '3110008',
  areaName: '강남역 상권',
  centerLng: 127.03,
  centerLat: 37.5,
  boundaryCoords: [
    [127.02, 37.49],
    [127.04, 37.49],
    [127.04, 37.51],
  ],
  ...overrides,
})

describe('result boundary join', () => {
  // T-B1 — profile 이 경계를 비워 보내는 것이 백엔드의 현재 정상 동작이다.
  it('fills boundaryCoords from the boundary query when the profile has none', () => {
    const [item] = buildRecommendationMapItems(
      [result()],
      [profile({ boundaryCoords: [] })],
      [commercial()],
      [boundaryArea()],
    )

    expect(item.boundaryCoords).toEqual([
      [127.02, 37.49],
      [127.04, 37.49],
      [127.04, 37.51],
    ])
  })

  it('keeps the profile boundary when it is drawable', () => {
    const [item] = buildRecommendationMapItems(
      [result()],
      [
        profile({
          boundaryCoords: [
            [127.0, 37.4],
            [127.01, 37.4],
            [127.01, 37.41],
          ],
        }),
      ],
      [commercial()],
      [boundaryArea()],
    )

    expect(item.boundaryCoords).toEqual([
      [127.0, 37.4],
      [127.01, 37.4],
      [127.01, 37.41],
    ])
  })

  it('ignores a profile boundary too short to draw', () => {
    const [item] = buildRecommendationMapItems(
      [result()],
      [
        profile({
          boundaryCoords: [
            [127.0, 37.4],
            [127.01, 37.4],
          ],
        }),
      ],
      [commercial()],
      [boundaryArea()],
    )

    expect(item.boundaryCoords).toHaveLength(3)
  })

  it('stays empty when no boundary source has the code', () => {
    const [item] = buildRecommendationMapItems(
      [result()],
      [profile({ boundaryCoords: [] })],
      [commercial()],
      [boundaryArea({ areaCode: '9999999' })],
    )

    expect(item.boundaryCoords).toEqual([])
  })

  it('pads the boundary query bounds so a single result is still inside', () => {
    expect(
      buildResultBoundaryBounds([{ centerLng: 127.03, centerLat: 37.5 }]),
    ).toEqual({
      lngSW: 127.03 - RESULT_BOUNDARY_PAD_DEGREES,
      latSW: 37.5 - RESULT_BOUNDARY_PAD_DEGREES,
      lngNE: 127.03 + RESULT_BOUNDARY_PAD_DEGREES,
      latNE: 37.5 + RESULT_BOUNDARY_PAD_DEGREES,
    })
  })

  it('returns null when no center is usable', () => {
    expect(
      buildResultBoundaryBounds([{ centerLng: Number.NaN, centerLat: 37.5 }]),
    ).toBeNull()
    expect(buildResultBoundaryBounds([])).toBeNull()
  })
})

describe('recommend camera target', () => {
  const administrationPoints = [
    { lng: 127.0, lat: 37.5 },
    { lng: 127.1, lat: 37.6 },
  ]
  const districtPoints = [{ lng: 126.9, lat: 37.4 }]
  const resultPoints = [
    { lng: 127.02, lat: 37.49 },
    { lng: 127.04, lat: 37.51 },
  ]
  const base = {
    stage: 'results' as const,
    isResultsLoading: false,
    selectedResultPoints: null,
    resultPoints: [],
    administrationPoints,
    districtPoints,
  }

  // T-B2 — 결과가 0건인데 행정동으로 확대되면 아무것도 없는 화면으로 끌려간다.
  it('keeps the camera when there is no result', () => {
    expect(resolveRecommendCameraTarget(base)).toEqual({ kind: 'keep' })
  })

  it('keeps the camera while results are loading', () => {
    expect(
      resolveRecommendCameraTarget({ ...base, isResultsLoading: true }),
    ).toEqual({ kind: 'keep' })
  })

  // T-B3
  it('fits every result when nothing is picked yet', () => {
    expect(resolveRecommendCameraTarget({ ...base, resultPoints })).toEqual({
      kind: 'fit',
      points: resultPoints,
    })
  })

  // T-B4 — 사용자가 고른 상권이 우선이다.
  it('fits the picked result over the whole set', () => {
    const picked = [{ lng: 127.03, lat: 37.5 }]

    expect(
      resolveRecommendCameraTarget({
        ...base,
        resultPoints,
        selectedResultPoints: picked,
      }),
    ).toEqual({ kind: 'fit', points: picked })
  })

  it('falls back to administration, then district, then the default camera', () => {
    expect(
      resolveRecommendCameraTarget({ ...base, stage: 'commercial' }),
    ).toEqual({ kind: 'fit', points: administrationPoints })
    expect(
      resolveRecommendCameraTarget({
        ...base,
        stage: 'administration',
        administrationPoints: null,
      }),
    ).toEqual({ kind: 'fit', points: districtPoints })
    expect(
      resolveRecommendCameraTarget({
        ...base,
        stage: 'district',
        administrationPoints: null,
        districtPoints: null,
      }),
    ).toEqual({ kind: 'reset' })
  })

  it('uses the boundary when a result has one and the center otherwise', () => {
    expect(
      collectResultCameraPoints([
        {
          rank: 1,
          commercialCode: '3110008',
          commercialName: '강남역 상권',
          compositeScore: 84,
          centerLng: 127.03,
          centerLat: 37.5,
          boundaryCoords: [
            [127.02, 37.49],
            [127.04, 37.51],
          ],
        },
        {
          rank: 2,
          commercialCode: '3110009',
          commercialName: '역삼 상권',
          compositeScore: 70,
          centerLng: 127.06,
          centerLat: 37.52,
          boundaryCoords: [],
        },
      ]),
    ).toEqual([
      { lng: 127.02, lat: 37.49 },
      { lng: 127.04, lat: 37.51 },
      { lng: 127.06, lat: 37.52 },
    ])
  })
})

describe('camera padding', () => {
  const map = { width: 1280, height: 648 }

  it('keeps a base margin when nothing floats over the map', () => {
    expect(resolveCameraPadding(map, [])).toEqual({
      top: MIN_CAMERA_PADDING,
      right: MIN_CAMERA_PADDING,
      bottom: MIN_CAMERA_PADDING,
      left: MIN_CAMERA_PADDING,
    })
  })

  // 데스크탑 조건·결과 패널은 지도 위에 떠 있다. 지도 전체 폭에 맞추면
  // 추천 상권이 패널 뒤로 들어가 보이지 않는다.
  it('pushes the fit past a tall left panel', () => {
    expect(
      resolveCameraPadding(map, [
        { left: 24, top: 24, right: 414, bottom: 624 },
      ]),
    ).toEqual({
      top: MIN_CAMERA_PADDING,
      right: MIN_CAMERA_PADDING,
      bottom: MIN_CAMERA_PADDING,
      left: 414 + MIN_CAMERA_PADDING,
    })
  })

  it('treats a wide short panel as a bottom sheet', () => {
    expect(
      resolveCameraPadding(map, [
        { left: 0, top: 500, right: 1280, bottom: 648 },
      ]).bottom,
    ).toBe(648 - 500 + MIN_CAMERA_PADDING)
  })

  // 패딩이 지도 절반을 넘으면 맞출 공간 자체가 사라진다.
  it('never eats more than 45% of an axis', () => {
    expect(
      resolveCameraPadding(map, [
        { left: 0, top: 60, right: 1280, bottom: 648 },
      ]).bottom,
    ).toBe(Math.round(648 * 0.45))
  })

  it('ignores collapsed overlays and a zero-sized map', () => {
    expect(
      resolveCameraPadding(map, [{ left: 24, top: 24, right: 24, bottom: 624 }])
        .left,
    ).toBe(MIN_CAMERA_PADDING)
    expect(
      resolveCameraPadding({ width: 0, height: 0 }, [
        { left: 24, top: 24, right: 414, bottom: 624 },
      ]),
    ).toEqual({
      top: MIN_CAMERA_PADDING,
      right: MIN_CAMERA_PADDING,
      bottom: MIN_CAMERA_PADDING,
      left: MIN_CAMERA_PADDING,
    })
  })
})
