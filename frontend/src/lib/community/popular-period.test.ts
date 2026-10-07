import { describe, expect, it } from 'vitest'

import {
  COMMUNITY_DEFAULT_POPULAR_PERIOD,
  COMMUNITY_POPULAR_PERIODS,
  getCommunityPopularEmptyTitle,
  isWithinCommunityPopularPeriod,
  parseCommunityPopularPeriod,
} from './popular-period'

/*
  인기 글 기간(#531, BE #472). 값·라벨·URL 해석과 목 소스가 쓰는 롤링 기간 판정을 잠근다.
*/

describe('community popular period', () => {
  it('이번 주 · 이번 달 · 전체 기간 세 칩을 이 순서로 두고 기본은 이번 주다', () => {
    expect(COMMUNITY_POPULAR_PERIODS).toEqual([
      { value: 'WEEK', label: '이번 주' },
      { value: 'MONTH', label: '이번 달' },
      { value: 'ALL', label: '전체 기간' },
    ])
    expect(COMMUNITY_DEFAULT_POPULAR_PERIOD).toBe('WEEK')
  })

  it('계약 값(대문자 정확 일치)만 받고 나머지는 이번 주로 돌린다', () => {
    expect(parseCommunityPopularPeriod('MONTH')).toBe('MONTH')
    expect(parseCommunityPopularPeriod('ALL')).toBe('ALL')
    expect(parseCommunityPopularPeriod('WEEK')).toBe('WEEK')
    // 서버는 잘못된 값을 400 으로 막는다 — URL 을 손으로 고친 값이 요청까지 가지 않게 한다.
    expect(parseCommunityPopularPeriod('month')).toBe('WEEK')
    expect(parseCommunityPopularPeriod('YEAR')).toBe('WEEK')
    expect(parseCommunityPopularPeriod('')).toBe('WEEK')
    expect(parseCommunityPopularPeriod(null)).toBe('WEEK')
  })

  it('작성 시각 기준 롤링 기간이다 — 이번 주는 7일, 이번 달은 30일, 전체 기간은 제한 없음', () => {
    const now = Date.parse('2026-10-07T12:00:00.000Z')
    const daysAgo = (days: number) =>
      new Date(now - days * 24 * 60 * 60 * 1000).toISOString()

    expect(isWithinCommunityPopularPeriod(daysAgo(7), 'WEEK', now)).toBe(true)
    expect(isWithinCommunityPopularPeriod(daysAgo(7.01), 'WEEK', now)).toBe(
      false,
    )
    expect(isWithinCommunityPopularPeriod(daysAgo(30), 'MONTH', now)).toBe(true)
    expect(isWithinCommunityPopularPeriod(daysAgo(31), 'MONTH', now)).toBe(
      false,
    )
    expect(isWithinCommunityPopularPeriod(daysAgo(3650), 'ALL', now)).toBe(true)
  })

  it('인기 탭 빈 상태 제목이 기간을 말한다', () => {
    expect(getCommunityPopularEmptyTitle('WEEK')).toBe(
      '이번 주 인기 글이 아직 없어요',
    )
    expect(getCommunityPopularEmptyTitle('MONTH')).toBe(
      '이번 달 인기 글이 아직 없어요',
    )
    expect(getCommunityPopularEmptyTitle('ALL')).toBe('인기 글이 아직 없어요')
  })
})
