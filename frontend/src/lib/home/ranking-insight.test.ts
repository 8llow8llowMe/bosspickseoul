import { describe, expect, it } from 'vitest'

import { buildRankingInsight } from '@/lib/home/ranking-insight'
import type { HomeMetricRanking } from '@/lib/home/metric-rankings'
import type { PopularDistrict } from '@/lib/home/popular-districts'

const view = (rank: number, code: string, name: string): PopularDistrict => ({
  rank,
  districtCode: code,
  name,
  viewCount: 1000 - rank,
  href: `/analysis?districtCode=${code}`,
})

const ranking = (
  items: Array<[number, string, string]>,
): HomeMetricRanking => ({
  metric: 'sales',
  label: '매출',
  items: items.map(([rank, districtCode, districtName]) => ({
    rank,
    districtCode,
    districtName,
    value: 1000 - rank,
    changeRate: 0,
  })),
})

describe('buildRankingInsight', () => {
  it('규칙 A — 지표 상위인데 조회수 목록에 없는 곳을 먼저 말한다', () => {
    const views = [view(1, '11680', '강남구'), view(2, '11440', '마포구')]
    const metric = ranking([
      [1, '11680', '강남구'],
      [2, '11140', '중구'], // 조회수 목록에 없다
      [3, '11650', '서초구'],
    ])

    const result = buildRankingInsight(views, metric)

    expect(result).not.toBeNull()
    expect(result?.sentence).toBe(
      '매출 2위 중구는 지금 많이 본 2곳에 들지 않았습니다.',
    )
    expect(result?.highlightCode).toBe('11140')
  })

  it('규칙 A 와 B 가 둘 다 성립할 수 있는 데이터에서도 A 가 이긴다 / 양쪽이 서로를 다 덮으면 null', () => {
    const views = [
      view(1, '11680', '강남구'),
      view(2, '11200', '성동구'), // 지표 Top5 에 없다
    ]
    const metric = ranking([
      [1, '11680', '강남구'],
      [2, '11440', '마포구'],
      [3, '11650', '서초구'],
    ])
    // metric 의 top3 중 마포구·서초구가 조회수 밖이라 규칙 A 가 먼저 걸린다
    // (아래 두 번째 assert). 규칙 B 의 긍정 발동 경로는 이 케이스로 검증되지
    // 않는다 — 별도 테스트('규칙 B 의 긍정 경로 …')가 그것을 검증한다.
    //
    // metricAllSeen 은 지표 top3 가 전부 조회수 안에 있고(A 불발), 조회수
    // top2 도 전부 지표 안에 있어(B 불발) null 이 되는 것만 검증한다.
    const metricAllSeen = ranking([
      [1, '11680', '강남구'],
      [2, '11200', '성동구'],
      [3, '11680', '강남구'],
    ])

    expect(buildRankingInsight(views, metricAllSeen)).toBeNull()
    expect(buildRankingInsight(views, metric)?.sentence).toContain('매출')
  })

  it('규칙 B 의 긍정 경로 — 많이 보는데 지표 밖인 곳을 문장으로 만든다', () => {
    // 지표 Top 전부가 조회수 목록 안에 있어 규칙 A 는 걸리지 않는다.
    // 조회수 3위 성동구만 지표 목록 밖이라 규칙 B 가 발동한다.
    const views = [
      view(1, '11680', '강남구'),
      view(2, '11440', '마포구'),
      view(3, '11200', '성동구'),
    ]
    const metric = ranking([
      [1, '11680', '강남구'],
      [2, '11440', '마포구'],
    ])

    const result = buildRankingInsight(views, metric)

    expect(result?.sentence).toBe('조회수 3위 성동구는 매출 Top 2 밖입니다.')
    expect(result?.highlightCode).toBe('11200')
  })

  it('규칙 A 와 B 가 둘 다 성립하면 A 를 고른다', () => {
    // A 가 「아무도 안 보는데 지표 상위」라 창업 후보를 찾는 사람에게 더 값지다.
    const views = [view(1, '11200', '성동구'), view(2, '11680', '강남구')]
    const metric = ranking([
      [1, '11140', '중구'], // A: 조회수 밖
      [2, '11680', '강남구'],
      [3, '11650', '서초구'],
    ])

    expect(buildRankingInsight(views, metric)?.highlightCode).toBe('11140')
  })

  it('양쪽 상위가 완전히 겹치면 문장을 만들지 않는다', () => {
    const views = [view(1, '11680', '강남구'), view(2, '11440', '마포구')]
    const metric = ranking([
      [1, '11680', '강남구'],
      [2, '11440', '마포구'],
    ])

    expect(buildRankingInsight(views, metric)).toBeNull()
  })

  it('지표 목록이 비면 문장을 만들지 않는다', () => {
    expect(
      buildRankingInsight([view(1, '11680', '강남구')], ranking([])),
    ).toBeNull()
  })

  it('조회수 목록이 비면 문장을 만들지 않는다', () => {
    // 두 목록의 차이를 말하는 문장이라 한쪽만으로는 만들 수 없다.
    expect(
      buildRankingInsight([], ranking([[1, '11680', '강남구']])),
    ).toBeNull()
  })
})
