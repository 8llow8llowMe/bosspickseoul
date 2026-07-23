import { describe, expect, it } from 'vitest'

import {
  createStatusMapLabels,
  findSelectedStatusMapFeature,
} from './status-map-model'

describe('createStatusMapLabels', () => {
  const features = [
    {
      districtCode: '11110',
      path: 'M0 0L10 0L10 10Z',
      center: { x: 120, y: 240 },
    },
    {
      districtCode: '11140',
      path: 'M10 10L20 10L20 20Z',
      center: { x: 320, y: 440 },
    },
  ]

  const districtRecords = [
    { gooCode: 11110, gooName: '종로구', gooCenter: [126.98, 37.57] },
    { gooCode: 11140, gooName: '중구', gooCenter: [126.99, 37.56] },
  ] as const

  it('returns one label per mapped feature in feature order', () => {
    const labels = createStatusMapLabels(
      [
        {
          rank: 2,
          districtCode: '11140',
          districtName: '중구',
          value: 200,
          changeRate: -2,
        },
      ],
      features,
      districtRecords,
    )

    expect(labels).toEqual([
      {
        districtCode: '11110',
        districtName: '종로구',
        x: 120,
        y: 240,
        rank: null,
        isTopTen: false,
      },
      {
        districtCode: '11140',
        districtName: '중구',
        x: 320,
        y: 440,
        rank: 2,
        isTopTen: true,
      },
    ])
  })

  it('does not attach a rank from an item after the first ten', () => {
    const items = Array.from({ length: 11 }, (_, index) => ({
      rank: index + 1,
      districtCode: index === 10 ? '11110' : '99999',
      districtName: `자치구 ${index + 1}`,
      value: (index + 1) * 100,
      changeRate: index,
    }))

    const labels = createStatusMapLabels(items, features, districtRecords)

    expect(labels[0]).toMatchObject({ rank: null, isTopTen: false })
  })

  it('keeps the first rank when a top-ten district appears more than once', () => {
    const labels = createStatusMapLabels(
      [
        {
          rank: 1,
          districtCode: '11110',
          districtName: '종로구',
          value: 100,
          changeRate: 5,
        },
        {
          rank: 4,
          districtCode: '11110',
          districtName: '종로구',
          value: 400,
          changeRate: 10,
        },
      ],
      features,
      districtRecords,
    )

    expect(labels[0]).toMatchObject({ rank: 1, isTopTen: true })
  })

  it('omits only features without a district name mapping', () => {
    const labels = createStatusMapLabels([], features, [districtRecords[1]])

    expect(labels).toEqual([
      {
        districtCode: '11140',
        districtName: '중구',
        x: 320,
        y: 440,
        rank: null,
        isTopTen: false,
      },
    ])
  })

  it('does not mutate source items or features', () => {
    const items = [
      {
        rank: 1,
        districtCode: '11110',
        districtName: '종로구',
        value: 100,
        changeRate: 5,
      },
    ]
    const originalItems = structuredClone(items)
    const originalFeatures = structuredClone(features)
    const originalDistrictRecords = structuredClone(districtRecords)

    createStatusMapLabels(items, features, districtRecords)

    expect(items).toEqual(originalItems)
    expect(features).toEqual(originalFeatures)
    expect(districtRecords).toEqual(originalDistrictRecords)
  })
})

describe('findSelectedStatusMapFeature', () => {
  const features = [
    {
      districtCode: '11110',
      path: 'M0 0L10 0L10 10Z',
      center: { x: 120, y: 240 },
    },
    {
      districtCode: '11140',
      path: 'M10 10L20 10L20 20Z',
      center: { x: 320, y: 440 },
    },
  ]

  it('returns only the feature matching the selected district code', () => {
    expect(findSelectedStatusMapFeature(features, '11140')).toEqual(features[1])
  })

  it.each([null, '99999'])(
    'returns null without a matching selection: %s',
    districtCode => {
      expect(findSelectedStatusMapFeature(features, districtCode)).toBeNull()
    },
  )
})
