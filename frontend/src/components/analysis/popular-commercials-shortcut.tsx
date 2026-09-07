'use client'

import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, TrendingUp } from 'lucide-react'
import styled from 'styled-components'

import { Skeleton } from '@/components/ui/skeleton'
import { fetchAnalysisRankings } from '@/lib/api/analysis-ranking'
import { normalizeApiError, retryUnlessClientError } from '@/lib/api/api-error'
import { fetchCommercialRegion } from '@/lib/api/recommend'
import { getResponseBody, isApiSuccess } from '@/lib/api/response'
import {
  type PopularCommercial,
  toPopularCommercialsView,
} from '@/lib/analysis/popular-commercials'
import { formatViewCount } from '@/lib/rankings/ranking-format'
import { computeScrollReach } from '@/lib/ui/scroll-reach'

/** 패널 1단계에 얹는 목록이라 짧게 유지한다. 자치구 25칩을 아래로 밀어내면 안 된다. */
const SHORTCUT_SIZE = 3

/** 역조회로 상위 코드까지 확보한 이동 목표. 셸이 이 값으로 선택 4단계 중 3개를 채운다. */
export type PopularCommercialJump = {
  commercialCode: string
  commercialName: string
  administrationCode: string
  districtCode: string
}

const Root = styled.section`
  display: grid;
  gap: 8px;
  padding: 12px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  background: var(--color-surface-muted);
`

const Heading = styled.h3`
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--color-text-700);
  font-size: 13px;
  font-weight: 700;
  line-height: 20px;

  svg {
    width: 14px;
    height: 14px;
    stroke: currentColor;
  }
`

const Caption = styled.span`
  color: var(--color-text-caption);
  font-size: 12px;
  font-weight: 500;
`

/*
  세 줄 목록이던 것을 한 줄 가로 스크롤로 눕혔다. 세로로 세우면 이 블록만 194px 을
  먹어 바로 아래 자치구 25칩이 71px 만 받았다(1280x720 실측). 지름길이 본 갈래보다
  자리를 더 차지하면 안 된다.
*/
const List = styled.ol`
  display: flex;
  gap: 8px;
  /* overflow-x 를 켜면 overflow-y 도 auto 로 계산돼 포커스 링이 위아래로 잘린다.
     링은 outline 2px + offset 2px 라 위아래로 4px 을 먹는다. 여유를 둬 8px 을
     안쪽에 확보하고 같은 값만큼 밖으로 당겨 블록 높이는 그대로 둔다. */
  margin: -8px -12px;
  padding: 8px 12px;
  overflow-x: auto;
  overscroll-behavior-x: contain;
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* legacy Edge */

  &::-webkit-scrollbar {
    display: none;
  }

  > li {
    flex: 0 0 auto;
  }
`

const Row = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  /* 터치 영역 확보(DESIGN.md §8): 최소 44px */
  min-height: 44px;
  padding: 0 12px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-control);
  background: var(--color-surface);
  color: var(--color-text-900);
  font-size: 13px;
  text-align: left;
  cursor: pointer;
  transition:
    border-color var(--motion-fast) var(--ease-standard),
    background var(--motion-fast) var(--ease-standard);

  &:hover:not(:disabled) {
    border-color: var(--color-primary-600);
    background: var(--color-primary-100);
  }

  &:disabled {
    cursor: progress;
    opacity: 0.6;
  }
`

const Rank = styled.span`
  color: var(--color-primary-700);
  font-size: 12px;
  font-weight: 700;
`

/* 가로로 눕혔으니 폭 경쟁은 없다. 다만 한 칩이 패널을 통째로 덮지 않게 상한만 둔다. */
const Name = styled.span`
  max-width: 180px;
  overflow: hidden;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const ViewCount = styled.span`
  color: var(--color-text-caption);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
`

/*
  칩이 셋뿐이어도 넘친다 — 패널이 min(380px, 92%) 인데 칩 하나가 160~200px 이다.
  스크롤 여력이 있다는 사실 자체가 드러나지 않아 화살표를 목록 위에 얹는다.
*/
const Scroller = styled.div`
  position: relative;
  /*
    전에는 List 자신이 Root 의 그리드 항목이었고 overflow-x: auto 라 min-width: auto
    가 0 으로 풀렸다. 래퍼를 끼우면서 스크롤 컨테이너가 아닌 이 div 가 그리드 항목이
    돼 콘텐츠 폭만큼 벌어진다 — 실측으로 Root 379px 를 449px 까지 밀어냈다.
  */
  min-width: 0;
`

