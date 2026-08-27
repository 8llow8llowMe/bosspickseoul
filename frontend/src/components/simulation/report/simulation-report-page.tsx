'use client'

import { useCallback, useMemo } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import styled from 'styled-components'

import SimulationErrorNotice from '@/components/simulation/simulation-error-notice'
import SimulationReportView from '@/components/simulation/report/simulation-report-view'
import SimulationSaveButton from '@/components/simulation/report/simulation-save-button'
import { ButtonLink } from '@/components/ui/button'
import { EmptyState } from '@/components/ui'
import { Skeleton } from '@/components/ui/skeleton'
import { resolveApiError, retryUnlessClientError } from '@/lib/api/api-error'
import { createSimulationReport } from '@/lib/api/simulation'
import { getResponseBody } from '@/lib/api/response'
import {
  simulationSectionDomId,
  toSimulationReportRequest,
  type SimulationConditionSection,
} from '@/lib/simulation/conditions'
import { simulationReportQueryKey } from '@/lib/simulation/report-query'
import {
  parseSimulationConditionState,
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
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  // 조건 상태를 먼저 복원하고 거기서 요청을 뽑는다. 상태를 따로 들고 있어야
  // 되돌아가기 링크가 **미완성 조건까지** 실어 보낼 수 있다(요청은 미완성이면 null 이다).
  const conditionState = useMemo(
    () => parseSimulationConditionState(searchParams),
    [searchParams],
  )
  const request = useMemo(
    () => toSimulationReportRequest(conditionState),
    [conditionState],
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

  // 고른 조건을 실어 보낸다. 이게 없으면 리포트를 빠져나오는 순간 조건 4개가 초기화된다.
  const builderHref = simulationBuilderHref(variant, conditionState)

  /**
   * 오류가 지목한 조건 섹션으로 데려간다.
   *
   * 입력 화면과 달리 여기서는 **라우트를 넘어가야** 하므로 DOM 스크롤이 아니라 해시다.
   * 섹션 id 는 `simulationSectionDomId` 한 곳에서 만들어 양쪽이 같은 앵커를 쓴다.
   */
  const reselectSection = useCallback(
    (section: SimulationConditionSection) => {
      router.push(`${builderHref}#${simulationSectionDomId(section)}`)
    },
    [builderHref, router],
  )

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

        {/* v5 에서 오류 후 refetch 는 status='error' 그대로 두고 fetchStatus 만 바뀐다 — isPending 만 보면 재시도가 화면에 드러나지 않는다. 이미 그릴 리포트가 있으면 조용한 background refetch 로 화면을 덮지 않는다. */}
        {!report && (query.isPending || query.isFetching) ? (
          <Loading aria-label="리포트 계산 중" role="status">
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
            onReselect={reselectSection}
          />
        ) : report ? (
          <SimulationReportView
            report={report}
            actions={
              <SimulationSaveButton
                request={request}
                totalPrice={report.totalPrice}
                currentHref={`${pathname}?${searchParams}`}
              />
            }
          />
        ) : null}
      </Container>
    </Page>
  )
}
