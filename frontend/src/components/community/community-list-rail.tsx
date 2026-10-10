'use client'

import Link from 'next/link'
import { ChevronRight, Heart } from 'lucide-react'
import styled from 'styled-components'
import { ButtonLink } from '@/components/ui/button'
import { formatCommunityCount, formatRelativeTime } from '@/lib/community'
import type { CommunityRailPostsKind } from '@/lib/community/list-rail'
import type { CommunityId } from '@/types/community'

/*
  목록 우 레일(community.md §S4 「목록 3단」, CM-039). `≥1080` 에서만 렌더한다 — 판정은 목록 페이지가
  matchMedia 로 해서 인기 글 쿼리와 함께 막는다. 카드 톤은 상세 레일(1단계)과 같다:
  테두리 1px border-200 · radius-card · 안쪽 20 · 제목 16/700.

  사이트 헤더(sticky top:0 · 64)에서 24 띄워 붙는다. 목록 툴바(top:64)는 피드 열에만 있어 겹치지 않는다.
*/
export const COMMUNITY_LIST_SIDE_STICKY_TOP = 64 + 24

export type CommunityPopularRailPost = {
  postId: CommunityId
  title: string
  likeCount: number
  /** 「이번 주 새 글」로 바꿔 부를 때 ♡ 수 대신 적는 작성 시각(#590). */
  createdAt?: string
  href: string
  /** 누를 때 뒤로 돌아올 목록 자리를 남긴다(CM-030). 피드 행의 `onNavigate` 와 같은 자리다. */
  onNavigate?: () => void
}

export type CommunityListRailProps = {
  /**
   * 비었거나 실패·불러오는 중이면 null — 묶음을 그리지 않는다(레일은 보조라 오류 카드가 없다).
   * `kind: 'recent'` 는 반응이 없는 인기 글을 「이번 주 새 글」로 바꿔 부른 것이다(#590) — 순위와 ♡ 0 을 빼고
   * 작성 시각을 적는다. 없으면 'popular'.
   */
  popular: {
    kind?: CommunityRailPostsKind
    title: string
    posts: CommunityPopularRailPost[]
  } | null
  askTitle: string
  /**
   * 「질문하기」 링크 — 말머리 「질문」을 골라 둔 글쓰기(#590). 목록 머리의 「글쓰기」와 같은 행동이 두 곳에
   * 있지 않게, 레일은 질문 템플릿으로 가른다.
   */
  askHref: string
  analysis: { label: string; href: string }
}

const Rail = styled.aside`
  position: sticky;
  top: ${COMMUNITY_LIST_SIDE_STICKY_TOP}px;
  min-width: 0;
  display: grid;
  gap: 16px;
`

const Card = styled.section`
  min-width: 0;
  display: grid;
  gap: 12px;
  padding: 20px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  background: var(--color-surface);
`

/* 카드 제목은 한 줄 — 긴 지역 이름은 말줄임하고 전체는 title 이 든다(상세 레일 제목과 같은 규칙). */
const CardTitle = styled.h2`
  min-width: 0;
  overflow: hidden;
  color: var(--color-text-900);
  font-size: 16px;
  font-weight: 700;
  line-height: 1.45;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const PopularList = styled.ol`
  display: grid;
  margin: 0;
  padding: 0;
  list-style: none;
`

const PopularLink = styled(Link)`
  min-height: 44px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
  border-top: 1px solid var(--color-border-200);
  color: var(--color-text-800);

  /* 전역 링(2px blue500)이 위 테두리 선과 직각으로 만나지 않게 모서리만 둥글린다(상세 레일과 같다). */
  &:focus-visible {
    border-radius: var(--radius-control);
  }

  &:hover > [data-popular-title] {
    color: var(--color-text-primary-on-light);
  }
`

const PopularRank = styled.span`
  min-width: 16px;
  flex: 0 0 auto;
  color: var(--color-text-primary-on-light);
  font-size: 16px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: 1.5;
  text-align: center;
`

const PopularTitle = styled.span`
  min-width: 0;
  flex: 1 1 auto;
  overflow: hidden;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.5;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const PopularLikes = styled.span`
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 4px;
  color: var(--color-text-caption);
  font-size: 13px;
  font-variant-numeric: tabular-nums;
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

const AnalysisLink = styled(Link)`
  min-height: 52px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 12px 20px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  background: var(--color-surface);
  color: var(--color-text-primary-on-light);
  font-size: 14px;
  font-weight: 700;
  line-height: 1.5;
  overflow-wrap: anywhere;
  transition: background-color var(--motion-fast) var(--ease-standard);

  &:hover {
    background: var(--color-background-muted);
  }

  svg {
    flex: 0 0 auto;
  }
`

const RecentTime = styled.time`
  flex: 0 0 auto;
  color: var(--color-text-caption);
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
`

export default function CommunityListRail({
  popular,
  askTitle,
  askHref,
  analysis,
}: CommunityListRailProps) {
  const popularPosts = popular?.posts ?? []
  const recent = popular?.kind === 'recent'

  return (
    <Rail aria-label="커뮤니티 둘러보기" data-community-list-rail="true">
      {popular && popularPosts.length > 0 ? (
        <Card
          aria-labelledby="community-list-rail-popular"
          data-community-rail-posts={recent ? 'recent' : 'popular'}
        >
          <CardTitle id="community-list-rail-popular" title={popular.title}>
            {popular.title}
          </CardTitle>
          <PopularList>
            {popularPosts.map((post, index) => (
              <li key={post.postId}>
                <PopularLink
                  data-popular-post-id={post.postId}
                  href={post.href}
                  onClick={post.onNavigate}
                >
                  {recent ? null : (
                    <PopularRank>
                      <span aria-hidden="true">{index + 1}</span>
                      <VisuallyHidden>{`인기 ${index + 1}위`}</VisuallyHidden>
                    </PopularRank>
                  )}
                  <PopularTitle data-popular-title="true">
                    {post.title}
                  </PopularTitle>
                  {recent ? (
                    post.createdAt ? (
                      <RecentTime dateTime={post.createdAt}>
                        {formatRelativeTime(post.createdAt)}
                      </RecentTime>
                    ) : null
                  ) : (
                    <PopularLikes>
                      <Heart aria-hidden="true" size={14} />
                      <VisuallyHidden>좋아요</VisuallyHidden>
                      {formatCommunityCount(post.likeCount)}
                    </PopularLikes>
                  )}
                </PopularLink>
              </li>
            ))}
          </PopularList>
        </Card>
      ) : null}

      <Card aria-labelledby="community-list-rail-ask">
        <CardTitle id="community-list-rail-ask" title={askTitle}>
          {askTitle}
        </CardTitle>
        <ButtonLink
          data-community-rail-ask="true"
          href={askHref}
          size="medium"
          variant="secondary"
        >
          질문하기
        </ButtonLink>
      </Card>

      <AnalysisLink href={analysis.href}>
        {analysis.label}
        <ChevronRight aria-hidden="true" size={16} />
      </AnalysisLink>
    </Rail>
  )
}
