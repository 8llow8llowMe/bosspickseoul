import { describe, expect, it } from 'vitest'

import type { AnalysisRankingBody } from '@/types/status'

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
