'use client'

import {
  type ChangeEvent,
  type FormEvent,
  type MouseEventHandler,
  type ReactNode,
} from 'react'
import Link from 'next/link'
import { Heart, MessageCircle, Pencil, Search } from 'lucide-react'
import styled from 'styled-components'
import CommunityFeedback from '@/components/community/community-feedback'
import { formatCommunityCount, formatRelativeTime } from '@/lib/community'
import type { CommunityListView as CommunityListViewMode } from '@/lib/community/community-state'
import type { CommunityPostSummary } from '@/types/community'

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
  searchWholeRegionNotice: boolean
  locationPicker: ReactNode
  writeHref: string
  hasNextPage: boolean
  isFetchingNextPage: boolean
  onSearchValueChange: (value: string) => void
  onSearchSubmit: () => void
  onViewChange: (view: CommunityListViewMode) => void
  onEmptyAction: () => void
  onRetry: () => void
  onLoadMore: () => void
  onRetryLoadMore: () => void
}

const Page = styled.main`
  width: min(880px, calc(100% - 48px));
  margin: 0 auto;
  padding: 40px 0 88px;
  display: grid;
  gap: 24px;

  @media (max-width: 640px) {
    width: min(100% - 32px, 880px);
    padding-top: 24px;
    padding-bottom: 120px;
  }
`

const Hero = styled.section`
  display: grid;
  gap: 20px;
  padding: 32px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  background: var(--color-surface);
  box-shadow: var(--shadow-level-1);

  @media (max-width: 640px) {
    padding: 24px 20px;
  }
`

const HeroTop = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
`

const HeroCopy = styled.div`
  display: grid;
  gap: 10px;
`

const Eyebrow = styled.p`
  color: var(--color-primary-700);
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`

const HeroTitle = styled.h1`
  color: var(--color-text-900);
  font-size: clamp(25px, 4vw, 34px);
  line-height: 1.28;
  letter-spacing: -0.02em;
`

const HeroDescription = styled.p`
  max-width: 620px;
  color: var(--color-text-600);
  line-height: 1.75;
  word-break: keep-all;
`

const WriteLink = styled(Link)`
  min-height: 48px;
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 18px;
  border: 1px solid var(--color-primary-700);
  border-radius: var(--radius-control);
  background: var(--color-primary-700);
  color: var(--color-surface);
  font-size: 14px;
  font-weight: 700;

  &:focus-visible {
    outline: none;
    box-shadow: var(--shadow-focus-primary-strong);
  }
`

const DesktopWriteLink = styled(WriteLink)`
  @media (max-width: 640px) {
    display: none;
  }
`

const MobileWriteLink = styled(WriteLink)`
  display: none;

  @media (max-width: 640px) {
    position: fixed;
    z-index: 20;
    right: 16px;
    bottom: 20px;
    display: inline-flex;
    min-height: 52px;
    box-shadow: var(--shadow-level-2);
  }
`

const Controls = styled.section`
  display: grid;
  gap: 16px;
  padding: 20px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  background: var(--color-surface);
  box-shadow: var(--shadow-level-1);
`

const SearchForm = styled.form`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
`

const SearchLabel = styled.label`
  min-width: 0;
`

const SearchInput = styled.input`
  width: 100%;
  min-height: 48px;
  padding: 0 15px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-control);
  background: var(--color-surface);
  color: var(--color-text-900);
  font: inherit;

  &::placeholder {
    color: var(--color-text-caption);
  }

  &:focus-visible {
    outline: none;
    border-color: var(--color-primary-600);
    box-shadow: var(--shadow-focus-primary-strong);
  }
`

const SearchButton = styled.button`
  min-width: 82px;
  min-height: 48px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 0 16px;
  border: 1px solid var(--color-primary-700);
  border-radius: var(--radius-control);
  background: var(--color-primary-700);
  color: var(--color-surface);
  font: inherit;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;

  &:focus-visible {
    outline: none;
    box-shadow: var(--shadow-focus-primary-strong);
  }
`

const TabList = styled.div`
  display: flex;
  gap: 8px;
  overflow-x: auto;
  scrollbar-width: thin;
`

const Tab = styled.button<{ $selected: boolean }>`
  min-width: 76px;
  min-height: 44px;
  flex: 0 0 auto;
  padding: 0 16px;
  border: 1px solid
    ${props =>
      props.$selected ? 'var(--color-primary-700)' : 'var(--color-border-200)'};
  border-radius: var(--radius-pill);
  background: ${props =>
    props.$selected ? 'var(--color-primary-100)' : 'var(--color-surface)'};
  color: ${props =>
    props.$selected ? 'var(--color-primary-700)' : 'var(--color-text-600)'};
  font: inherit;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;

  &:focus-visible {
    outline: none;
    box-shadow: var(--shadow-focus-primary-strong);
  }
`

const SearchNotice = styled.p`
  padding: 12px 14px;
  border-radius: var(--radius-control);
  background: var(--color-primary-100);
  color: var(--color-primary-700);
  font-size: 13px;
  line-height: 1.6;
`

const Feed = styled.section`
  display: grid;
  gap: 14px;
`

const FeedHeader = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
`

const FeedTitle = styled.h2`
  color: var(--color-text-900);
  font-size: 20px;
  line-height: 1.4;
`

const FeedCount = styled.p`
  color: var(--color-text-caption);
  font-size: 13px;
`

const PostList = styled.ul`
  display: grid;
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;
`

