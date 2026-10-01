import type { CommunityListView } from '@/lib/community/community-state'

/**
 * 커뮤니티 목록 머리의 제목 한 줄(docs/features/community/community.md §S4 「목록」).
 *
 * 우선순위는 검색어 → 대상 → 기본이다. 검색은 서울 전체에서 하므로(S4 계약) 검색 중에는
 * 대상이 걸려 있을 수 없지만, 둘이 함께 들어와도 사용자가 방금 친 검색어가 먼저 보이게 한다.
 * 보조 줄은 기본 제목에만 단다 — 대상·검색 제목은 그 자체가 설명이라 한 줄을 더 쓰지 않는다.
 */
export const getCommunityListHeading = ({
  keyword,
  boardTargetName,
}: {
  keyword: string
  boardTargetName: string | null
}): { title: string; description: string | null } => {
  if (keyword) {
    return { title: `「${keyword}」 검색 결과`, description: null }
  }

  if (boardTargetName) {
    return { title: `${boardTargetName} 이야기`, description: null }
  }

  return {
    title: '사장님 이야기',
    description: '운영 경험과 동네 소식을 나눠요',
  }
}

export const COMMUNITY_POPULAR_RANK_COUNT = 3

/** 인기 보기 상위 3건의 순위(1부터). 그 밖에는 null 이다. */
export const getCommunityPostRank = (
  view: CommunityListView,
  index: number,
): number | null =>
  view === 'popular' && index >= 0 && index < COMMUNITY_POPULAR_RANK_COUNT
    ? index + 1
    : null
