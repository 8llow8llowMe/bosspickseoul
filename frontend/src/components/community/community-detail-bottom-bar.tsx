'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Heart, Share } from 'lucide-react'
import styled, { keyframes } from 'styled-components'
import { COMMUNITY_MOBILE_QUERY } from '@/components/community/community-more-menu'
import { useNarrowViewport } from '@/hooks/use-narrow-viewport'
import { formatCommunityCount } from '@/lib/community'
import { shouldShowCommunityBottomBar } from '@/lib/community/comment-thread'

export type CommunityDetailBottomBarProps = {
  likeCount: number
  liked: boolean
  likePending: boolean
  authReady: boolean
  /** 본문 끝 반응 바. 이 요소가 화면 안이면 바를 숨긴다. */
  reactionsElement: HTMLElement | null
  /** 댓글 입력 자리를 감싼 요소. 없으면(댓글 로딩·오류) 「화면 밖」으로 친다. */
  composerElement: HTMLElement | null
  /** 아래 셋은 본문 반응 바와 **같은 핸들러**다(인증 게이트·공유 연타 가드 그대로). */
  onToggleLike: () => void
  onComment: () => void
  onShare: () => void
}

/* DESIGN.md §8 「Sticky bottom CTA bar with safe area」 — 높이 56 + 홈 인디케이터 자리. */
const BAR_HEIGHT = 'calc(56px + env(safe-area-inset-bottom, 0px))'

/* 짧은 slide-up(DESIGN.md §15 — 나타나는 것은 ease-enter). 줄인 모션에서는 끈다. */
const slideUp = keyframes`
  from {
    transform: translateY(100%);
  }

  to {
    transform: translateY(0);
  }
`

/*
  z-index 40: sticky 레일·목록 툴바(10)·사이트 헤더(20)·팝오버(30) 위, 시트·모달(1000)·토스트(1200) 아래.
  `<480` 에서만 그린다(useNarrowViewport) — 그 위 폭에서는 반응 바가 늘 손 닿는 곳이라 필요 없다.
*/
const Bar = styled.div`
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 40;
  height: ${BAR_HEIGHT};
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 16px env(safe-area-inset-bottom, 0px);
  border-top: 1px solid var(--color-border-200);
  background: var(--color-surface);
  animation: ${slideUp} var(--motion-standard) var(--ease-enter);

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`

const IconButton = styled.button<{ $active?: boolean }>`
  min-width: 44px;
  min-height: 44px;
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 0 8px;
  border: 0;
  border-radius: var(--radius-control);
  background: transparent;
  /* 좋아요한 상태도 파란 글자 — 반응 바와 같은 규칙(DESIGN.md §7). */
  color: ${props =>
    props.$active
      ? 'var(--color-text-primary-on-light)'
      : 'var(--color-text-700)'};
  font: inherit;
  font-size: 14px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  cursor: pointer;

  svg {
    flex: 0 0 auto;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: var(--button-disabled-opacity-color);
  }

  &:disabled[aria-busy='true'] {
    cursor: progress;
    opacity: 1;
  }
`

/*
  가운데 칸은 진짜 입력칸이 아니라 버튼이다 — 누르면 댓글 입력칸으로 데려간다(community.md §S4).
  입력칸처럼 보이게 grey100 면이지만, 글자는 버튼 라벨이라 4.5:1 을 넘는 grey700 이다.
*/
const ComposeButton = styled.button`
  min-width: 0;
  min-height: 44px;
  flex: 1 1 auto;
  padding: 0 16px;
  border: 0;
  border-radius: var(--radius-field);
  background: var(--color-surface-muted);
  color: var(--color-text-700);
  font: inherit;
  font-size: 14px;
  text-align: left;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
`

/* 바가 있는 동안 문서 끝(푸터 뒤)에 같은 높이를 둬 마지막 내용을 가리지 않는다. */
const Spacer = styled.div`
  height: ${BAR_HEIGHT};
`

