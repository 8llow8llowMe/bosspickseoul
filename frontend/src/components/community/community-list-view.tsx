'use client'

import {
  useRef,
  type ChangeEvent,
  type FormEvent,
  type MouseEventHandler,
  type ReactNode,
} from 'react'
import Link from 'next/link'
import { Heart, MessageCircle, Pencil, Search, X } from 'lucide-react'
import styled, { css } from 'styled-components'
import CommunityFeedback from '@/components/community/community-feedback'
import CommunityListSkeleton from '@/components/community/community-list-skeleton'
import CommunityWriter from '@/components/community/community-writer'
import { useCommunityHeaderHidden } from '@/hooks/use-community-header-hidden'
import { useLoadMoreSentinel } from '@/hooks/use-load-more-sentinel'
import { useNarrowViewport } from '@/hooks/use-narrow-viewport'
import { useWriteFabCollapsed } from '@/hooks/use-write-fab-collapsed'
import { formatCommunityCount, formatRelativeTime } from '@/lib/community'
import { communityOutlinedField } from '@/lib/community/field-styles'
import { getCommunityFeedFooter } from '@/lib/community/list-feed'
import type { CommunityListView as CommunityListViewMode } from '@/lib/community/community-state'
import { COMMUNITY_HEADER_HIDDEN_SELECTOR } from '@/lib/community/hidden-header'
import {
  getCommunityListHeading,
  getCommunityPostRank,
} from '@/lib/community/list-heading'
import type { CommunityPostSummary } from '@/types/community'
import { centeredColumn } from '@/styles/layout'

export type CommunityListStatus = 'loading' | 'error' | 'empty' | 'ready'
export type CommunityEmptyCause = 'keyword' | 'target' | 'liked' | 'general'

export type CommunityListViewPost = CommunityPostSummary & {
  href: string
  onNavigate?: MouseEventHandler<HTMLAnchorElement>
}

export type CommunityListViewProps = {
  status: CommunityListStatus
  errorMessage: string | null
  loadMoreErrorMessage: string | null
  emptyCause: CommunityEmptyCause
  posts: CommunityListViewPost[]
  view: CommunityListViewMode
  keyword: string
  searchValue: string
  /** 지역 대상이 걸려 있을 때만 값이 있다 — 제목이 `{이름} 이야기` 가 된다. */
  boardTargetName: string | null
  /** 대상 해제 주소. 대상이 있을 때만 「전체 글 보기」 링크로 그린다. */
  allPostsHref: string | null
  locationPicker: ReactNode
  writeHref: string
  hasNextPage: boolean
  isFetchingNextPage: boolean
  /**
   * 목록 쿼리가 무엇이든 받는 중이다(다음 쪽 + 백그라운드 refetch). 자동 다음 쪽만 이 값을 본다 —
   * refetch 중 부른 다음 쪽은 그 요청에 흡수돼 사라지므로 끝난 뒤 이어 부른다(CM-029).
   */
  isFetching: boolean
  onSearchValueChange: (value: string) => void
  onSearchSubmit: () => void
  /** 지우기 버튼. 입력값을 비우고, 검색이 걸려 있으면 검색도 푼다. */
  onSearchClear: () => void
  onViewChange: (view: CommunityListViewMode) => void
  onEmptyAction: () => void
  onRetry: () => void
  /** 목록 끝 감시 요소가 보이면 자동으로 부른다(CM-029). 버튼은 없다. */
  onLoadMore: () => void
  onRetryLoadMore: () => void
  /**
   * 우 레일(`≥1080`). 목록 페이지가 matchMedia 로 폭을 판정해 그때만 넘긴다 — CSS 로 숨기면 인기 글
   * 쿼리가 모바일에서도 나간다(community.md §S4 「목록 3단」).
   */
  rail?: ReactNode
  /** 좌 내비(`≥1360`). 있으면 1360 이상에서 탭 줄을 숨긴다 — 같은 조작을 두 곳에 두지 않는다. */
  nav?: ReactNode
}

/*
  커뮤니티 구간(DESIGN.md §8 피드형 화면 메모): <480 모바일 · 480–1079 태블릿(--w-read 1단) ·
  1080–1359 피드 + 우 레일 300 · ≥1360 좌 내비 240 · 피드 · 우 레일 300(합계 1308, --w-wide 안).
  레거시 640·760·768 은 쓰지 않는다.
*/
const MOBILE_QUERY = '(max-width: 479px)'
const MOBILE = `@media ${MOBILE_QUERY}`
const TABLET_UP = '@media (min-width: 480px)'
const RAIL_UP = '@media (min-width: 1080px)'
const NAV_UP = '@media (min-width: 1360px)'

