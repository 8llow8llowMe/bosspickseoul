'use client'

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import styled from 'styled-components'
import {
  communityCategories,
  getCommunityCategoryLabel,
} from '@/data/community-categories'
import {
  formatCommunityCount,
  formatRelativeTime,
  getCommunityExcerpt,
} from '@/lib/community'
import {
  getCommunityListData,
  getPopularCommunityPostsData,
} from '@/lib/api/community'
import { getApiMessage, isApiSuccess } from '@/lib/api/response'
import { useAuthStore } from '@/stores/auth-store'
import type { CommunityListItem } from '@/types/community'

const Page = styled.main`
  width: min(1200px, calc(100% - 48px));
  margin: 0 auto;
  padding: 40px 0 72px;
  display: grid;
  gap: 24px;
`

const Hero = styled.section`
  display: grid;
  gap: 20px;
  padding: 32px;
  border: 1px solid rgba(21, 73, 181, 0.12);
  border-radius: 28px;
  background:
    radial-gradient(
      circle at top left,
      rgba(51, 109, 211, 0.16),
      transparent 34%
    ),
    linear-gradient(180deg, #f8fbff 0%, #ffffff 100%);
  box-shadow: 0 18px 44px rgba(21, 73, 181, 0.08);
`

const HeroTop = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  flex-wrap: wrap;
`

const HeroCopy = styled.div`
  display: grid;
  gap: 12px;
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
  font-size: clamp(34px, 5vw, 46px);
  line-height: 1.1;
  letter-spacing: -0.04em;
`

const HeroBody = styled.p`
  max-width: 760px;
  color: var(--color-text-500);
  line-height: 1.8;
`

const WriteLink = styled(Link)<{ $variant?: 'primary' | 'secondary' }>`
  min-height: 50px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 18px;
  border: 1px solid
    ${props =>
      props.$variant === 'secondary'
        ? 'var(--color-border-200)'
        : 'var(--color-primary-700)'};
  border-radius: 16px;
  background: ${props =>
    props.$variant === 'secondary' ? 'white' : 'var(--color-primary-700)'};
  color: ${props =>
    props.$variant === 'secondary' ? 'var(--color-text-700)' : 'white'};
  font-size: 15px;
  font-weight: 700;
`

const CategoryList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
`

const CategoryChip = styled.button<{ $selected: boolean }>`
  min-height: 42px;
  padding: 0 16px;
  border: 1px solid
    ${props =>
      props.$selected ? 'rgba(21, 73, 181, 0.24)' : 'var(--color-border-200)'};
  border-radius: 999px;
  background: ${props =>
    props.$selected ? 'rgba(21, 73, 181, 0.08)' : 'white'};
  color: ${props =>
    props.$selected ? 'var(--color-primary-700)' : 'var(--color-text-500)'};
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
`

const Section = styled.section`
  display: grid;
  gap: 18px;
`

const SectionHeader = styled.div`
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
`

const SectionTitleWrap = styled.div`
  display: grid;
  gap: 6px;
`

const SectionTitle = styled.h2`
  color: var(--color-text-900);
  font-size: 28px;
  line-height: 1.2;
  letter-spacing: -0.03em;
`

const SectionBody = styled.p`
  color: var(--color-text-500);
  line-height: 1.75;
`

const FeaturedGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`

const FeaturedCard = styled(Link)`
  min-height: 220px;
  display: grid;
  gap: 14px;
  padding: 24px;
  border-radius: 24px;
  background:
    linear-gradient(160deg, rgba(21, 73, 181, 0.96), rgba(51, 109, 211, 0.86)),
    #1549b5;
  color: white;
  box-shadow: 0 18px 44px rgba(21, 73, 181, 0.16);
`

const FeaturedTag = styled.span`
  display: inline-flex;
  width: fit-content;
  min-height: 28px;
  align-items: center;
  padding: 0 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.14);
  font-size: 12px;
  font-weight: 700;
`

const FeaturedTitle = styled.h3`
  font-size: 22px;
  line-height: 1.35;
  letter-spacing: -0.03em;
`

const FeaturedBody = styled.p`
  color: rgba(255, 255, 255, 0.84);
  line-height: 1.75;
`

const FeaturedMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: auto;
  color: rgba(255, 255, 255, 0.76);
  font-size: 13px;
`

const PostGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;

  @media (max-width: 960px) {
    grid-template-columns: 1fr;
  }
`

const PostCard = styled(Link)`
  overflow: hidden;
  border: 1px solid var(--color-border-200);
  border-radius: 24px;
  background: white;
  box-shadow: 0 10px 30px rgba(21, 73, 181, 0.08);
  transition:
    transform 180ms ease,
    border-color 180ms ease,
    box-shadow 180ms ease;

  &:hover {
    transform: translateY(-2px);
    border-color: rgba(21, 73, 181, 0.24);
    box-shadow: 0 18px 44px rgba(21, 73, 181, 0.12);
  }
