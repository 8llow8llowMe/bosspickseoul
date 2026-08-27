'use client'

import { useCallback, useMemo } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Scale } from 'lucide-react'
import styled from 'styled-components'

import SimulationCompareColumns from '@/components/simulation/compare/simulation-compare-columns'
import SimulationConditionCompactEditor from '@/components/simulation/compare/simulation-condition-compact-editor'
import SimulationErrorNotice from '@/components/simulation/simulation-error-notice'
import { Button, ButtonLink } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { resolveApiError, retryUnlessClientError } from '@/lib/api/api-error'
import { createSimulationReportPair } from '@/lib/api/simulation'
import { getResponseBody } from '@/lib/api/response'
import { SIMULATION_COMPARE_SIDE_LABELS } from '@/lib/simulation/compare-presentation'
import {
  buildSimulationCompareHref,
  parseSimulationCompareConditionPair,
  parseSimulationComparePair,
} from '@/lib/simulation/compare-route'
import {
  SIMULATION_COMPARE_QUERY_SCOPE,
  simulationComparePairQueryKey,
  simulationReportQueryKey,
} from '@/lib/simulation/report-query'
import {
  simulationBuilderHref,
  type SimulationReportVariant,
} from '@/lib/simulation/report-route'
import { useSimulationConditions } from '@/lib/simulation/use-simulation-conditions'
import type { SimulationReport } from '@/types/simulation'

export type SimulationComparePageProps = { variant?: SimulationReportVariant }

const Page = styled.main`
  min-height: calc(100vh - 160px);
  padding: 32px 0 64px;
  background: var(--color-background-muted);

  @media (max-width: 1023px) {
    padding: 24px 0 48px;
  }
`

const Container = styled.div`
  width: min(1000px, calc(100% - 40px));
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

const Editors = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;

  @media (max-width: 767px) {
    grid-template-columns: minmax(0, 1fr);
  }
`

const EditorCard = styled.section`
  min-width: 0;
  display: grid;
  gap: 12px;
  align-content: start;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  background: var(--color-surface);
  padding: 20px;

  h2 {
    color: var(--color-text-900);
    font-size: 16px;
    font-weight: 700;
    line-height: 24px;
  }
`

const Submit = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;

  button {
    min-width: 220px;
  }
`

const SubmitHint = styled.p`
  color: var(--color-text-caption);
  font-size: 13px;
  line-height: 20px;
  text-align: center;
  word-break: keep-all;
`

const Loading = styled.div`
  display: grid;
  gap: 16px;