/*
  FAB 와 그 아래 여백. Page 하단 여백이 이 둘 + 16 을 넘어야 마지막 행을 가리지 않는다.
  접힌 원형이 56 이라(community.md §S4 FAB) 펼친 알약도 56 으로 맞춘다 — 접을 때 높이가 튀지 않는다.
*/
const FAB_HEIGHT = 56
const FAB_OFFSET = 20

/*
  사이트 헤더(site-header.tsx)는 sticky top:0, 높이 64 + 아래 테두리 1 이다. 툴바를 64 에
  붙여 헤더 테두리(z-index 20)가 툴바 위에 겹쳐 보이게 한다 — 65 면 1px 틈으로 글이 비친다.
*/
const SITE_HEADER_HEIGHT = 64

/*
  골격은 그리드 영역이다. 트랙은 레일·내비가 아직 렌더되지 않았어도(SSR·폭 판정 전) 미리 잡혀 있어
  hydration 뒤 레일이 들어와도 피드가 옆으로 밀리지 않는다. 피드 트랙은 --w-read 상한이고 묶음을
  가운데로 모은다 — 상세 1단계 골격처럼 본문과 레일 사이가 벌어지지 않는다(CM-020).
  1080 에서 셸(1040)이 묶음(1044)보다 4 좁은 만큼은 minmax(0, …) 인 피드 트랙이 줄어 받는다.
*/
const Page = styled.main`
  ${centeredColumn('var(--w-wide)')}
  padding: 32px 0 64px;
  display: grid;
  grid-template-columns: minmax(0, var(--w-read));
  grid-template-areas: 'feed';
  justify-content: center;
  align-items: start;
  column-gap: 24px;

  ${RAIL_UP} {
    grid-template-columns: minmax(0, var(--w-read)) 300px;
    grid-template-areas: 'feed rail';
  }

  ${NAV_UP} {
    grid-template-columns: 240px minmax(0, var(--w-read)) 300px;
    grid-template-areas: 'nav feed rail';
  }

  ${MOBILE} {
    padding-top: 24px;
    padding-bottom: calc(
      ${FAB_HEIGHT}px + ${FAB_OFFSET}px + 16px + env(safe-area-inset-bottom)
    );
  }
`

const FeedColumn = styled.div`
  grid-area: feed;
  min-width: 0;
  display: grid;
  gap: 16px;
`

const NavArea = styled.div`
  grid-area: nav;
  min-width: 0;
  /* sticky 내비가 피드 높이만큼 내려오도록 칸을 늘려 둔다. 내비 자체가 sticky 다. */
  align-self: stretch;
`

const RailArea = styled.div`
  grid-area: rail;
  min-width: 0;
  align-self: stretch;
`

const HeadingRow = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
`

const HeadingCopy = styled.div`
  min-width: 0;
  display: grid;
  gap: 4px;
`

const Title = styled.h1`
  color: var(--color-text-900);
  font-size: 22px;
  font-weight: 700;
  line-height: 1.35;
  overflow-wrap: anywhere;
  word-break: keep-all;
`

const Subtitle = styled.p`
  color: var(--color-text-600);
  font-size: 14px;
  font-weight: 400;
  line-height: 1.5;
`

const AllPostsLink = styled(Link)`
  width: fit-content;
  min-height: 40px;
  display: inline-flex;
  align-items: center;
  color: var(--color-text-primary-on-light);
  font-size: 14px;
  font-weight: 600;

  &:focus-visible {
    border-radius: var(--radius-control);
  }
`

const WriteLink = styled(Link)`
  min-height: 48px;
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 20px;
  border: 1px solid var(--color-fill-primary-text);
  border-radius: var(--radius-control);
  background: var(--color-fill-primary-text);
  color: var(--color-surface);
  font-size: 14px;
  font-weight: 700;
`

const DesktopWriteLink = styled(WriteLink)`
  ${MOBILE} {
    display: none;
  }