/**
 * 모바일 하단 고정 바(community.md §S4 「개편 2단계」, CM-027·028).
 *
 * 본문 반응 바와 댓글 입력칸이 둘 다 화면 밖일 때만 뜬다(`shouldShowCommunityBottomBar`).
 * 판정은 IntersectionObserver 다 — 스크롤 이벤트로 매 프레임 재지 않는다. IO 가 없거나 서버 렌더면
 * 관찰 결과가 없어 뜨지 않는다.
 */
export default function CommunityDetailBottomBar({
  likeCount,
  liked,
  likePending,
  authReady,
  reactionsElement,
  composerElement,
  onToggleLike,
  onComment,
  onShare,
}: CommunityDetailBottomBarProps) {
  const narrow = useNarrowViewport(COMMUNITY_MOBILE_QUERY)
  /* 요소별 마지막 관찰 결과. 요소가 바뀌면(로그인 CTA ↔ 입력칸 등) 옛 요소의 결과는 버린다. */
  const [intersections, setIntersections] = useState<
    ReadonlyMap<Element, boolean>
  >(() => new Map())

  useEffect(() => {
    if (
      narrow !== true ||
      !reactionsElement ||
      typeof window.IntersectionObserver !== 'function'
    ) {
      return
    }

    const targets = [reactionsElement, composerElement].filter(
      (element): element is HTMLElement => element !== null,
    )
    const observer = new window.IntersectionObserver(entries => {
      setIntersections(current => {
        const next = new Map<Element, boolean>()
        targets.forEach(target => {
          const known = current.get(target)
          if (known !== undefined) {
            next.set(target, known)
          }
        })
        entries.forEach(entry => {
          next.set(entry.target, entry.isIntersecting)
        })
        return next
      })
    })

    targets.forEach(target => observer.observe(target))
    return () => observer.disconnect()
  }, [narrow, reactionsElement, composerElement])

  /*
    입력칸 자리의 마지막으로 정해진 값. 입력칸 요소가 바뀌면(댓글 도착으로 null → 입력칸, 로그인 CTA ↔
    입력칸) 새 요소의 첫 관찰 결과가 오기 전까지 이 값을 그대로 쓴다. 「모름」 으로 두면 떠 있던 바가
    한 프레임 사라졌다 다시 slide-up 하고, 문서 끝 여백도 같이 출렁인다.
    렌더 중 갱신은 「이전 렌더 값 저장」 패턴이다 — 이펙트로 미루면 그 한 프레임이 그대로 보인다.
  */
  const [heldComposerVisible, setHeldComposerVisible] = useState<
    boolean | null
  >(null)
  const composerKnown = composerElement
    ? intersections.get(composerElement)
    : false

  if (composerKnown !== undefined && composerKnown !== heldComposerVisible) {
    setHeldComposerVisible(composerKnown)
  }

  const visible = shouldShowCommunityBottomBar({
    narrow,
    reactionVisible: reactionsElement
      ? (intersections.get(reactionsElement) ?? null)
      : null,
    composerVisible: composerKnown ?? heldComposerVisible,
  })

  if (!visible) {
    return null
  }

  const count = formatCommunityCount(likeCount)

  return (
    <>
      <Bar
        aria-label="게시글 빠른 반응"
        data-community-bottom-bar="true"
        role="group"
      >
        <IconButton
          $active={liked}
          type="button"
          aria-label={`게시글 좋아요 ${count}`}
          aria-pressed={liked}
          aria-busy={likePending || undefined}
          disabled={!authReady || likePending}
          onClick={onToggleLike}
        >
          <Heart
            aria-hidden="true"
            fill={liked ? 'currentColor' : 'none'}
            size={18}
          />
          <span>{count}</span>
        </IconButton>
        <ComposeButton
          type="button"
          aria-label="댓글을 남겨 보세요"
          onClick={onComment}
        >
          댓글을 남겨 보세요
        </ComposeButton>
        <IconButton type="button" aria-label="공유" onClick={onShare}>
          <Share aria-hidden="true" size={18} />
        </IconButton>
      </Bar>
      {createPortal(
        <Spacer aria-hidden="true" data-community-bottom-bar-spacer="true" />,
        document.body,
      )}
    </>
  )
}
