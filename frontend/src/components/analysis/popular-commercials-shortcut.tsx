'use client'

import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { TrendingUp } from 'lucide-react'
import styled from 'styled-components'

import { Skeleton } from '@/components/ui/skeleton'
import { fetchAnalysisRankings } from '@/lib/api/analysis-ranking'
import { normalizeApiError, retryUnlessClientError } from '@/lib/api/api-error'
import { fetchCommercialRegion } from '@/lib/api/recommend'
import { getResponseBody, isApiSuccess } from '@/lib/api/response'
import { toPopularCommercialsView } from '@/lib/analysis/popular-commercials'
import { formatViewCount } from '@/lib/rankings/ranking-format'

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

const List = styled.ol`
  display: grid;
  gap: 4px;
`

const Row = styled.button`
  display: grid;
  grid-template-columns: 20px 1fr auto;
  align-items: center;
  gap: 8px;
  width: 100%;
  /* 터치 영역 확보(DESIGN.md §8): 리스트 행 최소 44px */
  min-height: 44px;
  padding: 0 8px;
  border: 0;
  border-radius: var(--radius-control);
  background: transparent;
  color: var(--color-text-900);
  font-size: 13px;
  text-align: left;
  cursor: pointer;
  transition: background var(--motion-fast) var(--ease-standard);

  &:hover:not(:disabled) {
    background: var(--color-surface);
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

const Name = styled.span`
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

const ErrorText = styled.p`
  color: var(--color-danger);
  font-size: 12px;
  line-height: 18px;
`

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
              <Skeleton $height="44px" />
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

      <List>
        {view.items.map(item => {
          const pending =
            jumpMutation.isPending &&
            jumpMutation.variables === item.commercialCode

          return (
            <li key={item.commercialCode}>
              <Row
                type="button"
                disabled={jumpMutation.isPending}
                aria-busy={pending || undefined}
                aria-label={`${item.rank}위 ${item.name}, 조회 ${item.viewCount.toLocaleString('ko-KR')}회. 이 상권으로 조건 채우기`}
                onClick={() => {
                  setFailedCode(null)
                  jumpMutation.mutate(item.commercialCode)
                }}
              >
                <Rank>{item.rank}</Rank>
                <Name>{item.name}</Name>
                <ViewCount>{formatViewCount(item.viewCount)}</ViewCount>
              </Row>
            </li>
          )
        })}
      </List>

      {failureMessage ? (
        <ErrorText role="alert">{failureMessage}</ErrorText>
      ) : null}
    </Root>
  )
}