`

/*
  접기(community.md §S4 FAB): 아래로 내리면 글자를 접어 아이콘만 남은 56 원형, 위로 올리면 편다.
  폭(auto ↔ 56)은 전환되지 않으므로 좌우 여백·간격·글자 폭을 줄여 자연스럽게 좁힌다 —
  내용 폭이 56 아래로 내려가면 min-width 가 원형을 지킨다. 접힌 모양은 속성 선택자라
  hydration 전 정적 CSS 에도 실린다.
*/
const MobileWriteLink = styled(WriteLink)`
  display: none;

  ${MOBILE} {
    position: fixed;
    z-index: 20;
    right: 16px;
    bottom: calc(${FAB_OFFSET}px + env(safe-area-inset-bottom));
    display: inline-flex;
    min-width: ${FAB_HEIGHT}px;
    min-height: ${FAB_HEIGHT}px;
    border-radius: var(--radius-pill);
    box-shadow: var(--shadow-level-3);
    transition:
      padding var(--motion-standard) var(--ease-standard),
      gap var(--motion-standard) var(--ease-standard);

    &[data-collapsed='true'] {
      padding: 0;
      gap: 0;
    }

    @media (prefers-reduced-motion: reduce) {
      transition: none;
    }
  }
`

const FabLabel = styled.span`
  max-width: 4em;
  overflow: hidden;
  white-space: nowrap;
  transition:
    max-width var(--motion-standard) var(--ease-standard),
    opacity var(--motion-standard) var(--ease-standard);

  [data-collapsed='true'] > & {
    max-width: 0;
    opacity: 0;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

const Toolbar = styled.div`
  position: sticky;
  z-index: 10;
  top: ${SITE_HEADER_HEIGHT}px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 0;
  /* 스크롤하면 글 행이 툴바 밑으로 지나간다 — 비치지 않게 바탕을 칠한다. */
  background: var(--color-surface);
  transition: top var(--motion-standard) var(--ease-standard);

  /*
    숨는 헤더(community.md §S4 「숨는 헤더」, CM-043). 헤더가 위로 숨는 것과 같은 선택자라
    헤더가 남아 있으면(메뉴 열림·헤더 안 포커스) 툴바도 64 에 남는다.
  */
  ${MOBILE} {
    ${COMMUNITY_HEADER_HIDDEN_SELECTOR} & {
      top: 0;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

const SearchForm = styled.form`
  position: relative;
  min-width: 0;
  flex: 1 1 auto;
`

const SearchIcon = styled(Search)`
  position: absolute;
  top: 50%;
  left: 16px;
  color: var(--color-text-caption);
  transform: translateY(-50%);
  pointer-events: none;
`

const SearchInput = styled.input<{ $hasValue: boolean }>`
  width: 100%;
  min-height: 48px;
  padding: 0 ${props => (props.$hasValue ? '48px' : '16px')} 0 40px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-field);
  background: var(--color-surface);
  color: var(--color-text-900);
  font: inherit;
  font-size: 16px;
  appearance: none;

  &::placeholder {
    color: var(--color-placeholder);
  }

  /* 우리 지우기 버튼과 겹치지 않게 브라우저 기본 ✕ 를 숨긴다. */
  &::-webkit-search-cancel-button {
    appearance: none;
  }

  /* 포커스·오류·크기 — 커뮤니티 입력칸 공통 조각(안쪽 한 줄, 글로우 없음, resize none). */
  ${communityOutlinedField}
`

const SearchClearButton = styled.button`
  position: absolute;
  top: 50%;
  right: 4px;
  width: 40px;
  height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: var(--radius-control);
  background: transparent;
  color: var(--color-text-600);
  cursor: pointer;
  transform: translateY(-50%);
`

const TabRow = styled.div<{ $replacedByNav: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  border-bottom: 1px solid var(--color-border-200);

  /*
    ≥1360 은 좌 내비가 같은 조작을 맡는다(CM-037). 내비가 실제로 그려졌을 때만 숨긴다 — 폭 판정 전
    (SSR) 에 탭까지 숨기면 잠깐 조작이 하나도 없다. display:none 이라 접근성 트리에서도 빠진다.
  */
  ${props =>
    props.$replacedByNav
      ? css`
          ${NAV_UP} {
            display: none;
          }
        `
      : null}
`

const TabGroup = styled.div`
  display: flex;
  gap: 4px;
`

