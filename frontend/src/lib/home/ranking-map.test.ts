import { describe, expect, it } from 'vitest'

import type { HomeMetricRanking } from '@/lib/home/metric-rankings'
import type { PopularDistrictsView } from '@/lib/home/popular-districts'
import { buildRankingMapLayers } from '@/lib/home/ranking-map'

/**
 * 미니 지도 레이어 계산(ranking-mini-map.md D3-3 · D5-2 · D7-1).
 *
 * 듀얼 / 지표만 / 조회만 / 빈 지표 네 갈래에서 칠·배지·겹침·요약 문장을 고정한다.
 */

const view = (
  items: Array<[code: string, name: string]>,
): PopularDistrictsView => ({
  items: items.map(([districtCode, name], index) => ({
    rank: index + 1,
    districtCode,
    name,
    viewCount: 100 - index,
    href: `/analysis?districtCode=${districtCode}`,
  })),
  windowLabel: '최근 24시간',
})

const metric = (
  items: Array<[code: string, name: string]>,
  label = '유동인구',
): HomeMetricRanking => ({
  metric: 'footTraffic',
  label,
  items: items.map(([districtCode, districtName], index) => ({
    rank: index + 1,
    districtCode,
    districtName,
    value: 1000 - index,
    changeRate: 0,
  })),
})

const VIEW = view([
  ['11740', '강동구'],
  ['11680', '강남구'],
  ['11560', '영등포구'],
])

const METRIC = metric([
  ['11680', '강남구'],
  ['11620', '관악구'],
  ['11710', '송파구'],
  ['11290', '성북구'],
  ['11500', '강서구'],
  ['11440', '마포구'],
])

describe('buildRankingMapLayers', () => {
  it('듀얼 — 지표 Top 5 를 칠하고 많이 본 곳에 배지를 얹고 겹침을 조회 순으로 낸다', () => {
    const layers = buildRankingMapLayers(VIEW, METRIC)

    expect([...layers.fills]).toEqual([
      ['11680', 1],
      ['11620', 2],
      ['11710', 3],
      ['11290', 4],
      ['11500', 5],
    ])
    expect(layers.badges).toEqual([
      { code: '11740', rank: 1 },
      { code: '11680', rank: 2 },
      { code: '11560', rank: 3 },
    ])
    expect(layers.overlap).toEqual(['11680'])
    expect(layers.summary).toBe(
      '서울 지도에 많이 본 3곳과 유동인구 Top 5 를 표시했어요. 유동인구 Top 5: 강남구, 관악구, 송파구, 성북구, 강서구. 둘 다 든 곳은 강남구예요.',
    )
  })

  it('듀얼인데 겹치는 곳이 없으면 그렇다고 말한다', () => {
    const layers = buildRankingMapLayers(
      view([
        ['11740', '강동구'],
        ['11560', '영등포구'],
        ['11110', '종로구'],
      ]),
      METRIC,
    )

    expect(layers.overlap).toEqual([])
    expect(layers.summary).toBe(
      '서울 지도에 많이 본 3곳과 유동인구 Top 5 를 표시했어요. 유동인구 Top 5: 강남구, 관악구, 송파구, 성북구, 강서구. 겹치는 곳은 없어요.',
    )
  })

  /*
   * #600 으로 「지금 많이 본 지역」의 지표 목록을 걷어 냈다. 듀얼에서도 지표 Top 5 의 이름은 지도 요약이
   * 말해야 한다 — 그렇지 않으면 스크린리더 사용자에게 이 섹션의 지표 순위가 통째로 사라진다.
   */
  it('듀얼 요약에도 지표 Top 5 의 이름을 순위대로 넣는다(#600)', () => {
    const layers = buildRankingMapLayers(VIEW, METRIC)

    expect(layers.summary).toContain(
      '유동인구 Top 5: 강남구, 관악구, 송파구, 성북구, 강서구.',
    )
  })

  it('지표만 — 칠만 있고 순위대로 구 이름을 읽어 준다', () => {
    const layers = buildRankingMapLayers(null, METRIC)

    expect(layers.fills.size).toBe(5)
    expect(layers.badges).toEqual([])
    expect(layers.overlap).toEqual([])
    expect(layers.summary).toBe(
      '서울 지도에 유동인구 Top 5 를 진하기로 표시했어요: 강남구, 관악구, 송파구, 성북구, 강서구.',
    )
  })

  it('조회만 — 배지만 있고 순위대로 구 이름을 읽어 준다', () => {
    const layers = buildRankingMapLayers(VIEW, null)

    expect(layers.fills.size).toBe(0)
    expect(layers.badges).toHaveLength(3)
    expect(layers.summary).toBe(
      '서울 지도에 많이 본 3곳을 순위 숫자로 표시했어요: 강동구, 강남구, 영등포구.',
    )
  })

  /* 선택 지표만 빈 응답(D5-3) — 칠 없이 배지만 남고 요약도 조회만 문장이 된다. */
  it('선택 지표가 비면 칠 없이 배지만 남는다', () => {
    const layers = buildRankingMapLayers(VIEW, metric([]))

    expect(layers.fills.size).toBe(0)
    expect(layers.badges).toHaveLength(3)
    expect(
      layers.summary.startsWith('서울 지도에 많이 본 3곳을 순위 숫자로'),
    ).toBe(true)
  })

  it('둘 다 없으면 그릴 것도 읽을 것도 없다', () => {
    const layers = buildRankingMapLayers(null, null)

    expect(layers.fills.size).toBe(0)
    expect(layers.badges).toEqual([])
    expect(layers.summary).toBe('')
  })

  it('코드 없는 항목은 버리고 같은 구는 한 번만 둔다 — 순위는 남은 것끼리 다시 센다', () => {
    const layers = buildRankingMapLayers(
      view([
        ['', '이름만'],
        ['11680', '강남구'],
        ['11680', '강남구'],
        ['11440', '마포구'],
      ]),
      metric([
        ['  ', '공백'],
        ['11440', '마포구'],
        ['11440', '마포구'],
      ]),
    )

    expect(layers.badges).toEqual([
      { code: '11680', rank: 1 },
      { code: '11440', rank: 2 },
    ])
    expect([...layers.fills]).toEqual([['11440', 1]])
    expect(layers.overlap).toEqual(['11440'])
    expect(layers.summary).toContain('유동인구 Top 1 를')
  })
})