const Arrow = styled.button<{ $side: 'left' | 'right' }>`
  position: absolute;
  top: 50%;
  ${props => (props.$side === 'left' ? 'left: 0;' : 'right: 0;')}
  z-index: 2;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-pill);
  background: var(--color-surface);
  color: var(--color-text-700);
  box-shadow: var(--shadow-level-1);
  cursor: pointer;
  transition:
    border-color var(--motion-fast) var(--ease-standard),
    color var(--motion-fast) var(--ease-standard);

  svg {
    width: 16px;
    height: 16px;
    stroke: currentColor;
  }

  &:hover {
    border-color: var(--color-primary-600);
    color: var(--color-primary-700);
  }

  /*
    터치 기기에서는 스와이프가 자연스럽고, DESIGN.md 44px 터치 규칙을 지키면 원이
    커져 380px 패널에서 칩을 가린다. 마우스 전용으로 둔다.
  */
  @media (max-width: 1024px) {
    display: none;
  }
`

const ErrorText = styled.p`
  color: var(--color-danger);
  font-size: 12px;
  line-height: 18px;
`

/*
  목록과 화살표를 한 컴포넌트로 묶는다.

  부모는 조회 상태에 따라 두 번 일찍 return 한다(pending · 집계 비어 있음). 스크롤
  상태 훅을 부모에 두면 훅 순서가 그 return 들에 걸린다. 여기로 내리면 「항목이
  있을 때만」 훅이 산다. 부모는 SSR 에서 쿼리가 pending 이라 스켈레톤만 그리므로,
  테스트에서 이 컴포넌트를 단독 렌더할 수 있는 것도 같은 분리 덕분이다.
*/
export function ShortcutTrack({
  items,
  busy,
  pendingCode,
  onSelect,
}: {
  items: PopularCommercial[]
  busy: boolean
  pendingCode: string | null
  onSelect: (commercialCode: string) => void
}) {
  const listRef = useRef<HTMLOListElement>(null)
  const [reach, setReach] = useState({ left: false, right: false })

  useEffect(() => {
    const list = listRef.current
    if (!list) return undefined

    const update = () =>
      setReach(
        computeScrollReach(list.scrollLeft, list.scrollWidth, list.clientWidth),
      )

    update()
    list.addEventListener('scroll', update, { passive: true })

    /* 패널 폭이 바뀌면(창 크기·사이드바 접힘) 넘침 여부가 달라진다. */
    const observer = new ResizeObserver(update)
    observer.observe(list)

    return () => {
      list.removeEventListener('scroll', update)
      observer.disconnect()
    }
  }, [items.length])

  const nudge = (direction: -1 | 1) => {
    const list = listRef.current
    if (!list) return
    list.scrollBy({
      left: direction * list.clientWidth * 0.8,
      behavior: 'smooth',
    })
  }

  return (
    <Scroller>
      {reach.left ? (
        <Arrow
          type="button"
          $side="left"
          /*
            목록의 칩이 이미 탭으로 순회된다 — 화살표는 마우스용 중복 조작이라
            접근성 트리에서 뺀다.
          */
          aria-hidden="true"
          tabIndex={-1}
          onClick={() => nudge(-1)}
        >
          <ChevronLeft />
        </Arrow>
      ) : null}

      <List ref={listRef}>
        {items.map(item => (
          <li key={item.commercialCode}>
            <Row
              type="button"
              disabled={busy}
              aria-busy={pendingCode === item.commercialCode || undefined}
              aria-label={`${item.rank}위 ${item.name}, 조회 ${item.viewCount.toLocaleString('ko-KR')}회. 이 상권으로 조건 채우기`}
              onClick={() => onSelect(item.commercialCode)}
            >
              <Rank>{item.rank}</Rank>
              <Name>{item.name}</Name>
              <ViewCount>{formatViewCount(item.viewCount)}</ViewCount>
            </Row>
          </li>
        ))}
      </List>

      {reach.right ? (
        <Arrow
          type="button"
          $side="right"
          aria-hidden="true"
          tabIndex={-1}
          onClick={() => nudge(1)}
        >
          <ChevronRight />
        </Arrow>
      ) : null}
    </Scroller>
  )
}

