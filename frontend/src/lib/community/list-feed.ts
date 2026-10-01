/*
  커뮤니티 목록 끝 규칙(community.md §S4 「목록 — 끊기지 않는 피드」, CM-029).
  「게시글 더 보기」 버튼 대신 목록 끝 감시 요소가 보이면 다음 쪽을 부른다.
*/

/** 감시 요소를 화면 아래 400px 앞에서 미리 잡는다. 가로 여유는 두지 않는다. */
export const COMMUNITY_LIST_AUTOLOAD_ROOT_MARGIN = '400px 0px'

export type CommunityAutoLoadInput = {
  isIntersecting: boolean
  hasNextPage: boolean
  /**
   * 이 목록 쿼리가 **무엇이든** 받는 중이다(React Query `isFetching` — 다음 쪽뿐 아니라 무효화·
   * 재마운트 refetch 도). refetch 중에 부른 다음 쪽은 `fetchNextPage({ cancelRefetch: false })` 가
   * 진행 중 요청에 흡수해 버려 아무 일도 일어나지 않는다. 그동안은 부르지 않고, 끝나는 순간 다시 본다.
   */
  isFetching: boolean
  /** 다음 쪽이 실패해 `다시 불러오기` 가 떠 있다. 사용자가 누를 때까지 자동으로 다시 부르지 않는다. */
  hasLoadMoreError: boolean
}

export const shouldAutoLoadNextPage = ({
  isIntersecting,
  hasNextPage,
  isFetching,
  hasLoadMoreError,
}: CommunityAutoLoadInput) =>
  isIntersecting && hasNextPage && !isFetching && !hasLoadMoreError

export type CommunityFeedFooter =
  'none' | 'load-more-error' | 'loading-more' | 'sentinel' | 'end'

type CommunityFeedFooterInput = {
  postsLength: number
  hasNextPage: boolean
  isFetchingNextPage: boolean
  hasLoadMoreError: boolean
}

/**
 * 글 목록 아래에 무엇을 그릴지. 실패 > 로딩 > 감시 요소 > 끝 순서다.
 *
 * - 실패면 다시 시도하는 동안에도 `다시 불러오기` 자리를 지킨다 — 스켈레톤으로 바꿨다가 또
 *   실패하면 버튼이 깜빡인다.
 * - 로딩 중엔 감시 요소를 **내린다**. 다음 쪽이 붙은 뒤 다시 올라온 감시 요소는 새로 관찰되고,
 *   IntersectionObserver 는 관찰 시작 때 현재 교차 상태를 한 번 알려 준다. 그래서 쪽이 짧아
 *   감시 요소가 계속 화면 안에 있어도 다음 쪽을 이어 부른다.
 */
export const getCommunityFeedFooter = ({
  postsLength,
  hasNextPage,
  isFetchingNextPage,
  hasLoadMoreError,
}: CommunityFeedFooterInput): CommunityFeedFooter => {
  if (postsLength === 0) {
    return 'none'
  }

  if (hasLoadMoreError) {
    return 'load-more-error'
  }

  if (isFetchingNextPage) {
    return 'loading-more'
  }

  return hasNextPage ? 'sentinel' : 'end'
}
