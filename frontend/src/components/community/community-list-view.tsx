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
import styled from 'styled-components'
import CommunityFeedback from '@/components/community/community-feedback'
import CommunityWriter from '@/components/community/community-writer'
import { formatCommunityCount, formatRelativeTime } from '@/lib/community'
import type { CommunityListView as CommunityListViewMode } from '@/lib/community/community-state'
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
  onSearchValueChange: (value: string) => void
  onSearchSubmit: () => void
  /** 지우기 버튼. 입력값을 비우고, 검색이 걸려 있으면 검색도 푼다. */
  onSearchClear: () => void
  onViewChange: (view: CommunityListViewMode) => void
  onEmptyAction: () => void
  onRetry: () => void
  onLoadMore: () => void
  onRetryLoadMore: () => void
}

/*
  커뮤니티 구간(DESIGN.md §8 피드형 화면 메모): <480 모바일 · ≥480 태블릿 이상.
  목록은 1단계에서 모든 폭이 --w-read 1단이라 1080 분기는 없다(3단 레일은 4단계).
*/
const MOBILE = '@media (max-width: 479px)'
const TABLET_UP = '@media (min-width: 480px)'

/* FAB 와 그 아래 여백. Page 하단 여백이 이 둘 + 16 을 넘어야 마지막 행을 가리지 않는다. */
const FAB_HEIGHT = 52
const FAB_OFFSET = 20

/*
  사이트 헤더(site-header.tsx)는 sticky top:0, 높이 64 + 아래 테두리 1 이다. 툴바를 64 에
  붙여 헤더 테두리(z-index 20)가 툴바 위에 겹쳐 보이게 한다 — 65 면 1px 틈으로 글이 비친다.
*/
const SITE_HEADER_HEIGHT = 64

const Page = styled.main`
  ${centeredColumn('var(--w-read)')}
  padding: 32px 0 64px;
  display: grid;
  gap: 16px;

  ${MOBILE} {
    padding-top: 24px;
    padding-bottom: calc(
      ${FAB_HEIGHT}px + ${FAB_OFFSET}px + 16px + env(safe-area-inset-bottom)
    );
  }
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
  border: 1px solid var(--color-primary-700);
  border-radius: var(--radius-control);
  background: var(--color-primary-700);
  color: var(--color-surface);
  font-size: 14px;
  font-weight: 700;
`

const DesktopWriteLink = styled(WriteLink)`
  ${MOBILE} {
    display: none;
  }
`

const MobileWriteLink = styled(WriteLink)`
  display: none;

  ${MOBILE} {
    position: fixed;
    z-index: 20;
    right: 16px;
    bottom: calc(${FAB_OFFSET}px + env(safe-area-inset-bottom));
    display: inline-flex;
    min-height: ${FAB_HEIGHT}px;
    border-radius: var(--radius-pill);
    box-shadow: var(--shadow-level-3);
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

  /* 포커스 신호는 테두리 하나다 — 전역 :focus-visible 링을 끈다(DESIGN.md §Inputs & Forms). */
  &,
  &:focus,
  &:focus-visible {
    outline: none;
  }

  &:focus-visible {
    border-color: var(--color-primary-700);
    box-shadow: var(--shadow-focus-primary-strong);
  }
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

const TabRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  border-bottom: 1px solid var(--color-border-200);
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

const Reaction = styled.span`
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 4px;
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

const LoadMoreButton = styled.button`
  width: 100%;
  min-height: 48px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-control);
  background: var(--color-surface);
  color: var(--color-text-700);
  font: inherit;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;

  &:disabled {
    cursor: wait;
    opacity: var(--button-disabled-opacity-color);
  }
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
  onSearchValueChange,
  onSearchSubmit,
  onSearchClear,
  onViewChange,
  onEmptyAction,
  onRetry,
  onLoadMore,
  onRetryLoadMore,
}: CommunityListViewProps) {
  const searchInputRef = useRef<HTMLInputElement>(null)

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
    <Page>
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

      <TabRow>
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

      <Feed aria-label="커뮤니티 피드" aria-live="polite">
        {status === 'loading' ? (
          <CommunityFeedback
            description="게시글을 불러오는 중이에요"
            kind="loading"
          />
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
                    <PostLink href={post.href} onClick={post.onNavigate}>
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
                          <Reaction aria-label={`좋아요 ${post.likeCount}`}>
                            <Heart aria-hidden="true" size={14} />
                            {formatCommunityCount(post.likeCount)}
                          </Reaction>
                          <Reaction aria-label={`댓글 ${post.commentCount}`}>
                            <MessageCircle aria-hidden="true" size={14} />
                            {formatCommunityCount(post.commentCount)}
                          </Reaction>
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
                          <img alt="" loading="lazy" src={post.thumbnailUrl} />
                        </Thumbnail>
                      ) : null}
                    </PostLink>
                  </li>
                )
              })}
            </PostList>

            {loadMoreErrorMessage ? (
              <LoadMoreError data-load-more-error="true" role="alert">
                <span>{loadMoreErrorMessage}</span>
                <LoadMoreRetryButton onClick={onRetryLoadMore} type="button">
                  더 보기 다시 시도
                </LoadMoreRetryButton>
              </LoadMoreError>
            ) : hasNextPage ? (
              <LoadMoreButton
                aria-busy={isFetchingNextPage}
                disabled={isFetchingNextPage}
                onClick={onLoadMore}
                type="button"
              >
                {isFetchingNextPage
                  ? '게시글을 더 불러오는 중'
                  : '게시글 더 보기'}
              </LoadMoreButton>
            ) : null}
          </>
        )}
      </Feed>

      <MobileWriteLink data-mobile-write-action="true" href={writeHref}>
        <Pencil aria-hidden="true" size={18} />
        글쓰기
      </MobileWriteLink>
    </Page>
  )
}