const Tab = styled.button<{ $selected: boolean }>`
  min-width: 48px;
  min-height: 44px;
  padding: 0 12px;
  border: 0;
  /* 밑줄은 TabRow 의 아래 테두리 위에 겹친다 — 선택된 탭만 파랗게 */
  border-bottom: 2px solid
    ${props => (props.$selected ? 'var(--color-primary-700)' : 'transparent')};
  margin-bottom: -1px;
  background: transparent;
  color: ${props =>
    props.$selected ? 'var(--color-text-900)' : 'var(--color-text-600)'};
  font: inherit;
  font-size: 16px;
  font-weight: ${props => (props.$selected ? 700 : 600)};
  cursor: pointer;

  &:focus-visible {
    border-radius: var(--radius-control) var(--radius-control) 0 0;
  }
`

const LikedToggle = styled.button<{ $selected: boolean }>`
  min-height: 44px;
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 4px;
  padding: 0 8px;
  border: 0;
  border-radius: var(--radius-control);
  background: transparent;
  color: ${props =>
    props.$selected
      ? 'var(--color-text-primary-on-light)'
      : 'var(--color-text-600)'};
  font: inherit;
  font-size: 14px;
  font-weight: ${props => (props.$selected ? 700 : 600)};
  cursor: pointer;
`

const Feed = styled.section`
  display: grid;
  gap: 16px;
`

const PostList = styled.ul`
  display: grid;
  margin: 0;
  padding: 0;
  list-style: none;
`

/*
  카드 대신 구분선 행이다. hover 바탕이 글자에 붙지 않게 좌우 12 를 띄우고, 그만큼 바깥으로
  빼 글자 열은 제목·툴바와 같은 선에 둔다. 셸 거터(16)가 12 보다 넓어 가로 스크롤은 안 생긴다.
*/
const PostLink = styled(Link)`
  min-height: 52px;
  display: flex;
  align-items: flex-start;
  gap: 16px;
  margin: 0 -12px;
  padding: 20px 12px;
  border-bottom: 1px solid var(--color-border-200);
  color: inherit;
  transition: background-color var(--motion-fast) var(--ease-standard);

  &:hover {
    background: var(--color-background-muted);
  }

  &:focus-visible {
    outline: 2px solid var(--color-primary-700);
    outline-offset: -2px;
    border-radius: var(--radius-control);
  }

  ${MOBILE} {
    gap: 12px;
    padding: 16px 12px;
  }
`

const Rank = styled.span`
  min-width: 20px;
  flex: 0 0 auto;
  color: var(--color-text-primary-on-light);
  font-size: 20px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: 1.3;
  text-align: center;
`

const VisuallyHidden = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
`

const RowText = styled.div`
  min-width: 0;
  flex: 1 1 auto;
  display: grid;
  gap: 4px;
`

const RowMeta = styled.div`
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--color-text-caption);
  font-size: 13px;
  font-weight: 400;

  time {
    flex: 0 0 auto;
  }
`

/* 행 전체가 링크다 — 지역은 글자 라벨이다. 링크를 또 두면 중첩 인터랙티브가 된다. */
const RegionLabel = styled.span`
  min-width: 0;
  overflow: hidden;
  color: var(--color-text-primary-on-light);
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const MetaDivider = styled.span`
  width: 3px;
  height: 3px;
  flex: 0 0 auto;
  border-radius: 50%;
  background: var(--color-border-300);
`

const PostTitle = styled.h2`
  display: -webkit-box;
  overflow: hidden;
  color: var(--color-text-900);
  font-size: 16px;
  font-weight: 600;
  line-height: 1.5;
  overflow-wrap: anywhere;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
`

const Preview = styled.p`
  display: -webkit-box;
  overflow: hidden;
  color: var(--color-text-600);
  font-size: 14px;
  font-weight: 400;
  line-height: 1.6;
  overflow-wrap: anywhere;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
`

const RowFooter = styled.div`
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
  color: var(--color-text-caption);
  font-size: 13px;
  font-weight: 400;

  /* 긴 닉네임은 말줄임으로 줄이고 반응 수는 자리를 지킨다. */
  > [data-community-writer] {
    flex: 0 1 auto;
  }
`

const Reaction = styled.span<{ $liked?: boolean }>`
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 4px;
  /* 내가 좋아요한 글 — 상세 반응 바의 눌린 하트와 같은 토큰. */
  ${props => (props.$liked ? 'color: var(--color-text-primary-on-light);' : '')}
`

