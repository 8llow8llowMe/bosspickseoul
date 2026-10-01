'use client'

import CommunityListView from '@/components/community/community-list-view'
import CommunityRegionSheet from '@/components/community/community-region-sheet'
import { parseCommunityListState } from '@/lib/community/community-state'
import { createCommunityListWriteHref } from '@/lib/community/editor-prefill'

/*
  목록 라우트의 Suspense 대기 화면(community.md §S4 「다듬기」 목록 첫 렌더).

  목록은 `useSearchParams` 로 URL 을 읽어 정적 HTML 에서는 이 대기 화면이 그려진다 — hydration 이
  끝나야 실제 목록이 들어온다. 예전에는 `null` 이라 첫 화면이 비고 푸터가 위로 올라왔다가, 목록이
  들어오면 아래로 밀려났다.

  그래서 따로 골격을 흉내 내지 않고 **실제 목록 화면을 `loading` 으로** 그린다. 머리·툴바·탭 줄·글 행
  스켈레톤이 진짜와 같은 상자라 대기 → 실제 사이에 높이가 튀지 않는다. 주소의 검색어·지역은 아직
  모르므로 기본 목록(최신 · 서울 전체) 모양이다. 손잡이는 아무 일도 하지 않는다 — hydration 전이라
  어차피 눌리지 않고, 끝나면 이 화면은 실제 목록으로 바뀐다.
*/
const noop = () => {}

const defaultState = parseCommunityListState(new URLSearchParams())

export default function CommunityListFallback() {
  return (
    <CommunityListView
      allPostsHref={null}
      boardTargetName={null}
      emptyCause="general"
      errorMessage={null}
      hasNextPage={false}
      isFetching={false}
      isFetchingNextPage={false}
      keyword=""
      loadMoreErrorMessage={null}
      locationPicker={
        <CommunityRegionSheet mockEnabled={false} onChange={noop} value={{}} />
      }
      onEmptyAction={noop}
      onLoadMore={noop}
      onRetry={noop}
      onRetryLoadMore={noop}
      onSearchClear={noop}
      onSearchSubmit={noop}
      onSearchValueChange={noop}
      onViewChange={noop}
      posts={[]}
      searchValue=""
      status="loading"
      view={defaultState.view}
      writeHref={createCommunityListWriteHref({
        state: defaultState,
        boardTargetName: undefined,
        guest: false,
      })}
    />
  )
}