const PostLink = styled(Link)`
  display: grid;
  gap: 12px;
  padding: 22px 24px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  background: var(--color-surface);
  color: inherit;
  box-shadow: var(--shadow-level-1);
  transition:
    border-color var(--motion-fast) var(--ease-standard),
    box-shadow var(--motion-fast) var(--ease-standard);

  &:hover {
    border-color: var(--color-primary-600);
    box-shadow: var(--shadow-level-2);
  }

  &:focus-visible {
    outline: none;
    box-shadow: var(--shadow-focus-primary-strong);
  }

  @media (max-width: 640px) {
    padding: 20px 18px;
  }
`

const TargetTag = styled.span`
  width: fit-content;
  min-height: 28px;
  display: inline-flex;
  align-items: center;
  padding: 0 10px;
  border-radius: var(--radius-pill);
  background: var(--color-primary-100);
  color: var(--color-primary-700);
  font-size: 12px;
  font-weight: 700;
`

const PostTitle = styled.h3`
  color: var(--color-text-900);
  font-size: 19px;
  line-height: 1.45;
  letter-spacing: -0.01em;
`

const Preview = styled.p`
  display: -webkit-box;
  overflow: hidden;
  color: var(--color-text-600);
  line-height: 1.7;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
`

const PostMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--color-text-caption);
  font-size: 13px;
`

const MetaDivider = styled.span`
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: var(--color-border-300);
`

const Reactions = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  margin-left: auto;
`

const Reaction = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
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

  &:focus-visible {
    outline: none;
    box-shadow: var(--shadow-focus-primary-strong);
  }

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
  padding: 14px 16px;
  border: 1px solid var(--color-danger);
  border-radius: var(--radius-control);
  background: var(--color-surface);
  color: var(--color-danger);
  font-size: 13px;
  line-height: 1.6;

  @media (max-width: 640px) {
    align-items: stretch;
    flex-direction: column;
  }
`

const LoadMoreRetryButton = styled.button`
  min-height: 44px;
  flex: 0 0 auto;
  padding: 0 14px;
  border: 1px solid var(--color-danger);
  border-radius: var(--radius-control);
  background: var(--color-surface);
  color: var(--color-danger);
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;

  &:focus-visible {
    outline: none;
    box-shadow: var(--shadow-focus-primary-strong);
  }
`

const tabs: Array<{ value: CommunityListViewMode; label: string }> = [
  { value: 'latest', label: '최신' },
  { value: 'popular', label: '인기' },
  { value: 'liked', label: '좋아요한 글' },
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
  searchWholeRegionNotice,
  locationPicker,
  writeHref,
  hasNextPage,
  isFetchingNextPage,
  onSearchValueChange,
  onSearchSubmit,
  onViewChange,
  onEmptyAction,
  onRetry,
  onLoadMore,
  onRetryLoadMore,
}: CommunityListViewProps) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onSearchSubmit()
  }

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    onSearchValueChange(event.currentTarget.value)
  }

  const selectedEmptyCopy = emptyCopy[emptyCause]

  return (
    <Page>
      <Hero>
        <HeroTop>
          <HeroCopy>
            <Eyebrow>Boss Community</Eyebrow>
            <HeroTitle>사장님들의 운영 이야기가 모이는 곳</HeroTitle>
            <HeroDescription>
              지역의 변화부터 매장 운영 노하우까지, 현장에서 얻은 경험을 나누고
              필요한 이야기를 한 흐름에서 찾아보세요.
            </HeroDescription>
          </HeroCopy>
          <DesktopWriteLink data-desktop-write-action="true" href={writeHref}>
            <Pencil aria-hidden="true" size={17} />
            글쓰기
          </DesktopWriteLink>
        </HeroTop>
      </Hero>

      <Controls aria-label="커뮤니티 탐색">
        <SearchForm role="search" onSubmit={handleSubmit}>
          <SearchLabel>
            <SearchInput
              aria-label="게시글 검색어"
              name="keyword"
              onChange={handleSearchChange}
              placeholder="제목이나 내용으로 검색"
              type="search"
              value={searchValue}
            />
          </SearchLabel>
          <SearchButton type="submit">
            <Search aria-hidden="true" size={17} />
            검색
          </SearchButton>
        </SearchForm>

        <TabList aria-label="게시글 보기" role="group">
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
        </TabList>

        {locationPicker}
        {searchWholeRegionNotice ? (
          <SearchNotice role="note">
            검색은 서울 전체 게시글에서 진행됩니다.
          </SearchNotice>
        ) : null}
      </Controls>

      <Feed aria-label="커뮤니티 피드" aria-live="polite">
        <FeedHeader>
          <FeedTitle>
            {keyword ? `“${keyword}” 검색 결과` : '사장님 이야기'}
          </FeedTitle>
          {status === 'ready' ? (
            <FeedCount>{formatCommunityCount(posts.length)}개 불러옴</FeedCount>
          ) : null}
        </FeedHeader>

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
              {posts.map(post => (
                <li key={post.postId}>
                  <PostLink href={post.href} onClick={post.onNavigate}>
                    <TargetTag>{post.targetName ?? '서울 전체'}</TargetTag>
                    <PostTitle>{post.title}</PostTitle>
                    <Preview>{post.previewContent}</Preview>
                    <PostMeta>
                      <span>사장님</span>
                      <MetaDivider aria-hidden="true" />
                      <time dateTime={post.createdAt}>
                        {formatRelativeTime(post.createdAt)}
                      </time>
                      <Reactions>
                        <Reaction aria-label={`좋아요 ${post.likeCount}`}>
                          <Heart aria-hidden="true" size={15} />
                          {formatCommunityCount(post.likeCount)}
                        </Reaction>
                        <Reaction aria-label={`댓글 ${post.commentCount}`}>
                          <MessageCircle aria-hidden="true" size={15} />
                          {formatCommunityCount(post.commentCount)}
                        </Reaction>
                      </Reactions>
                    </PostMeta>
                  </PostLink>
                </li>
              ))}
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
