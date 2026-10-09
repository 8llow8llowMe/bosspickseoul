import { describe, expect, it } from 'vitest'

import { districts } from '@/data/districts'
import { SEOUL_STATUS_FEATURES } from '@/data/seoul-status-map'
import type { StatusRankedItem } from '@/types/status'
import {
  createStatusMapLabels,
  findSelectedStatusMapFeature,
  resolveStatusMapLabelModes,
  resolveStatusMapValueSteps,
  STATUS_MAP_LABEL_TIERS,
  type StatusMapLabel,
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

describe('resolveStatusMapLabelModes', () => {
  const label = (
    districtCode: string,
    districtName: string,
    x: number,
    y: number,
    rank: number | null,
  ): StatusMapLabel => ({
    districtCode,
    districtName,
    x,
    y,
    rank,
    isTopTen: rank !== null,
  })

  it('keeps every label whole when nothing overlaps', () => {
    const modes = resolveStatusMapLabelModes(
      [label('a', '강남구', 100, 100, 1), label('b', '서초구', 600, 500, null)],
      STATUS_MAP_LABEL_TIERS.narrow,
    )

    expect([...modes.values()]).toEqual(['full', 'full'])
  })

  it('folds the lower rank into two rows before dropping its name', () => {
    // 실제 강남구·송파구 중심. 가로로만 가까워 두 줄로 접으면 폭이 줄어 이름을 지킨다.
    const modes = resolveStatusMapLabelModes(
      [label('a', '강남구', 569, 465, 1), label('b', '송파구', 669, 445, 2)],
      STATUS_MAP_LABEL_TIERS.narrow,
    )

    expect(modes.get('a')).toBe('full')
    expect(modes.get('b')).toBe('stacked')
  })

  it('keeps only the rank dot when even two rows collide, never hiding a rank', () => {
    const modes = resolveStatusMapLabelModes(
      [label('a', '강남구', 400, 300, 2), label('b', '송파구', 400, 300, 1)],
      STATUS_MAP_LABEL_TIERS.wide,
    )

    expect(modes.get('b')).toBe('full')
    expect(modes.get('a')).toBe('badge')
  })

  it('hides an unranked name that would sit under a ranked label', () => {
    const modes = resolveStatusMapLabelModes(
      [label('a', '성북구', 400, 300, null), label('b', '종로구', 410, 300, 1)],
      STATUS_MAP_LABEL_TIERS.wide,
    )

    expect(modes.get('b')).toBe('full')
    expect(modes.get('a')).toBe('hidden')
  })

  it('never hides a ranked district on the real Seoul map, whatever the top ten', () => {
    // 25개 구 전부에 순위가 붙은 최악의 경우도 순위 점은 모두 남는다.
    const everyRanked = createStatusMapLabels(
      [],
      SEOUL_STATUS_FEATURES,
      districts,
    ).map((item, index) => ({ ...item, rank: index + 1, isTopTen: true }))

    for (const tier of Object.values(STATUS_MAP_LABEL_TIERS)) {
      const modes = resolveStatusMapLabelModes(everyRanked, tier)

      expect(modes.size).toBe(25)
      expect([...modes.values()]).not.toContain('hidden')
    }
  })

  it('keeps all ten names of a real sales top ten on the narrowest map', () => {
    // 2026-09-30 dev 매출 Top10. 예전 배치는 이 목록에서 라벨을 이웃 구 너머로 밀어냈다.
    const salesTopTenCodes = [
      '11680',
      '11710',
      '11230',
      '11590',
      '11650',
      '11560',
      '11140',
      '11545',
      '11170',
      '11110',
    ]
    const items: StatusRankedItem[] = salesTopTenCodes.map((code, index) => ({
      rank: index + 1,
      districtCode: code,
      districtName: code,
      value: 1,
      changeRate: 0,
    }))
    const labels = createStatusMapLabels(
      items,
      SEOUL_STATUS_FEATURES,
      districts,
    )
    const modes = resolveStatusMapLabelModes(
      labels,
      STATUS_MAP_LABEL_TIERS.narrow,
    )

    for (const code of salesTopTenCodes) {
      expect(['full', 'stacked']).toContain(modes.get(code))
    }
  })
})

describe('resolveStatusMapValueSteps', () => {
  const item = (
    districtCode: string,
    value: number,
    rank = 1,
  ): StatusRankedItem => ({
    rank,
    districtCode,
    districtName: districtCode,
    value,
    changeRate: null,
  })

  it('25개 구를 모두 다섯 단계 중 하나에 다섯 개씩 넣는다', () => {
    const items = SEOUL_STATUS_FEATURES.map((feature, index) =>
      item(feature.districtCode, 1_000 - index * 7, index + 1),
    )
    const steps = resolveStatusMapValueSteps(items)

    expect(steps.size).toBe(25)
    for (const feature of SEOUL_STATUS_FEATURES) {
      expect(steps.get(feature.districtCode)).toBeGreaterThanOrEqual(1)
      expect(steps.get(feature.districtCode)).toBeLessThanOrEqual(5)
    }
    const counts = [1, 2, 3, 4, 5].map(
      step => [...steps.values()].filter(value => value === step).length,
    )
    expect(counts).toEqual([5, 5, 5, 5, 5])
    // 값이 큰 쪽이 1단계다(1~5위 → 1, 21~25위 → 5).
    expect(steps.get(items[0].districtCode)).toBe(1)
    expect(steps.get(items[4].districtCode)).toBe(1)
    expect(steps.get(items[5].districtCode)).toBe(2)
    expect(steps.get(items[24].districtCode)).toBe(5)
  })

  it('입력 순서와 상관없이 값으로 단계를 정한다', () => {
    const steps = resolveStatusMapValueSteps([
      item('a', 10),
      item('b', 50),
      item('c', 30),
      item('d', 40),
      item('e', 20),
    ])

    expect(Object.fromEntries(steps)).toEqual({ b: 1, d: 2, c: 3, a: 5, e: 4 })
  })

  it('같은 값은 같은 단계다 — 경계에 걸린 동점도 갈라지지 않는다', () => {
    // 순위 1, 2, 2, 4, 4 …. 10개면 두 개씩 한 단계라 2·3번째, 4·5번째가 각각 단계 경계에 걸린다.
    const values = [100, 90, 90, 80, 80, 70, 60, 50, 40, 30]
    const items = values.map((value, index) => item(`d${index}`, value))
    const steps = resolveStatusMapValueSteps(items)

    expect(steps.get('d1')).toBe(1)
    expect(steps.get('d2')).toBe(1)
    expect(steps.get('d3')).toBe(2)
    expect(steps.get('d4')).toBe(2)
    expect(steps.get('d5')).toBe(3)
  })

  it('값이 유한수가 아닌 구는 단계가 없고 n 에서도 빠진다', () => {
    const steps = resolveStatusMapValueSteps([
      item('a', 10),
      item('b', Number.NaN),
      item('c', 5),
    ])

    expect(steps.has('b')).toBe(false)
    expect(steps.get('a')).toBe(1)
    expect(steps.get('c')).toBe(3)
  })

  it('같은 구가 두 번 오면 앞 항목만 쓴다', () => {
    const steps = resolveStatusMapValueSteps([
      item('a', 10),
      item('b', 5),
      item('a', 1),
    ])

    expect(steps.get('a')).toBe(1)
    expect(steps.size).toBe(2)
  })

  it('빈 순위면 아무 구도 칠하지 않는다', () => {
    expect(resolveStatusMapValueSteps([]).size).toBe(0)
  })
})
