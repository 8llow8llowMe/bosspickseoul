import type { CommunityListView } from '@/lib/community/community-state'
import {
  COMMUNITY_DEFAULT_POPULAR_PERIOD,
  COMMUNITY_POPULAR_PERIOD_LABELS,
  type CommunityPopularPeriod,
} from '@/lib/community/popular-period'
import {
  COMMUNITY_POST_CATEGORIES,
  COMMUNITY_POST_CATEGORY_LABELS,
  type CommunityPostCategoryCode,
} from '@/lib/community/post-category'

/*
  목록 말머리·기간 필터(#529·#531). `≥480` 은 탭 줄 아래 칩 행, `<480` 은 탭 줄 오른쪽 필터 버튼 + 시트로
  그린다(community.md §S4 「목록 필터」). 두 모양이 같은 조건·같은 값을 쓰도록 판정을 여기 모은다.
*/

/** 말머리 필터가 있는 화면인가. 계약상 검색·좋아요한 글에는 말머리 필터가 없다. */
export const hasCommunityListFilter = (
  view: CommunityListView,
  keyword: string,
) => view !== 'liked' && !keyword

/** 말머리 필터 칩. 맨 앞 「전체」가 `null`(필터 없음)이다. 칩 행과 모바일 시트가 같은 목록을 쓴다. */
export const COMMUNITY_CATEGORY_FILTER_OPTIONS: Array<{
  value: CommunityPostCategoryCode | null
  label: string
}> = [{ value: null, label: '전체' }, ...COMMUNITY_POST_CATEGORIES]

export const COMMUNITY_LIST_FILTER_DEFAULT_LABEL = '필터'

/**
 * 모바일 필터 버튼 라벨. 고른 값만 ` · ` 로 잇는다 — 기본값(전체·이번 주)은 쓰지 않는다.
 * 기간은 인기 보기에서만 의미가 있다(파싱도 그 밖에서는 기본값으로 돌린다).
 */
export const getCommunityListFilterSummary = ({
  view,
  category,
  period,
}: {
  view: CommunityListView
  category: CommunityPostCategoryCode | null
  period: CommunityPopularPeriod
}) => {
  const parts: string[] = []

  if (category) {
    parts.push(COMMUNITY_POST_CATEGORY_LABELS[category])
  }

  if (view === 'popular' && period !== COMMUNITY_DEFAULT_POPULAR_PERIOD) {
    parts.push(COMMUNITY_POPULAR_PERIOD_LABELS[period])
  }

  return parts.length > 0
    ? { label: parts.join(' · '), active: true }
    : { label: COMMUNITY_LIST_FILTER_DEFAULT_LABEL, active: false }
}