const Thumbnail = styled.span`
  width: 72px;
  height: 72px;
  flex: 0 0 auto;
  overflow: hidden;
  border-radius: var(--radius-control);
  background: var(--color-surface-muted);

  ${TABLET_UP} {
    width: 96px;
    height: 96px;
  }

  img {
    width: 100%;
    height: 100%;
    display: block;
    object-fit: cover;
  }
`

/* 목록 끝 감시 요소. 보이지 않는 1px 줄이고 IntersectionObserver 가 여유 400px 앞에서 잡는다. */
const Sentinel = styled.div`
  height: 1px;
`

const FeedEnd = styled.div`
  display: grid;
  justify-items: center;
  gap: 4px;
  padding: 24px 0;
  color: var(--color-text-600);
  font-size: 14px;
  font-weight: 400;
  line-height: 1.5;
  text-align: center;
`

const FeedEndWriteLink = styled(Link)`
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  padding: 0 12px;
  border-radius: var(--radius-control);
  color: var(--color-text-primary-on-light);
  font-size: 14px;
  font-weight: 600;
`

const LoadMoreError = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  border: 1px solid var(--color-danger);
  border-radius: var(--radius-control);
  background: var(--color-surface);
  color: var(--color-danger);
  font-size: 13px;
  line-height: 1.6;

  ${MOBILE} {
    align-items: stretch;
    flex-direction: column;
  }
