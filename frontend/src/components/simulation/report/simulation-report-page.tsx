'use client'

import { useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import styled from 'styled-components'

import SimulationErrorNotice from '@/components/simulation/simulation-error-notice'
import SimulationReportView from '@/components/simulation/report/simulation-report-view'
import { ButtonLink } from '@/components/ui/button'
import { EmptyState } from '@/components/ui'
import { Skeleton } from '@/components/ui/skeleton'
import { resolveApiError, retryUnlessClientError } from '@/lib/api/api-error'
import { createSimulationReport } from '@/lib/api/simulation'
import { getResponseBody } from '@/lib/api/response'
import { simulationReportQueryKey } from '@/lib/simulation/report-query'
import {
  parseSimulationReportRequest,
  simulationBuilderHref,
  type SimulationReportVariant,
} from '@/lib/simulation/report-route'

export type SimulationReportPageProps = { variant?: SimulationReportVariant }

const Page = styled.main`
  min-height: calc(100vh - 160px);
  padding: 32px 0 64px;
  background: var(--color-background-muted);

  @media (max-width: 1023px) {
    padding: 24px 0 48px;
  }
`

const Container = styled.div`
  width: min(1320px, calc(100% - 40px));
  margin: 0 auto;
  display: grid;
  gap: 16px;

  @media (max-width: 640px) {
    width: calc(100% - 32px);
  }
`

const Head = styled.header`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 4px 12px;

  h1 {
    color: var(--color-text-900);
    font-size: 22px;
    font-weight: 750;
    line-height: 32px;
    word-break: keep-all;
  }
`

const Loading = styled.div`
  display: grid;
  gap: 16px;
`

/**
 * 상세 리포트 화면. **조건의 정본은 쿼리스트링**이다.
 *
 * `useMutation` 이 아니라 `useQuery` 인 이유: 이 화면에서 계산은 사용자의 명령이 아니라
 * "이 URL 이 가리키는 결과"다. 새로고침·뒤로가기·링크로 들어와도 같은 화면이 나와야 하고,
 * 입력 화면이 미리 채워 둔 캐시(`simulationReportQueryKey`)를 그대로 집어야 재호출이 없다.
 *
 * 재시도는 `retryUnlessClientError()` 로 4xx 를 자동 재시도에서 빼고, 화면의 재시도 버튼
 * 노출은 `SimulationErrorNotice` 가 `isRetryable(kind)` 로 정한다 — 404 에는 버튼이 없다.
 */
export default function SimulationReportPage({
  variant = 'standalone',
}: SimulationReportPageProps) {
  const searchParams = useSearchParams()
  const request = useMemo(
    () => parseSimulationReportRequest(searchParams),
    [searchParams],
  )

  const query = useQuery({
    queryKey: request
      ? simulationReportQueryKey(request)
      : ['simulation-report', 'none'],
    queryFn: () => {
      if (!request) throw new Error('조건 없이 리포트를 계산할 수 없습니다.')
      return createSimulationReport(request)
    },
    enabled: request !== null,
    retry: retryUnlessClientError(),
  })

  const builderHref = simulationBuilderHref(variant)

  // 조건이 없는 URL 은 오류가 아니다 — 손상된 링크이거나 직접 들어온 경우다.
  if (!request) {
    return (
      <Page>
        <Container>
          <EmptyState
            title="계산할 조건이 없어요"
            description="창업 조건을 고르면 예상 비용과 상세 리포트를 보여드릴게요."
            action={
              <ButtonLink href={builderHref} leftIcon={<ArrowLeft />}>
                조건 고르러 가기
              </ButtonLink>
            }
          />
        </Container>
      </Page>
    )
  }

  const error = resolveApiError({ error: query.error, data: query.data })
  const report = error ? null : getResponseBody(query.data)

  return (
    <Page>
      <Container>
        <Head>
          <h1>창업 시뮬레이션 리포트</h1>
          <ButtonLink
            variant="ghost"
            href={builderHref}
            leftIcon={<ArrowLeft />}
          >
            조건 다시 고르기
          </ButtonLink>
        </Head>

        {query.isPending ? (
          <Loading aria-label="리포트 계산 중">
            <Skeleton $height="220px" />
            <Skeleton $height="280px" />
            <Skeleton $height="180px" />
          </Loading>
        ) : error ? (
          <SimulationErrorNotice
            error={error}
            onRetry={() => {
              void query.refetch()
            }}
          />
        ) : report ? (
          <SimulationReportView report={report} />
        ) : null}
      </Container>
    </Page>
  )
}
