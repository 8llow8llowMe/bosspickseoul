'use client'

import { useCallback, useMemo } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Scale } from 'lucide-react'
import styled from 'styled-components'

import SimulationErrorNotice from '@/components/simulation/simulation-error-notice'
import SimulationReportBar from '@/components/simulation/report/simulation-report-bar'
import SimulationReportView from '@/components/simulation/report/simulation-report-view'
import SimulationSaveButton, {
  SimulationSaveFeedback,
} from '@/components/simulation/report/simulation-save-button'
import { ButtonLink } from '@/components/ui/button'
import { EmptyState } from '@/components/ui'
import { Skeleton } from '@/components/ui/skeleton'
import { resolveApiError, retryUnlessClientError } from '@/lib/api/api-error'
import { createSimulationReport } from '@/lib/api/simulation'
import { buildSimulationCompareHref } from '@/lib/simulation/compare-route'
import { getResponseBody } from '@/lib/api/response'
import {
  simulationSectionDomId,
  toSimulationReportRequest,
  type SimulationConditionSection,
} from '@/lib/simulation/conditions'
import { simulationReportQueryKey } from '@/lib/simulation/report-query'
import { useSimulationSave } from '@/lib/simulation/use-simulation-save'
import {
  parseSimulationConditionState,
  simulationBuilderHref,
  type SimulationReportVariant,
} from '@/lib/simulation/report-route'
import { shellWidth } from '@/styles/layout'
import type {
  SimulationReport,
  SimulationReportRequest,
} from '@/types/simulation'
import { SIMULATION_MEDIA } from '@/components/simulation/simulation-media'

export type SimulationReportPageProps = { variant?: SimulationReportVariant }

type SimulationReportReadyProps = {
  report: SimulationReport
  request: SimulationReportRequest
  currentHref: string
  compareHref: string
}

const Page = styled.main`
  min-height: calc(100vh - 160px);
  padding: 32px 0 64px;
  background: var(--color-background-muted);

  /*
    ≤1023 은 하단 고정 바에 가리지 않게 여백을 둔다. 바는 71px(저장 결과 한 줄이 붙으면 99px, 두 줄
    오류면 약 119px)이고, iPhone 처럼 하단 safe-area 가 있으면 그만큼(최대 34px) 더 커진다.
  */
  @media ${SIMULATION_MEDIA.belowDesktop} {
    padding: 24px 0 calc(120px + env(safe-area-inset-bottom));
  }
`

/*
  셸 안에서 2단 트랙 합(340 + 20 + 880)에서 멈춘다 — 입력 화면과 같은 방식이다(DESIGN §5: 셸에는
  상한이 없고 상한은 요소가 진다). 전에는 읽기 칸(720) 한 줄 가운데 정렬이라 1440 에서 좌우가
  비었다. 이제 왼쪽 기준선이 사이트 헤더·입력 화면과 같다.
*/
const Container = styled.div`
  ${shellWidth}
  display: grid;
  gap: 16px;

  > * {
    max-width: calc(340px + 20px + var(--w-form));
  }
`

/*
  리포트가 아닌 상태(조건 없음 · 오류)는 읽기 칸(`--w-read` 720)에 둔다. 2단 묶음 상한(1,240)을 그대로
  받으면 오류 문장이 1,240px 한 줄로 늘어난다. 왼쪽 정렬이라 위 h1 과 기준선이 같다.
*/
const Narrow = styled.div`
  width: 100%;
  max-width: var(--w-read);
`

/*
  로딩 스켈레톤은 그려질 리포트와 같은 2단으로 둔다. 한 단으로 그렸다가 2단으로 바뀌면 레이아웃이 튄다.
  트랙은 SimulationReportView 의 Layout 과 같다.
*/
const Loading = styled.div`
  display: grid;
  grid-template-columns: 340px minmax(0, var(--w-form));
  align-items: start;
  gap: 20px;

  > div {
    display: grid;
    gap: 16px;
  }

  @media ${SIMULATION_MEDIA.belowDesktop} {
    grid-template-columns: minmax(0, 1fr);
    gap: 16px;
  }
`