export default function PopularCommercialsShortcut({
  onJump,
}: {
  onJump: (target: PopularCommercialJump) => void
}) {
  const [failedCode, setFailedCode] = useState<string | null>(null)

  const rankingQuery = useQuery({
    queryKey: ['analysis', 'popularCommercials', SHORTCUT_SIZE],
    queryFn: () => fetchAnalysisRankings('COMMERCIAL', SHORTCUT_SIZE),
    /*
      이 API 만 따로 죽는다 — 집계 파이프라인(Kafka/Redis)이 멈추면 여기만
      RANKING_001(503)이고 다른 분석 API 는 멀쩡하다. 그래서 이 블록의 실패가
      패널 전체(자치구 선택)로 번지지 않게 이 컴포넌트 안에서 끝낸다.
    */
    retry: retryUnlessClientError(1),
    staleTime: 5 * 60 * 1000,
  })

  /**
   * 상위 코드 역조회. **눌린 항목 하나만** 부른다 — 목록 전체를 미리 조회하면 N+1 이다.
   */
  const jumpMutation = useMutation({
    mutationFn: (commercialCode: string) =>
      fetchCommercialRegion(commercialCode),
    onSuccess: (response, commercialCode) => {
      const region = getResponseBody(response)
      /*
       * 성공 응답인데 상위 코드가 비어 있으면 이동해도 3단계가 채워지지 않는다.
       * 반쯤 채워진 화면으로 보내느니 여기서 멈추고 이유를 적는다.
       */
      if (!region?.administrationCode || !region?.districtCode) {
        setFailedCode(commercialCode)
        return
      }
      setFailedCode(null)
      onJump({
        commercialCode: region.commercialCode || commercialCode,
        commercialName: region.commercialName,
        administrationCode: region.administrationCode,
        districtCode: region.districtCode,
      })
    },
    onError: (_error, commercialCode) => setFailedCode(commercialCode),
  })

  if (rankingQuery.isPending) {
    return (
      <Root aria-busy="true" aria-label="지금 많이 본 상권 불러오는 중">
        <Heading>
          <TrendingUp aria-hidden="true" />
          지금 많이 본 상권
        </Heading>
        <List aria-hidden="true">
          {Array.from({ length: SHORTCUT_SIZE }, (_, index) => (
            <li key={index}>
              <Skeleton $height="44px" $width="132px" />
            </li>
          ))}
        </List>
      </Root>
    )
  }

  const body =
    rankingQuery.data && isApiSuccess(rankingQuery.data)
      ? rankingQuery.data.dataBody
      : null
  const view = body ? toPopularCommercialsView(body, SHORTCUT_SIZE) : null

  // 집계가 비어 있거나(배포 직후) 순위 API 만 죽었으면 블록을 통째로 뺀다.
  if (!view || view.items.length === 0) return null

  const failureMessage = failedCode
    ? ((jumpMutation.error
        ? normalizeApiError(jumpMutation.error).message
        : null) ?? '이 상권의 지역 정보를 찾지 못했어요. 목록에서 골라 주세요.')
    : null

  return (
    <Root aria-label="지금 많이 본 상권">
      <Heading>
        <TrendingUp aria-hidden="true" />
        지금 많이 본 상권
        {view.windowLabel ? <Caption>· {view.windowLabel}</Caption> : null}
      </Heading>

      <ShortcutTrack
        items={view.items}
        busy={jumpMutation.isPending}
        pendingCode={
          jumpMutation.isPending ? (jumpMutation.variables ?? null) : null
        }
        onSelect={commercialCode => {
          setFailedCode(null)
          jumpMutation.mutate(commercialCode)
        }}
      />

      {failureMessage ? (
        <ErrorText role="alert">{failureMessage}</ErrorText>
      ) : null}
    </Root>
  )
}