`

const PostPreview = styled.div<{ $image?: string | null }>`
  min-height: 190px;
  display: grid;
  place-items: center;
  padding: 24px;
  background: ${props =>
    props.$image
      ? `linear-gradient(rgba(8, 21, 54, 0.18), rgba(8, 21, 54, 0.18)), url(${props.$image}) center / cover no-repeat`
      : 'linear-gradient(135deg, rgba(21, 73, 181, 0.14), rgba(51, 109, 211, 0.2))'};
`

const PreviewLabel = styled.span`
  display: inline-flex;
  min-height: 34px;
  align-items: center;
  padding: 0 14px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.92);
  color: var(--color-primary-700);
  font-size: 13px;
  font-weight: 700;
`

const PostBody = styled.div`
  display: grid;
  gap: 12px;
  padding: 24px;
`

const CategoryBadge = styled.span`
  display: inline-flex;
  width: fit-content;
  min-height: 28px;
  align-items: center;
  padding: 0 10px;
  border-radius: 999px;
  background: rgba(21, 73, 181, 0.08);
  color: var(--color-primary-700);
  font-size: 12px;
  font-weight: 700;
`

const PostTitle = styled.h3`
  color: var(--color-text-900);
  font-size: 22px;
  line-height: 1.35;
  letter-spacing: -0.03em;
`

const PostExcerpt = styled.p`
  color: var(--color-text-500);
  line-height: 1.8;
`

const MetaRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  color: var(--color-text-500);
  font-size: 13px;
`

const Notice = styled.div<{ $tone?: 'error' | 'info' }>`
  padding: 16px 18px;
  border-radius: 18px;
  background: ${props =>
    props.$tone === 'error'
      ? 'rgba(209, 67, 67, 0.08)'
      : 'rgba(51, 109, 211, 0.08)'};
  color: ${props =>
    props.$tone === 'error'
      ? 'var(--color-danger)'
      : 'var(--color-primary-700)'};
  line-height: 1.75;
`

const EmptyState = styled.div`
  display: grid;
  gap: 14px;
  padding: 28px;
  border: 1px dashed var(--color-border-300);
  border-radius: 24px;
  background: white;
`

const EmptyTitle = styled.h3`
  color: var(--color-text-900);
  font-size: 22px;
  line-height: 1.35;
`

const EmptyBody = styled.p`
  color: var(--color-text-500);
  line-height: 1.8;
`

const LoadMoreButton = styled.button`
  min-height: 50px;
  width: fit-content;
  padding: 0 18px;
  border: 1px solid var(--color-border-200);
  border-radius: 14px;
  background: white;
  color: var(--color-text-700);
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
`

const dedupePosts = (items: CommunityListItem[]) =>
  items.filter(
    (item, index, array) =>
      array.findIndex(
        candidate => candidate.communityId === item.communityId,
      ) === index,
  )

