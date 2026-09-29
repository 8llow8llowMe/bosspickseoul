'use client'

import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import styled, { keyframes } from 'styled-components'

import { fetchAnalysisRankings } from '@/lib/api/analysis-ranking'
import { retryUnlessClientError } from '@/lib/api/api-error'
import { isApiSuccess } from '@/lib/api/response'
import { formatViewCount } from '@/lib/rankings/ranking-format'
import {
  describeLivePopular,
  LIVE_POPULAR_REFETCH_MS,
  LIVE_POPULAR_ROTATE_MS,
  LIVE_POPULAR_SIZE,
  nextLivePopularIndex,
  toLivePopularView,
} from '@/lib/recommend/live-popular'

const pulse = keyframes`
  0% {
    box-shadow: 0 0 0 0 color-mix(in srgb, var(--color-positive) 45%, transparent);
  }
  70% {
    box-shadow: 0 0 0 6px transparent;
  }
  100% {
    box-shadow: 0 0 0 0 transparent;
  }
`

const enter = keyframes`
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`

const Root = styled.div`
  display: grid;
  gap: 8px;
  padding: 12px 16px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  background: var(--color-surface);
  box-shadow: var(--shadow-level-2);
  animation: ${enter} var(--motion-standard) var(--ease-standard);

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`

const Header = styled.p`
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--color-text-600);
  font-size: 12px;
  font-weight: 600;
  line-height: 18px;
`

const LiveDot = styled.span`
  width: 8px;
  height: 8px;
  flex: none;
  border-radius: 50%;
  background: var(--color-positive);
  animation: ${pulse} 1.8s var(--ease-standard) infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`

const LiveLabel = styled.span`
  color: var(--color-text-800);
  font-weight: 700;
`

const Counter = styled.span`
  margin-left: auto;
  color: var(--color-text-caption);
  font-variant-numeric: tabular-nums;
`

const Line = styled.p`
  display: flex;
  align-items: baseline;
  gap: 8px;
  min-width: 0;
  animation: ${enter} var(--motion-standard) var(--ease-standard);

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`

const Rank = styled.span`
  flex: none;
  color: var(--color-primary-600);
  font-size: 13px;
  font-weight: 700;
`

const Name = styled.span`
  min-width: 0;
  overflow: hidden;
  color: var(--color-text-900);
  font-size: 15px;
  font-weight: 700;
  line-height: 22px;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const ViewCount = styled.span`
  flex: none;
  margin-left: auto;
  color: var(--color-text-caption);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
`

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * 조건 카드 아래 비는 자리를 채우는 「실시간 많이 본 상권」 띠.
 *
 * - 순위 API 만 따로 죽을 수 있다(RANKING_001 503). 실패·집계 비어 있음이면 **아무것도
 *   그리지 않는다** — 부가 정보라 추천 흐름을 막거나 에러 문구로 불안을 주면 안 된다.
 * - 한 줄씩 돌려 보여 준다. 마우스를 올리거나 포커스가 들어오면 멈추고(WCAG 2.2.2),
 *   동작 줄이기 설정이면 처음부터 돌리지 않는다.
 * - 바뀌는 문장을 스크린리더가 매번 읽지 않도록 live region 으로 두지 않는다.
 *   포커스하면 지금 줄을 읽을 수 있게 `tabIndex=0` + 라벨을 단다.
 */
export default function RecommendLivePopular() {
  const [index, setIndex] = useState(0)
  // 포인터와 포커스를 따로 센다. 한 값으로 두면 포커스가 남아 있는데 마우스가 지나가며
  // pointerleave 가 멈춤을 풀어 버린다.
  const [isHovered, setIsHovered] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const isPaused = isHovered || isFocused

  const rankingQuery = useQuery({
    queryKey: ['recommend', 'livePopularCommercials', LIVE_POPULAR_SIZE],
    queryFn: () => fetchAnalysisRankings('COMMERCIAL', LIVE_POPULAR_SIZE),
    retry: retryUnlessClientError(1),
    staleTime: LIVE_POPULAR_REFETCH_MS,
    refetchInterval: LIVE_POPULAR_REFETCH_MS,
  })

  const view = toLivePopularView(
    rankingQuery.data && isApiSuccess(rankingQuery.data)
      ? rankingQuery.data.dataBody
      : null,
  )
  const length = view?.items.length ?? 0

  useEffect(() => {
    if (length <= 1 || isPaused || prefersReducedMotion()) return undefined

    const timer = setInterval(
      () => setIndex(current => nextLivePopularIndex(current, length)),
      LIVE_POPULAR_ROTATE_MS,
    )
    return () => clearInterval(timer)
  }, [isPaused, length])

  if (!view) return null

  // 1분마다 다시 읽어 개수가 줄 수 있다. 남은 index 가 범위를 넘지 않게 접는다.
  const item = view.items[index % length]
  const label = describeLivePopular(item, view.windowLabel)

  return (
    <Root
      aria-label={label}
      aria-roledescription="실시간 인기 상권"
      data-testid="recommend-live-popular"
      role="group"
      tabIndex={0}
      onBlur={() => setIsFocused(false)}
      onFocus={() => setIsFocused(true)}
      onPointerEnter={() => setIsHovered(true)}
      onPointerLeave={() => setIsHovered(false)}
    >
      <Header aria-hidden="true">
        <LiveDot />
        <LiveLabel>실시간</LiveLabel>
        <span>
          {view.windowLabel ? `${view.windowLabel} ` : ''}많이 본 상권
        </span>
        {length > 1 ? (
          <Counter>
            {(index % length) + 1}/{length}
          </Counter>
        ) : null}
      </Header>
      <Line key={item.commercialCode} aria-hidden="true">
        <Rank>{item.rank}위</Rank>
        <Name>{item.name}</Name>
        <ViewCount>조회 {formatViewCount(item.viewCount)}</ViewCount>
      </Line>
    </Root>
  )
}
