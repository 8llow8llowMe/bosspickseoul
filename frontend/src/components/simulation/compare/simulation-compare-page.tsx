'use client'

import { useCallback } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Scale } from 'lucide-react'
import styled from 'styled-components'

import SimulationCompareColumns from '@/components/simulation/compare/simulation-compare-columns'
import SimulationConditionCompactEditor from '@/components/simulation/compare/simulation-condition-compact-editor'
import SimulationErrorNotice from '@/components/simulation/simulation-error-notice'
import { Button, ButtonLink } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { resolveApiError } from '@/lib/api/api-error'
import { createSimulationReportPair } from '@/lib/api/simulation'
import { getResponseBody } from '@/lib/api/response'
import { SIMULATION_COMPARE_SIDE_LABELS } from '@/lib/simulation/compare-presentation'
import {
  buildSimulationCompareHref,
  parseSimulationCompareConditionPair,
} from '@/lib/simulation/compare-route'
import { simulationReportQueryKey } from '@/lib/simulation/report-query'
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
 * ## 조건의 정본은 URL, 결과의 정본은 mutation
 *
 * 리포트 화면과 다르다. 리포트는 "이 URL 이 가리키는 결과"라 `useQuery` 였지만, 비교는
 * 사용자가 양쪽을 고르고 **누를 때** 두 번 계산하는 명령이다. 그래서 `useMutation` 이고,
 * 성공 후 `router.replace` 로 URL 을 조건과 맞춘다.
 *
 * 그래서 새로고침·링크 공유에서 **복원되는 것은 조건까지**다. 결과는 `비교하기` 를 한 번
 * 눌러야 다시 나온다. 완성된 URL 로 들어올 때 자동으로 계산하게 해 볼 수 있지만, 그건
 * 이 화면에서 POST 2회를 사용자 동작 없이 쏘는 일이고 라우트 재진입·프리렌더 타이밍과
 * 얽혀 동작이 흔들렸다 — 자동화하려면 URL 을 결과의 정본으로 삼는 `useQuery` 로 화면을
 * 다시 세우는 편이 맞다. 지금은 명령형 한 벌만 둔다.
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

  /**
   * 계산한 리포트를 단일 리포트 화면의 캐시 키로 시딩한다.
   *
   * 이게 없으면 `상세 리포트 보기` 를 누를 때마다 이미 계산해 둔 결과를 두고 다시 POST 한다.
   * 키는 `simulationReportQueryKey` 한 곳에서 만들어 두 화면이 반드시 같은 키를 쓴다.
   */
  const seedReportCache = useCallback(
    (request: NonNullable<typeof leftRequest>, data: unknown) => {
      queryClient.setQueryData(simulationReportQueryKey(request), data)
    },
    [queryClient],
  )

  const mutation = useMutation({
    mutationFn: () => {
      if (!leftRequest || !rightRequest) {
        throw new Error('양쪽 조건이 모두 완성되어야 비교할 수 있습니다.')
      }
      return createSimulationReportPair([leftRequest, rightRequest])
    },
    onSuccess: ([leftData, rightData]) => {
      if (leftRequest) seedReportCache(leftRequest, leftData)
      if (rightRequest) seedReportCache(rightRequest, rightData)

      const href = buildSimulationCompareHref(
        { left: leftRequest, right: rightRequest },
        variant,
      )

      /**
       * 이미 같은 URL 이면 `replace` 하지 않는다.
       *
       * 이 호출의 목적은 URL 을 조건과 맞추는 것 하나뿐이라, 이미 맞으면 할 일이 없다.
       * 완성된 URL 로 들어와 자동 계산한 경우가 정확히 그 자리다 — 같은 URL 로 다시
       * 재탐색을 걸면 세그먼트가 다시 마운트될 수 있고, 그러면 방금 받은 결과가 날아간다.
       */
      if (href !== `${pathname}?${searchParams}`) router.replace(href)
    },
  })

  const error = resolveApiError({ error: mutation.error, data: undefined })
  // 응답 봉투 안의 실패도 오류다 — 한쪽만 봉투 실패면 그 화면은 비교가 아니다.
  const pair = mutation.data
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
            disabled={!canCalculate || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? '비교하는 중…' : '비교하기'}
          </Button>
          {/* 무엇이 남았는지는 각 편집기가 자기 gap 으로 말한다. 여기서는 "양쪽이 필요하다"만. */}
          {canCalculate ? null : (
            <SubmitHint>양쪽 조건을 모두 고르면 비교할 수 있어요.</SubmitHint>
          )}
        </Submit>

        {mutation.isPending ? (
          <Loading aria-label="비교 계산 중" role="status">
            <Skeleton $height="240px" />
          </Loading>
        ) : shownError ? (
          /* 오류는 하나만. 두 호출 중 어느 쪽이 실패했는지 갈라 보여주면
             "한쪽은 됐다"로 읽혀 부분 성공을 금지한 뜻이 사라진다. */
          <SimulationErrorNotice
            error={shownError}
            onRetry={() => mutation.mutate()}
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