`

/**
 * A/B 비교 화면.
 *
 * ## 비교 API 가 없다 — 리포트를 2회 병렬 호출한다
 *
 * `createSimulationReportPair` 가 `Promise.all` 로 묶는다. **`allSettled` 로 바꾸지 않는다**(G10):
 * 한쪽만 성공한 화면은 비교가 아니라 "결과 하나 + 빈 칸"이고, 그 빈 칸을 사용자는 "이 조건은
 * 비용이 0"이나 "계산 중"으로 읽는다. 부분 성공을 허용하는 순간 오류 UI 도 좌우 두 개가
 * 되어 무엇이 잘못됐는지 흐려진다 — 오류는 **하나만** 띄운다.
 *
 * ## 결과의 정본도 URL 이다
 *
 * 리포트 화면과 같은 모양이다 — 비교 결과는 사용자의 명령이 아니라 **"이 URL 이 가리키는
 * 결과"**다. 그래서 `useMutation` 이 아니라 `useQuery` 이고, 조회 조건은 편집기 상태가
 * 아니라 **쿼리스트링**(`parseSimulationComparePair`)에서 뽑는다. 새로고침·뒤로가기·링크로
 * 들어와도 같은 화면이 나오고, 링크를 받은 사람이 `비교하기` 를 다시 누를 일이 없다.
 *
 * 자동 계산을 `useEffect` 로 하지 않는 이유가 여기 있다. effect 는 "언제 한 번 쏠지"를
 * 직접 지켜야 해서 라우트 재진입·프리렌더 타이밍마다 답이 달라지지만, `enabled` 는
 * 조건이 없으면 애초에 돌지 않고 같은 URL 이면 캐시를 집는다. 판정이 키 안에 있다.
 *
 * ## 편집의 정본은 여전히 편집기다
 *
 * URL 을 편집 중에 따라 바꾸면 키 입력마다 재계산된다. 그래서 URL 은 `비교하기` 를 누를 때만
 * 갱신하고(`router.replace`), 그 URL 이 쿼리를 트리거한다. 편집기 초기값만 URL 에서 읽는다.
 */
export default function SimulationComparePage({
  variant = 'standalone',
}: SimulationComparePageProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()

  // 초기값은 마운트 시 한 번만 읽는다 — `useSimulationConditions` 가 그렇게 동작한다.
  // URL 은 "들어올 때의 조건"이고, 그 뒤로는 편집기가 정본이다.
  const initial = parseSimulationCompareConditionPair(searchParams)
  const left = useSimulationConditions(initial.left)
  const right = useSimulationConditions(initial.right)

  const leftRequest = left.reportRequest
  const rightRequest = right.reportRequest
  const canCalculate = leftRequest !== null && rightRequest !== null

  // 조회의 정본. 편집기가 아니라 **URL** 에서 뽑는다 — 이 둘이 갈라져 있는 것이 이 화면의 요점이다.
  const urlPair = useMemo(
    () => parseSimulationComparePair(searchParams),
    [searchParams],
  )
  const { left: urlLeft, right: urlRight } = urlPair

  const query = useQuery({
    queryKey:
      urlLeft && urlRight
        ? simulationComparePairQueryKey(urlLeft, urlRight)
        : [SIMULATION_COMPARE_QUERY_SCOPE, 'none'],
    queryFn: async () => {
      if (!urlLeft || !urlRight) {
        throw new Error('양쪽 조건이 모두 완성되어야 비교할 수 있습니다.')
      }

      const reports = await createSimulationReportPair([urlLeft, urlRight])

      /**
       * 계산한 리포트를 단일 리포트 화면의 캐시 키로 시딩한다. 이게 없으면
       * `상세 리포트 보기` 를 누를 때마다 이미 계산해 둔 결과를 두고 다시 POST 한다.
       *
       * v5 `useQuery` 에는 `onSuccess` 가 없다. effect 로 미루면 시딩이 렌더 한 번 늦어
       * 그 사이에 링크를 누른 사용자만 재호출을 맞는데, 그건 재현되지 않는 종류의 낭비다.
       * 키는 `simulationReportQueryKey` 한 곳에서 만들어 두 화면이 반드시 같은 키를 쓴다.
       */
      queryClient.setQueryData(simulationReportQueryKey(urlLeft), reports[0])
      queryClient.setQueryData(simulationReportQueryKey(urlRight), reports[1])

      return reports
    },
    enabled: urlLeft !== null && urlRight !== null,
    retry: retryUnlessClientError(),
  })

  /**
   * `비교하기` 는 계산을 명령하지 않는다. **URL 을 편집기 상태와 맞출 뿐**이고, 그 URL 이
   * 쿼리를 트리거한다.
   *
   * 이미 같은 URL 이면 할 일이 없다 — 그 URL 이 가리키는 결과는 아래에 이미 떠 있거나
   * 오류 안내가 자기 재시도 버튼을 달고 있다. 같은 URL 로 재탐색을 걸면 세그먼트가 다시
   * 마운트될 수 있고, 그러면 방금 받은 결과가 날아간다.
   *
   * `push` 가 아니라 `replace` 인 이유: 조건을 고쳐 가며 여러 번 누르는 화면이라 매 계산이
   * 히스토리에 쌓이면 뒤로가기가 이 화면 안에서만 맴돈다.
   */
  const onCompare = useCallback(() => {
    if (!leftRequest || !rightRequest) return

    const href = buildSimulationCompareHref(
      { left: leftRequest, right: rightRequest },
      variant,
    )

    if (href !== `${pathname}?${searchParams}`) router.replace(href)
  }, [leftRequest, rightRequest, pathname, searchParams, router, variant])

  const error = resolveApiError({ error: query.error, data: undefined })
  // 응답 봉투 안의 실패도 오류다 — 한쪽만 봉투 실패면 그 화면은 비교가 아니다.
  const pair = query.data
  const leftReport: SimulationReport | null = pair
    ? getResponseBody(pair[0])
    : null
  const rightReport: SimulationReport | null = pair
    ? getResponseBody(pair[1])
    : null
  const hasBoth = leftReport !== null && rightReport !== null
  const envelopeError =
    pair !== undefined && !hasBoth
      ? (resolveApiError({ error: null, data: pair[0] }) ??
        resolveApiError({ error: null, data: pair[1] }))
      : null
  const shownError = error ?? envelopeError
  /**
   * `enabled: false` 인 동안 v5 의 `status` 는 계속 `'pending'` 이다 — `isPending` 만 보면
   * 조건을 고르기도 전에 스켈레톤이 깔린다. URL 이 완성됐을 때만 계산 중으로 친다.
   */
  const isCalculating =
    urlLeft !== null &&
    urlRight !== null &&
    (query.isPending || query.isFetching)

  return (
    <Page>
      <Container>
        <Head>
          <h1>조건 비교</h1>
          <ButtonLink
            variant="ghost"
            href={simulationBuilderHref(variant)}
            leftIcon={<ArrowLeft />}
          >
            조건 하나만 계산하기
          </ButtonLink>
        </Head>

        <Editors>
          <EditorCard
            aria-label={`${SIMULATION_COMPARE_SIDE_LABELS.left} 조건`}
          >
            <h2>{SIMULATION_COMPARE_SIDE_LABELS.left}</h2>
            <SimulationConditionCompactEditor
              label={SIMULATION_COMPARE_SIDE_LABELS.left}
              conditions={left}
            />
          </EditorCard>

          <EditorCard
            aria-label={`${SIMULATION_COMPARE_SIDE_LABELS.right} 조건`}
          >
            <h2>{SIMULATION_COMPARE_SIDE_LABELS.right}</h2>
            <SimulationConditionCompactEditor
              label={SIMULATION_COMPARE_SIDE_LABELS.right}
              conditions={right}
            />
          </EditorCard>
        </Editors>

        <Submit>
          <Button
            type="button"
            leftIcon={<Scale />}
            disabled={!canCalculate || isCalculating}
            onClick={onCompare}
          >
            {isCalculating ? '비교하는 중…' : '비교하기'}
          </Button>
          {/* 무엇이 남았는지는 각 편집기가 자기 gap 으로 말한다. 여기서는 "양쪽이 필요하다"만. */}
          {canCalculate ? null : (
            <SubmitHint>양쪽 조건을 모두 고르면 비교할 수 있어요.</SubmitHint>
          )}
        </Submit>

        {!hasBoth && isCalculating ? (
          <Loading aria-label="비교 계산 중" role="status">
            <Skeleton $height="240px" />
          </Loading>
        ) : shownError ? (
          /* 오류는 하나만. 두 호출 중 어느 쪽이 실패했는지 갈라 보여주면
             "한쪽은 됐다"로 읽혀 부분 성공을 금지한 뜻이 사라진다. */
          <SimulationErrorNotice
            error={shownError}
            onRetry={() => {
              void query.refetch()
            }}
          />
        ) : leftReport && rightReport ? (
          <SimulationCompareColumns
            left={leftReport}
            right={rightReport}
            variant={variant}
          />
        ) : null}
      </Container>
    </Page>
  )
}
