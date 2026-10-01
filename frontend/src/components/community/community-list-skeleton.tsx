'use client'

import styled from 'styled-components'
import { Skeleton } from '@/components/ui/skeleton'

/*
  커뮤니티 목록 글 행 스켈레톤(community.md §S4 「목록 — 끊기지 않는 피드」 로딩, DESIGN.md §14).
  첫 로딩은 5줄, 다음 쪽은 2줄이다. 행 모양을 그대로 따라 — `지역 · 시간` → 제목 → 미리보기 2줄 →
  작성자 · 반응 — 글이 들어와도 자리가 흔들리지 않게 한다. 썸네일 자리는 글마다 있고 없고가
  달라 그리지 않는다(텍스트가 폭을 다 쓴다).
*/

const MOBILE = '@media (max-width: 479px)'

/* 행과 같은 상자: 구분선 행 + hover 여백만큼 바깥으로 뺀 좌우 12(community-list-view.tsx PostLink). */
const Row = styled.div`
  display: grid;
  gap: 4px;
  margin: 0 -12px;
  padding: 20px 12px;
  border-bottom: 1px solid var(--color-border-200);

  ${MOBILE} {
    padding: 16px 12px;
  }
`

/* 한 줄 = 글자 줄 높이. 막대는 그 안 가운데에 둔다(13·16·14px 글자의 줄 높이). */
const Line = styled.div<{ $height: number }>`
  height: ${props => props.$height}px;
  display: flex;
  align-items: center;
`

const FooterLine = styled(Line)`
  margin-top: 4px;
`

const Bone = styled(Skeleton)`
  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
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

const RowSkeleton = () => (
  <Row aria-hidden="true" data-community-row-skeleton="true">
    <Line $height={20}>
      <Bone $height="12px" $width="32%" />
    </Line>
    <Line $height={24}>
      <Bone $height="16px" $width="72%" />
    </Line>
    <Line $height={22}>
      <Bone $height="12px" $width="100%" />
    </Line>
    <Line $height={22}>
      <Bone $height="12px" $width="84%" />
    </Line>
    <FooterLine $height={20}>
      <Bone $height="12px" $width="40%" />
    </FooterLine>
  </Row>
)

type CommunityListSkeletonProps = {
  /** `initial` 첫 로딩(5줄) · `more` 다음 쪽(2줄). */
  variant: 'initial' | 'more'
}

export default function CommunityListSkeleton({
  variant,
}: CommunityListSkeletonProps) {
  const rows = variant === 'initial' ? 5 : 2

  return (
    // aria-busy 를 걸지 않는다 — 자기 자신이 알림(status)이라 busy 면 그 알림이 미뤄진다.
    <div data-community-list-skeleton={variant} role="status">
      <VisuallyHidden>게시글을 불러오는 중이에요</VisuallyHidden>
      {Array.from({ length: rows }, (_, index) => (
        <RowSkeleton key={index} />
      ))}
    </div>
  )
}
