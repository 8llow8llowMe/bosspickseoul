import { describe, expect, it } from 'vitest'

import type { AnalysisRankingBody } from '@/types/status'

import { MIN_VISIBLE_VIEW_COUNT } from '@/lib/rankings/ranking-format'

import {
  describeLivePopular,
  LIVE_POPULAR_SIZE,
  nextLivePopularIndex,
  toLivePopularView,
} from './live-popular'

const body = (
  rankings: AnalysisRankingBody['rankings'],
  windowHours = 24,
): AnalysisRankingBody => ({
  areaType: { code: 'COMMERCIAL', name: '상권', description: '' },
  windowHours,
  rankings,
})

const ranking = (rank: number, areaName: string | null = `상권${rank}`) => ({
  rank,
  areaCode: `C${rank}`,
  areaName,
  viewCount: rank * 100,
})

describe('toLivePopularView', () => {
  it('응답이 없거나 집계가 비면 띠를 그리지 않는다', () => {
    expect(toLivePopularView(null)).toBeNull()
    expect(toLivePopularView(body([]))).toBeNull()
  })

  it(`최대 ${LIVE_POPULAR_SIZE}개까지만 돌린다`, () => {
    const view = toLivePopularView(
      body(Array.from({ length: 8 }, (_, index) => ranking(index + 1))),
    )

    expect(view?.items).toHaveLength(LIVE_POPULAR_SIZE)
    expect(view?.windowLabel).toBe('최근 24시간')
  })

  it('이름이 비면 코드를 적는다', () => {
    expect(toLivePopularView(body([ranking(1, null)]))?.items[0].name).toBe(
      'C1',
    )
  })
})

describe('nextLivePopularIndex', () => {
  it('끝에 닿으면 처음으로 돌아간다', () => {
    expect(nextLivePopularIndex(0, 3)).toBe(1)
    expect(nextLivePopularIndex(2, 3)).toBe(0)
    expect(nextLivePopularIndex(4, 0)).toBe(0)
  })
})

describe('describeLivePopular', () => {
  it('조회 집계를 그대로 읽고 추천 활동처럼 지어내지 않는다', () => {
    const label = describeLivePopular(
      { rank: 1, commercialCode: 'C1', name: '강남역', viewCount: 1234 },
      '최근 24시간',
    )

    expect(label).toBe('최근 24시간 많이 본 상권 1위, 강남역, 조회 1,234회')
    expect(label).not.toContain('추천받')
  })
})

/*
 * #600(진단 H9). 「조회 2회」는 아무도 쓰지 않는 서비스처럼 읽힌다. 다섯 곳 중 하나라도 임계값 아래면
 * 모든 줄이 순위·이름만 보인다. 홈·분석 지름길과 같은 임계값이다.
 */
describe('낮은 조회 수(#600)', () => {
  const low = (rank: number, viewCount: number) => ({
    rank,
    areaCode: `C${rank}`,
    areaName: `상권${rank}`,
    viewCount,
  })

  it('임계값 이상이면 조회 수를 적는다', () => {
    expect(
      toLivePopularView(body([ranking(1), ranking(2)]))?.showViewCounts,
    ).toBe(true)
  })

  it('한 곳이라도 임계값 아래면 조회 수를 적지 않는다', () => {
    const view = toLivePopularView(
      body([low(1, 500), low(2, MIN_VISIBLE_VIEW_COUNT - 1)]),
    )

    expect(view?.showViewCounts).toBe(false)
    // 순위·이름은 실제 집계라 그대로 둔다.
    expect(view?.items.map(item => item.name)).toEqual(['상권1', '상권2'])
  })

  it('스크린리더 문장도 조회 수 없이 순위·이름만 읽는다', () => {
    const label = describeLivePopular(
      { rank: 1, commercialCode: 'C1', name: '강남역', viewCount: 2 },
      '최근 24시간',
      false,
    )

    expect(label).toBe('최근 24시간 많이 본 상권 1위, 강남역')
    expect(label).not.toContain('조회')
  })
})
