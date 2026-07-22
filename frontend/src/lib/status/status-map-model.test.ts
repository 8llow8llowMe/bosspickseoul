import { describe, expect, it } from 'vitest'

import { createStatusMapMarkers } from './status-map-model'

describe('createStatusMapMarkers', () => {
  const centers = {
    '11110': { x: 120, y: 240 },
    '11140': { x: 320, y: 440 },
  }

  it('keeps the first ten ranked items with their map coordinates', () => {
    const items = Array.from({ length: 11 }, (_, index) => ({
      rank: index + 1,
      districtCode: index % 2 === 0 ? '11110' : '11140',
      districtName: `자치구 ${index + 1}`,
      value: (index + 1) * 100,
      changeRate: index + 0.5,
    }))

    const markers = createStatusMapMarkers(items, centers)

    expect(markers).toHaveLength(10)
    expect(markers[0]).toEqual({
      rank: 1,
      districtCode: '11110',
      districtName: '자치구 1',
      value: 100,
      changeRate: 0.5,
      x: 120,
      y: 240,
    })
    expect(markers[9]).toMatchObject({
      rank: 10,
      districtName: '자치구 10',
      value: 1_000,
      changeRate: 9.5,
      x: 320,
      y: 440,
    })
  })

  it('drops top-ten items without a district center', () => {
    const markers = createStatusMapMarkers(
      [
        {
          rank: 1,
          districtCode: '99999',
          districtName: '없는 자치구',
          value: 100,
          changeRate: 10,
        },
        {
          rank: 2,
          districtCode: '11140',
          districtName: '중구',
          value: 200,
          changeRate: -2,
        },
      ],
      centers,
    )

    expect(markers).toEqual([
      {
        rank: 2,
        districtCode: '11140',
        districtName: '중구',
        value: 200,
        changeRate: -2,
        x: 320,
        y: 440,
      },
    ])
  })

  it('does not mutate source items or district centers', () => {
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
    const originalCenters = structuredClone(centers)

    createStatusMapMarkers(items, centers)

    expect(items).toEqual(originalItems)
    expect(centers).toEqual(originalCenters)
  })
})
