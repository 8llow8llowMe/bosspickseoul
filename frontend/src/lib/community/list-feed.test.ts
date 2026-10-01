import { describe, expect, it } from 'vitest'

import {
  COMMUNITY_LIST_AUTOLOAD_ROOT_MARGIN,
  getCommunityFeedFooter,
  shouldAutoLoadNextPage,
} from './list-feed'

/*
  목록 끝(community.md §S4 「목록 — 끊기지 않는 피드」, CM-029). 감시 요소가 보일 때 다음 쪽을
  부를지와, 목록 아래에 무엇을 그릴지를 순수 함수로 잠근다.
*/

const ready = {
  isIntersecting: true,
  hasNextPage: true,
  isFetching: false,
  hasLoadMoreError: false,
}

describe('shouldAutoLoadNextPage', () => {
  it('loads only when the sentinel is visible and a next page is idle and healthy', () => {
    expect(shouldAutoLoadNextPage(ready)).toBe(true)
  })

  it.each([
    ['the sentinel is off screen', { isIntersecting: false }],
    ['there is no next page', { hasNextPage: false }],
    // 다음 쪽이든 백그라운드 refetch 든 — refetch 중 부른 다음 쪽은 그 요청에 흡수돼 사라진다.
    ['the list query is already fetching', { isFetching: true }],
    ['the last next page failed', { hasLoadMoreError: true }],
  ])('does not load when %s', (_, override) => {
    expect(shouldAutoLoadNextPage({ ...ready, ...override })).toBe(false)
  })

  it('watches 400px ahead of the viewport on the block axis only', () => {
    expect(COMMUNITY_LIST_AUTOLOAD_ROOT_MARGIN).toBe('400px 0px')
  })
})

describe('getCommunityFeedFooter', () => {
  const base = {
    postsLength: 20,
    hasNextPage: true,
    isFetchingNextPage: false,
    hasLoadMoreError: false,
  }

  it('renders the sentinel while more pages remain', () => {
    expect(getCommunityFeedFooter(base)).toBe('sentinel')
  })

  it('swaps the sentinel for row skeletons while the next page loads', () => {
    expect(getCommunityFeedFooter({ ...base, isFetchingNextPage: true })).toBe(
      'loading-more',
    )
  })

  it('keeps the inline retry in place of the sentinel after a next-page failure, even while retrying', () => {
    expect(getCommunityFeedFooter({ ...base, hasLoadMoreError: true })).toBe(
      'load-more-error',
    )
    expect(
      getCommunityFeedFooter({
        ...base,
        hasLoadMoreError: true,
        isFetchingNextPage: true,
      }),
    ).toBe('load-more-error')
  })

  it('marks the end only when the last page is loaded and there are posts', () => {
    expect(getCommunityFeedFooter({ ...base, hasNextPage: false })).toBe('end')
    expect(
      getCommunityFeedFooter({ ...base, hasNextPage: false, postsLength: 0 }),
    ).toBe('none')
  })
})