export default function CommunityListPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const hasHydrated = useAuthStore(state => state.hasHydrated)
  const isLoggedIn = useAuthStore(state => state.isLoggedIn)

  const selectedCategory =
    communityCategories.find(
      category => category.value === (searchParams.get('category') ?? ''),
    )?.value ?? ''

  const selectedCategoryItem =
    communityCategories.find(category => category.value === selectedCategory) ??
    communityCategories[0]

  const listQuery = useInfiniteQuery({
    queryKey: ['community-list', selectedCategory],
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      getCommunityListData(selectedCategory, Number(pageParam)),
    getNextPageParam: lastPage => {
      if (!isApiSuccess(lastPage) || lastPage.dataBody.length === 0) {
        return undefined
      }

      return lastPage.dataBody[lastPage.dataBody.length - 1]?.communityId
    },
  })

  const popularQuery = useQuery({
    queryKey: ['community-popular'],
    queryFn: getPopularCommunityPostsData,
    enabled: selectedCategory === '',
  })

  const communityPosts = dedupePosts(
    (listQuery.data?.pages ?? []).flatMap(page =>
      isApiSuccess(page) ? page.dataBody : [],
    ),
  )

  const featuredPosts =
    popularQuery.data && isApiSuccess(popularQuery.data)
      ? popularQuery.data.dataBody.slice(0, 3)
      : []

  const handleCategoryChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())

    if (value) {
      params.set('category', value)
    } else {
      params.delete('category')
    }

    const nextPath = params.toString()
      ? `${pathname}?${params.toString()}`
      : pathname

    router.replace(nextPath, {
      scroll: false,
    })
  }

  const writeHref =
    hasHydrated && !isLoggedIn ? '/login' : '/community/register'

  const firstPage = listQuery.data?.pages[0]
  const listErrorMessage =
    firstPage && !isApiSuccess(firstPage)
      ? getApiMessage(firstPage)
      : listQuery.error instanceof Error
        ? listQuery.error.message
        : null

  const popularErrorMessage =
    popularQuery.data && !isApiSuccess(popularQuery.data)
      ? getApiMessage(popularQuery.data)
      : popularQuery.error instanceof Error
        ? popularQuery.error.message
        : null

  return (
    <Page>
      <Hero>
        <HeroTop>
          <HeroCopy>
            <Eyebrow>Community</Eyebrow>
            <HeroTitle>
              현장에서 바로 쓰이는 운영 인사이트를 모읍니다.
            </HeroTitle>
            <HeroBody>
              상권 공유부터 인테리어, 창업 고민, 협업 제안까지 한 흐름에서
              확인할 수 있도록 구성했습니다. 현재 선택한 카테고리는{' '}
              {selectedCategoryItem.label}이며,{' '}
              {selectedCategoryItem.description}
            </HeroBody>
          </HeroCopy>
          <WriteLink href={writeHref}>게시글 작성하기</WriteLink>
        </HeroTop>
        <CategoryList aria-label="community category">
          {communityCategories.map(category => (
            <CategoryChip
              key={category.value || 'all'}
              type="button"
              $selected={category.value === selectedCategory}
              onClick={() => {
                handleCategoryChange(category.value)
              }}
            >
              {category.label}
            </CategoryChip>
          ))}
        </CategoryList>
      </Hero>

      {selectedCategory === '' ? (
        <Section>
          <SectionHeader>
            <SectionTitleWrap>
              <SectionTitle>이번 주 많이 본 게시글</SectionTitle>
              <SectionBody>
                전체 커뮤니티에서 반응이 좋은 글을 먼저 확인할 수 있습니다.
              </SectionBody>
            </SectionTitleWrap>
          </SectionHeader>
          {popularErrorMessage ? (
            <Notice $tone="error">{popularErrorMessage}</Notice>
          ) : featuredPosts.length > 0 ? (
            <FeaturedGrid>
              {featuredPosts.map(post => (
                <FeaturedCard
                  key={post.communityId}
                  href={`/community/${post.communityId}`}
                >
                  <FeaturedTag>Popular</FeaturedTag>
                  <FeaturedTitle>{post.title}</FeaturedTitle>
                  <FeaturedBody>
                    {getCommunityExcerpt(post.content, 96)}
                  </FeaturedBody>
                  <FeaturedMeta>
                    <span>{post.writerNickname}</span>
                    <span>조회 {formatCommunityCount(post.readCount)}</span>
                    <span>댓글 {formatCommunityCount(post.commentCount)}</span>
                  </FeaturedMeta>
                </FeaturedCard>
              ))}
            </FeaturedGrid>
          ) : (
            <Notice>인기 게시글 데이터를 불러오는 중입니다.</Notice>
          )}
        </Section>
      ) : null}

      <Section>
        <SectionHeader>
          <SectionTitleWrap>
            <SectionTitle>{selectedCategoryItem.label} 게시글</SectionTitle>
            <SectionBody>
              현재까지 불러온 게시글{' '}
              {formatCommunityCount(communityPosts.length)}개
            </SectionBody>
          </SectionTitleWrap>
          <WriteLink href={writeHref} $variant="secondary">
            새 글 작성
          </WriteLink>
        </SectionHeader>

        {listQuery.isLoading ? (
          <Notice>게시글 목록을 불러오는 중입니다.</Notice>
        ) : listErrorMessage ? (
          <Notice $tone="error">{listErrorMessage}</Notice>
        ) : communityPosts.length > 0 ? (
          <>
            <PostGrid>
              {communityPosts.map(post => (
                <PostCard
                  key={post.communityId}
                  href={`/community/${post.communityId}`}
                >
                  <PostPreview $image={post.image}>
                    <PreviewLabel>{post.writerNickname}</PreviewLabel>
                  </PostPreview>
                  <PostBody>
                    <CategoryBadge>
                      {selectedCategoryItem.label === '전체보기'
                        ? getCommunityCategoryLabel(post.category)
                        : selectedCategoryItem.label}
                    </CategoryBadge>
                    <PostTitle>{post.title}</PostTitle>
                    <PostExcerpt>
                      {getCommunityExcerpt(post.content, 120)}
                    </PostExcerpt>
                    <MetaRow>
                      <span>{post.writerNickname}</span>
                      {post.createdAt ? (
                        <span>{formatRelativeTime(post.createdAt)}</span>
                      ) : null}
                      <span>조회 {formatCommunityCount(post.readCount)}</span>
                      <span>
                        댓글 {formatCommunityCount(post.commentCount)}
                      </span>
                    </MetaRow>
                  </PostBody>
                </PostCard>
              ))}
            </PostGrid>
            {listQuery.hasNextPage ? (
              <LoadMoreButton
                type="button"
                onClick={() => {
                  void listQuery.fetchNextPage()
                }}
              >
                {listQuery.isFetchingNextPage
                  ? '게시글을 더 불러오는 중입니다.'
                  : '게시글 더 보기'}
              </LoadMoreButton>
            ) : null}
          </>
        ) : (
          <EmptyState>
            <EmptyTitle>아직 등록된 게시글이 없습니다.</EmptyTitle>
            <EmptyBody>
              첫 게시글을 등록해 운영 경험과 현장 데이터를 공유해 보세요.
            </EmptyBody>
            <WriteLink href={writeHref}>첫 게시글 작성하기</WriteLink>
          </EmptyState>
        )}
      </Section>
    </Page>
  )
}
