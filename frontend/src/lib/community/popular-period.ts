import type { CommunityPopularPeriod } from '@/types/community'

export type { CommunityPopularPeriod }

/*
  인기 글 기간(#531, BE #472 — backend/docs/frontend-api-usage-guide.md 「인기 글 기간」).
  인기 탭의 기간 칩과 URL `period` 가 이 표를 쓴다. 순서가 곧 칩 순서다.
*/
export const COMMUNITY_POPULAR_PERIOD_LABELS: Record<
  CommunityPopularPeriod,
  string
> = {
  WEEK: '이번 주',
  MONTH: '이번 달',
  ALL: '전체 기간',
}

export const COMMUNITY_POPULAR_PERIODS = (
  ['WEEK', 'MONTH', 'ALL'] as const
).map(value => ({ value, label: COMMUNITY_POPULAR_PERIOD_LABELS[value] }))

/** 서버 기본값과 같다. URL 에서는 생략한다(기존 `view=popular` 주소가 그대로 이번 주다). */
export const COMMUNITY_DEFAULT_POPULAR_PERIOD: CommunityPopularPeriod = 'WEEK'

/**
 * URL 값 → 기간. 대문자 정확 일치만 받는다. 서버는 모르는 값을 400(`COMMUNITY_117`)으로 막으므로
 * 손으로 고친 주소가 오류 화면이 되지 않게 기본값으로 돌린다.
 */
export const parseCommunityPopularPeriod = (
  value: string | null,
): CommunityPopularPeriod =>
  COMMUNITY_POPULAR_PERIODS.find(period => period.value === value)?.value ??
  COMMUNITY_DEFAULT_POPULAR_PERIOD

const DAY_MS = 24 * 60 * 60 * 1000

/** 기간 길이(일). 전체 기간은 하한이 없다. 서버 `CommunityPopularPeriod.since(now)` 와 같은 값이다. */
const PERIOD_DAYS: Record<CommunityPopularPeriod, number | null> = {
  WEEK: 7,
  MONTH: 30,
  ALL: null,
}

/**
 * 작성 시각이 기간 안인가 — 달력 주·월이 아니라 `now` 에서 기간을 뺀 롤링 기간이다.
 * 목 소스가 서버 동작을 흉내 낼 때 쓴다. 화면은 서버가 거른 결과를 그대로 그린다.
 */
export const isWithinCommunityPopularPeriod = (
  createdAt: string,
  period: CommunityPopularPeriod,
  nowMs: number,
) => {
  const days = PERIOD_DAYS[period]

  if (days === null) {
    return true
  }

  return Date.parse(createdAt) >= nowMs - days * DAY_MS
}

/** 인기 탭 빈 상태 제목. 전체 기간은 기간을 말하지 않는다. */
export const getCommunityPopularEmptyTitle = (
  period: CommunityPopularPeriod,
) =>
  period === 'ALL'
    ? '인기 글이 아직 없어요'
    : `${COMMUNITY_POPULAR_PERIOD_LABELS[period]} 인기 글이 아직 없어요`