`

const LoadMoreRetryButton = styled.button`
  min-height: 44px;
  flex: 0 0 auto;
  padding: 0 16px;
  border: 1px solid var(--color-danger);
  border-radius: var(--radius-control);
  background: var(--color-surface);
  color: var(--color-danger);
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
`

/* 「보기」는 최신·인기 둘이다. 좋아요한 글은 「내 활동」이라 탭 줄 오른쪽 끝 토글로 뺐다. */
const tabs: Array<{ value: CommunityListViewMode; label: string }> = [
  { value: 'latest', label: '최신' },
  { value: 'popular', label: '인기' },
]

const emptyCopy: Record<
  CommunityEmptyCause,
  { title: string; description: string; actionLabel: string }
> = {
  keyword: {
    title: '검색 결과가 없어요',
    description: '다른 검색어로 사장님들의 이야기를 찾아보세요.',
    actionLabel: '검색어 초기화',
  },
  target: {
    title: '선택한 지역의 이야기가 아직 없어요',
    description: '서울 전체 게시글을 확인하거나 첫 이야기를 남겨 보세요.',
    actionLabel: '지역 필터 해제',
  },
  liked: {
    title: '좋아요 한 게시글이 없어요',
    description: '전체 글에서 나중에 다시 보고 싶은 이야기를 찾아보세요.',
    actionLabel: '전체 글 보기',
  },
  general: {
    title: '아직 등록된 이야기가 없어요',
    description: '다른 사장님에게 도움이 될 첫 번째 경험을 공유해 보세요.',
    actionLabel: '첫 게시글 작성',
  },
}

export default function CommunityListView({
  status,
  errorMessage,
  loadMoreErrorMessage,
  emptyCause,
  posts,
  view,
  keyword,
  searchValue,
  boardTargetName,
  allPostsHref,
  locationPicker,
  writeHref,
  hasNextPage,
  isFetchingNextPage,
  isFetching,
  onSearchValueChange,
  onSearchSubmit,
  onSearchClear,
  onViewChange,
  onEmptyAction,
  onRetry,
  onLoadMore,
  onRetryLoadMore,
  rail,
  nav,
}: CommunityListViewProps) {
  const searchInputRef = useRef<HTMLInputElement>(null)
  const hasLoadMoreError = Boolean(loadMoreErrorMessage)
  const footer = getCommunityFeedFooter({
    postsLength: posts.length,
    hasNextPage,
    isFetchingNextPage,
    hasLoadMoreError,
  })
  const sentinelRef = useLoadMoreSentinel({
    hasNextPage,
    isFetching,
    hasLoadMoreError,
    onLoadMore,
  })
  // `<480` 에서만 스크롤을 듣는다. 폭을 모르는 동안(null)은 펼친 채 둔다.
  const isMobile = useNarrowViewport(MOBILE_QUERY) === true
  const fabCollapsed = useWriteFabCollapsed(isMobile)
  // 숨는 헤더는 FAB 접힘과 같은 판정이다 — 스크롤을 한 번만 듣고 둘이 같은 값을 쓴다(CM-043).
  useCommunityHeaderHidden(fabCollapsed)

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onSearchSubmit()
  }

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    onSearchValueChange(event.currentTarget.value)
  }

  const handleSearchClear = () => {
    onSearchClear()
    // 지우기 버튼은 값이 비면 사라진다 — 포커스를 입력칸으로 넘겨 잃지 않게 한다.
    searchInputRef.current?.focus()
  }

  const selectedEmptyCopy = emptyCopy[emptyCause]
  const heading = getCommunityListHeading({ keyword, boardTargetName })
  const likedSelected = view === 'liked'

  return (
    <Page data-community-list-layout={nav ? 'three' : rail ? 'two' : 'one'}>
      {nav ? <NavArea>{nav}</NavArea> : null}
      <FeedColumn>
        <HeadingRow>
          <HeadingCopy>
            <Title>{heading.title}</Title>
            {allPostsHref && !keyword ? (
              <AllPostsLink href={allPostsHref} replace scroll={false}>
                전체 글 보기
              </AllPostsLink>
            ) : heading.description ? (
              <Subtitle>{heading.description}</Subtitle>
            ) : null}
          </HeadingCopy>
          <DesktopWriteLink data-desktop-write-action="true" href={writeHref}>
            <Pencil aria-hidden="true" size={16} />
            글쓰기
          </DesktopWriteLink>
        </HeadingRow>

        <Toolbar aria-label="커뮤니티 탐색" role="region">
          <SearchForm role="search" onSubmit={handleSubmit}>
            <SearchIcon aria-hidden="true" size={18} />
            <SearchInput
              ref={searchInputRef}
              $hasValue={Boolean(searchValue)}
              aria-label="게시글 검색어"
              enterKeyHint="search"
              name="keyword"
              onChange={handleSearchChange}
              placeholder="제목·내용 검색"
              type="search"
              value={searchValue}
            />
            {searchValue ? (
              <SearchClearButton
                aria-label="검색어 지우기"
                onClick={handleSearchClear}
                type="button"
              >
                <X aria-hidden="true" size={18} />
              </SearchClearButton>
            ) : null}
          </SearchForm>
          {locationPicker}
        </Toolbar>

        <TabRow $replacedByNav={Boolean(nav)} data-community-tab-row="true">
          <TabGroup aria-label="게시글 보기" role="group">
            {tabs.map(tab => (
              <Tab
                aria-pressed={view === tab.value}
                $selected={view === tab.value}
                key={tab.value}
                onClick={() => {
                  onViewChange(tab.value)
                }}
                type="button"
              >
                {tab.label}
              </Tab>
            ))}
          </TabGroup>
          <LikedToggle
            aria-pressed={likedSelected}
            $selected={likedSelected}
            data-liked-toggle="true"
            onClick={() => {
              onViewChange(likedSelected ? 'latest' : 'liked')
            }}
            type="button"
          >
            <Heart
              aria-hidden="true"
              fill={likedSelected ? 'currentColor' : 'none'}
              size={16}
            />
            좋아요한 글
          </LikedToggle>
        </TabRow>

        {/*
        피드 전체를 live region 으로 두지 않는다 — 자동 다음 쪽마다 붙은 글을 통째로 읽게 된다.
        알림은 스켈레톤(role=status)·실패(role=alert)·끝(role=status)이 각자 맡는다.
        aria-busy 도 걸지 않는다 — busy 인 조상 아래의 status 알림은 busy 가 풀릴 때까지 미뤄질 수
        있는데, 풀리는 순간 스켈레톤은 이미 사라져 「불러오는 중」 이 끝내 읽히지 않는다.
      */}
        <Feed aria-label="커뮤니티 피드">
          {status === 'loading' ? (
            <CommunityListSkeleton variant="initial" />
          ) : status === 'error' ? (
            <CommunityFeedback
              actionLabel="다시 시도"
              description={errorMessage ?? '잠시 후 다시 시도해 주세요.'}
              kind="error"
              onAction={onRetry}
            />
          ) : status === 'empty' ? (
            <CommunityFeedback
              actionLabel={selectedEmptyCopy.actionLabel}
              description={selectedEmptyCopy.description}
              kind="empty"
              onAction={onEmptyAction}
              title={selectedEmptyCopy.title}
            />
          ) : (
            <>
              <PostList>
                {posts.map((post, index) => {
                  const rank = getCommunityPostRank(view, index)

                  return (
                    <li key={post.postId}>
                      <PostLink
                        data-community-post-id={post.postId}
                        href={post.href}
                        onClick={post.onNavigate}
                      >
                        {rank ? (
                          <Rank data-post-rank={rank}>
                            <span aria-hidden="true">{rank}</span>
                            <VisuallyHidden>{`인기 ${rank}위`}</VisuallyHidden>
                          </Rank>
                        ) : null}
                        <RowText>
                          <RowMeta>
                            <RegionLabel data-post-region="true">
                              {post.targetName ?? '서울 전체'}
                            </RegionLabel>
                            <MetaDivider aria-hidden="true" />
                            <time dateTime={post.createdAt}>
                              {formatRelativeTime(post.createdAt)}
                            </time>
                          </RowMeta>
                          <PostTitle>{post.title}</PostTitle>
                          <Preview>{post.previewContent}</Preview>
                          <RowFooter>
                            <CommunityWriter
                              nickname={post.writerNickname}
                              profileImageUrl={post.writerProfileImageUrl}
                            />
                            <MetaDivider aria-hidden="true" />
                            {/*
                              내 좋아요는 표시만 한다(#530) — 행 전체가 상세 링크라 토글 버튼을 넣으면
                              중첩 인터랙티브가 된다. `null`(비로그인)은 「안 누름」이 아니라 「모름」이라
                              true 일 때만 채운다.
                            */}
                            <Reaction
                              $liked={post.liked === true}
                              aria-label={
                                post.liked === true
                                  ? `좋아요 ${post.likeCount}, 내가 좋아요한 글`
                                  : `좋아요 ${post.likeCount}`
                              }
                              data-liked={
                                post.liked === true ? 'true' : undefined
                              }
                            >
                              <Heart
                                aria-hidden="true"
                                fill={
                                  post.liked === true ? 'currentColor' : 'none'
                                }
                                size={14}
                              />
                              {formatCommunityCount(post.likeCount)}
                            </Reaction>
                            <Reaction aria-label={`댓글 ${post.commentCount}`}>
                              <MessageCircle aria-hidden="true" size={14} />
                              {formatCommunityCount(post.commentCount)}
                            </Reaction>
                            {/* 상세 메타와 같은 `조회 N`. 옛 BE 응답에는 없을 수 있어 그때는 그리지 않는다. */}
                            {typeof post.viewCount === 'number' ? (
                              <Reaction aria-label={`조회 ${post.viewCount}`}>
                                {`조회 ${formatCommunityCount(post.viewCount)}`}
                              </Reaction>
                            ) : null}
                          </RowFooter>
                        </RowText>
                        {post.thumbnailUrl ? (
                          <Thumbnail>
                            {/*
                            상세 첨부 이미지와 같은 이유로 next/image 를 쓰지 않는다 — MinIO
                            주소는 원격 호스트 등록 대상이 아니다. 제목이 이미 링크 이름이라
                            썸네일은 장식(alt="")이다.
                          */}
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              alt=""
                              loading="lazy"
                              src={post.thumbnailUrl}
                            />
                          </Thumbnail>
                        ) : null}
                      </PostLink>
                    </li>
                  )
                })}
              </PostList>

              {footer === 'load-more-error' ? (
                <LoadMoreError data-load-more-error="true" role="alert">
                  <span>{loadMoreErrorMessage}</span>
                  <LoadMoreRetryButton onClick={onRetryLoadMore} type="button">
                    다시 불러오기
                  </LoadMoreRetryButton>
                </LoadMoreError>
              ) : footer === 'loading-more' ? (
                <CommunityListSkeleton variant="more" />
              ) : footer === 'sentinel' ? (
                <Sentinel
                  aria-hidden="true"
                  data-load-more-sentinel="true"
                  ref={sentinelRef}
                />
              ) : footer === 'end' ? (
                <FeedEnd data-community-list-end="true" role="status">
                  <span>여기까지 다 봤어요</span>
                  <FeedEndWriteLink href={writeHref}>글쓰기</FeedEndWriteLink>
                </FeedEnd>
              ) : null}
            </>
          )}
        </Feed>
      </FeedColumn>
      {rail ? <RailArea>{rail}</RailArea> : null}

      <MobileWriteLink
        aria-label="글쓰기"
        data-collapsed={fabCollapsed ? 'true' : 'false'}
        data-mobile-write-action="true"
        href={writeHref}
      >
        <Pencil aria-hidden="true" size={18} />
        <FabLabel>글쓰기</FabLabel>
      </MobileWriteLink>
    </Page>
  )
}
