'use client'

import Link from 'next/link'
import { ChevronRight, Heart } from 'lucide-react'
import styled from 'styled-components'
import { formatCommunityCount } from '@/lib/community'
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
  href: string
  /** 누를 때 뒤로 돌아올 목록 자리를 남긴다(CM-030). 피드 행의 `onNavigate` 와 같은 자리다. */
  onNavigate?: () => void
}

export type CommunityListRailProps = {
  /** 비었거나 실패·불러오는 중이면 null — 묶음을 그리지 않는다(레일은 보조라 오류 카드가 없다). */
  popular: { title: string; posts: CommunityPopularRailPost[] } | null
  askTitle: string
  writeHref: string
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

const CardTitle = styled.h2`
  color: var(--color-text-900);
  font-size: 16px;
  font-weight: 700;
  line-height: 1.45;
  overflow-wrap: anywhere;
  word-break: keep-all;
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

/* 보조 CTA 라 blue50 바탕 + blue700 글자(DESIGN.md §4 Secondary) — 상세 레일의 빈 상태 글쓰기와 같다. */
const AskWriteLink = styled(Link)`
  min-height: 44px;
  width: fit-content;
  display: inline-flex;
  align-items: center;
  padding: 0 16px;
  border-radius: var(--radius-control);
  background: var(--color-primary-100);
  color: var(--color-text-primary-on-light);
  font-size: 14px;
  font-weight: 700;
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

export default function CommunityListRail({
  popular,
  askTitle,
  writeHref,
  analysis,
}: CommunityListRailProps) {
  const popularPosts = popular?.posts ?? []

  return (
    <Rail aria-label="커뮤니티 둘러보기" data-community-list-rail="true">
      {popular && popularPosts.length > 0 ? (
        <Card aria-labelledby="community-list-rail-popular">
          <CardTitle id="community-list-rail-popular">
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
                  <PopularRank>
                    <span aria-hidden="true">{index + 1}</span>
                    <VisuallyHidden>{`인기 ${index + 1}위`}</VisuallyHidden>
                  </PopularRank>
                  <PopularTitle data-popular-title="true">
                    {post.title}
                  </PopularTitle>
                  <PopularLikes>
                    <Heart aria-hidden="true" size={14} />
                    <VisuallyHidden>좋아요</VisuallyHidden>
                    {formatCommunityCount(post.likeCount)}
                  </PopularLikes>
                </PopularLink>
              </li>
            ))}
          </PopularList>
        </Card>
      ) : null}

      <Card aria-labelledby="community-list-rail-ask">
        <CardTitle id="community-list-rail-ask">{askTitle}</CardTitle>
        <AskWriteLink href={writeHref}>글쓰기</AskWriteLink>
      </Card>

      <AnalysisLink href={analysis.href}>
        {analysis.label}
        <ChevronRight aria-hidden="true" size={16} />
      </AnalysisLink>
    </Rail>
  )
}
