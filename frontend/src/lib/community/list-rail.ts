import {
  createAnalysisExplorerHref,
  createEmptyAnalysisSelection,
} from '@/lib/analysis/selection'
import { isApiSuccess } from '@/lib/api/response'
import {
  COMMUNITY_CURSOR_START,
  type CommunityListState,
} from '@/lib/community/community-state'
import type {
  CommunityListParams,
  CommunityPostListBody,
  CommunityPostListResponse,
} from '@/types/community'

/*
  목록 넓은 화면(community.md §S4 「목록 3단」, DESIGN.md §8 피드형 화면 메모).
  `<1080` 1단 · `1080–1359` 피드 + 우 레일 · `≥1360` 좌 내비 · 피드 · 우 레일.
  레일·내비는 CSS 로 숨기지 않고 렌더 자체를 막는다 — 숨김이면 인기 글 쿼리가 모바일에서도 나간다.
*/
export const COMMUNITY_LIST_RAIL_QUERY = '(min-width: 1080px)'
export const COMMUNITY_LIST_NAV_QUERY = '(min-width: 1360px)'

export const COMMUNITY_POPULAR_RAIL_SIZE = 5

/** 레일의 대상 범위. 검색은 서울 전체에서 하고 좋아요한 글은 필터를 푸므로(CM-005) 그 둘은 대상이 없다. */
export const getCommunityRailTarget = (state: CommunityListState) =>
  state.targetType &&
  state.targetCode &&
  !state.keyword &&
  state.view !== 'liked'
    ? { targetType: state.targetType, targetCode: state.targetCode }
    : null

/**
 * 인기 글 묶음 — 같은 목록 API 를 인기순 5건으로 한 번 더 부른다. 검색어는 싣지 않는다.
 * 기간은 피드 칩과 상관없이 **이번 주 고정**이다(#531, 결정 #3). 생략해도 서버 기본값이 이번 주지만
 * 계약 문서가 화면 의도를 드러내도록 명시하라고 한다. 고정이라 인기 글 쿼리 키에도 기간을 넣지 않는다.
 */
export const createCommunityPopularParams = (
  state: CommunityListState,
): CommunityListParams => ({
  sortType: 'POPULAR',
  orderType: 'DESC',
  period: 'WEEK',
  lastPostId: COMMUNITY_CURSOR_START,
  lastLikeCount: 0,
  size: COMMUNITY_POPULAR_RAIL_SIZE,
  ...(getCommunityRailTarget(state) ?? {}),
})

export const getCommunityPopularRailPosts = (
  response: CommunityPostListResponse | undefined,
) =>
  response && isApiSuccess<CommunityPostListBody>(response)
    ? response.dataBody.posts.contents.slice(0, COMMUNITY_POPULAR_RAIL_SIZE)
    : []

/** 레일은 이번 주 고정이라 제목도 기간을 말한다 — 피드에서 다른 기간을 보는 중이어도 헷갈리지 않게. */
export const getCommunityRailPopularTitle = (boardName: string | null) =>
  boardName ? `${boardName} 이번 주 인기 글` : '이번 주 인기 글'

export const getCommunityRailAskTitle = (boardName: string | null) =>
  boardName ? `${boardName}에 대해 물어보세요` : '사장님들께 물어보세요'

/**
 * 분석 연결. 자치구만 분석 화면이 코드 하나로 받는다. 행정동·상권은 상위 자치구 코드를 계약으로
 * 알 수 없어(목록 응답에 없다) 탐색 화면 첫 자리로 보낸다.
 */
export const getCommunityRailAnalysisLink = (
  state: CommunityListState,
  boardName: string | null,
) => {
  const target = getCommunityRailTarget(state)

  if (target?.targetType === 'DISTRICT') {
    return {
      label: boardName ? `${boardName} 상권 분석 보기` : '상권 분석 보기',
      href: createAnalysisExplorerHref({
        ...createEmptyAnalysisSelection(),
        districtCode: target.targetCode,
      }),
    }
  }

  return { label: '상권 분석에서 찾아보기', href: '/analysis' }
}