/* 저장·비교 버튼. 둘 다 large·full width 로 세로로 쌓는다(R2). */
const ActionButtons = styled.div`
  display: grid;
  gap: 8px;

  > button,
  > a {
    width: 100%;
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

const Head = styled.header`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 4px 12px;

  h1 {
    color: var(--color-text-900);
    font-size: 22px;
    font-weight: 700;
    line-height: 32px;
    word-break: keep-all;
  }
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

  // 고른 조건을 실어 보낸다. 이게 없으면 리포트를 빠져나오는 순간 고른 조건이 전부 초기화된다.
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
          <Narrow>
            <EmptyState
              title="계산할 조건이 없어요"
              description="창업 조건을 고르면 예상 비용과 상세 리포트를 보여드릴게요."
              action={
                <ButtonLink href={builderHref} leftIcon={<ArrowLeft />}>
                  조건 고르러 가기
                </ButtonLink>
              }
            />
          </Narrow>
        </Container>
      </Page>
    )
  }

  const error = resolveApiError({ error: query.error, data: query.data })
  const report = error ? null : getResponseBody(query.data)
  const isLoading = !report && (query.isPending || query.isFetching)
  const currentHref = `${pathname}?${searchParams}`

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

        {/*
          로딩 알림은 늘 있는 status 영역 하나의 **글자만** 바꾼다(R12). 스켈레톤만으로는 낭독기가 아무것도
          읽지 않고, 로딩 묶음에 role 을 달면 영역과 내용이 함께 붙어 읽지 않는 낭독기가 있다.
        */}
        <VisuallyHidden role="status">
          {isLoading ? '리포트를 계산하고 있어요' : ''}
        </VisuallyHidden>

        {/* v5 에서 오류 후 refetch 는 status='error' 그대로 두고 fetchStatus 만 바뀐다 — isPending 만 보면 재시도가 화면에 드러나지 않는다. 이미 그릴 리포트가 있으면 조용한 background refetch 로 화면을 덮지 않는다. */}
        {isLoading ? (
          <Loading aria-hidden="true">
            <div>
              <Skeleton $height="480px" />
            </div>
            <div>
              <Skeleton $height="280px" />
              <Skeleton $height="180px" />
            </div>
          </Loading>
        ) : error ? (
          <Narrow>
            <SimulationErrorNotice
              // h1(리포트) 바로 아래라 h2 — h3 로 두면 h1 → h3 로 건너뛴다(X4).
              headingLevel={2}
              error={error}
              onRetry={() => {
                void query.refetch()
              }}
              onReselect={reselectSection}
            />
          </Narrow>
        ) : report ? (
          // 조건(URL)이 바뀌면 저장 상태를 새로 시작한다. 캐시에 다음 리포트가 있으면 로딩 분기를 건너뛰어
          // 이 컴포넌트가 그대로 남고, 앞 리포트의 「저장됨」이 다음 리포트에 붙는다.
          <SimulationReportReady
            key={currentHref}
            report={report}
            request={request}
            currentHref={currentHref}
            compareHref={buildSimulationCompareHref(
              { left: request, right: null },
              variant,
              { left: conditionState.brandName },
            )}
          />
        ) : null}
      </Container>
    </Page>
  )
}

/**
 * 리포트가 그려진 상태. 저장 상태(`useSimulationSave`)를 **여기 한 곳**에서 들고 요약 열과 하단 바에
 * 같이 내려준다 — 두 벌의 버튼이 따로 저장 상태를 가지면 한쪽에서 저장해도 다른 쪽은 `결과 저장`
 * 그대로다. 훅은 리포트·요청이 있어야 부를 수 있어 페이지의 조기 반환 뒤가 아니라 이 컴포넌트에 둔다.
 */
export function SimulationReportReady({
  report,
  request,
  currentHref,
  compareHref,
}: SimulationReportReadyProps) {
  const save = useSimulationSave(request, report.totalPrice)

  return (
    <>
      <SimulationReportView
        report={report}
        actions={
          <>
            <ActionButtons>
              <SimulationSaveButton
                state={save}
                currentHref={currentHref}
                size="large"
              />
              {/* 이 조건을 왼쪽에 채운 비교 화면을 연다. 오른쪽은 비어 있는 채로
                편집기가 열린다 — 한쪽만 있는 URL 은 오류가 아니다. */}
              <ButtonLink
                size="large"
                variant="secondary"
                href={compareHref}
                leftIcon={<Scale />}
              >
                다른 조건과 비교
              </ButtonLink>
            </ActionButtons>
            <SimulationSaveFeedback state={save} offset="top" />
          </>
        }
      />
      <SimulationReportBar
        totalPrice={report.totalPrice}
        save={save}
        currentHref={currentHref}
        compareHref={compareHref}
      />
    </>
  )
}
