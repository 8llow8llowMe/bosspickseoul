'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Pencil, Scale } from 'lucide-react'
import styled from 'styled-components'

import SimulationCompareColumns, {
  SIMULATION_COMPARE_RESULT_HEADING_ID,
} from '@/components/simulation/compare/simulation-compare-columns'
import SimulationConditionCompactEditor, {
  compareFieldDomId,
} from '@/components/simulation/compare/simulation-condition-compact-editor'
import SimulationErrorNotice from '@/components/simulation/simulation-error-notice'
import { Button, ButtonLink } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { resolveApiError, retryUnlessClientError } from '@/lib/api/api-error'
import {
  createSimulationReportPair,
  SimulationPairError,
  unwrapSimulationPairError,
  type SimulationPairSide,
} from '@/lib/api/simulation'
import { getResponseBody } from '@/lib/api/response'
import {
  describeCompareConditionLine,
  SIMULATION_COMPARE_SIDE_LABELS,
  SIMULATION_COMPARE_SIDE_MARKS,
} from '@/lib/simulation/compare-presentation'
import type { SimulationConditionSection } from '@/lib/simulation/conditions'
import {
  buildSimulationCompareHref,
  isSameSimulationComparePair,
  parseSimulationCompareConditionPair,
  parseSimulationComparePair,
  resolveSimulationPairFailedSide,
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
import { centeredColumn } from '@/styles/layout'
import { SIMULATION_MEDIA } from '@/components/simulation/simulation-media'

export type SimulationComparePageProps = { variant?: SimulationReportVariant }

const Page = styled.main`
  min-height: calc(100vh - 160px);
  padding: 32px 0 64px;
  background: var(--color-background-muted);

  @media ${SIMULATION_MEDIA.belowDesktop} {
    padding: 24px 0 48px;
  }
`

/*
  셸 안 가운데에서 본문 묶음을 --w-wide(1400)에서 멈춘다(C6). 상한이 없으면 1920 에서 편집기 카드 하나가
  920px 로 늘어 select 두 칸이 화면을 가로질렀다. 입력·리포트 화면과 같이 가운데 묶음이다.
*/
const Container = styled.div`
  ${centeredColumn('var(--w-wide)')}
  display: grid;
  gap: 16px;
`

/* 편집기 쪽 DOM id 접두사. 오류 CTA 가 고칠 필드를 찾을 때 쓴다. */
const EDITOR_ID_PREFIX = { left: 'compare-a', right: 'compare-b' } as const

/*
  비교한 뒤 ≤767 에서는 편집기 두 개와 비교 버튼을 접고 이 한 줄 요약만 남긴다(C3). 375 에서
  편집기 둘이 약 1,400px 이라 결과가 화면 세 장 아래에 있었다. ≥768 은 편집기가 나란해 접지 않는다.
*/
const CollapsedSummary = styled.div`
  display: none;

  @media ${SIMULATION_MEDIA.mobile} {
    display: grid;
    gap: 8px;
    border: 1px solid var(--color-border-200);
    border-radius: var(--radius-card);
    background: var(--color-surface);
    padding: 16px;
  }

  dl {
    display: grid;
    gap: 6px;
  }

  dl > div {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: 8px;
  }

  dt {
    color: var(--color-text-700);
    font-size: 13px;
    font-weight: 700;
    line-height: 20px;
  }

  dd {
    color: var(--color-text-900);
    font-size: 13px;
    line-height: 20px;
    word-break: keep-all;
  }
`

/* 접힌 동안(≤767) 숨는 편집 영역. CSS 로만 숨겨 편집기 상태(입력 중인 값)를 잃지 않는다. */
const Editing = styled.div<{ $collapsed: boolean }>`
  display: grid;
  gap: 16px;

  @media ${SIMULATION_MEDIA.mobile} {
    display: ${props => (props.$collapsed ? 'none' : 'grid')};
  }
`

/*
  결과가 지금 편집기 조건의 결과가 아닐 때(C2). 이전 결과를 지우지 않고 흐리게 둔다 — 지우면 방금
  본 숫자와 견줄 수 없다. 안내는 늘 있는 status 영역의 글자를 바꿔 알린다.
*/
const StaleNotice = styled.p`
  border-radius: var(--radius-control);
  background: var(--color-surface);
  color: var(--color-text-900);
  font-size: 14px;
  font-weight: 600;
  line-height: 22px;
  word-break: keep-all;

  &:not(:empty) {
    border: 1px solid var(--color-primary-600);
    padding: 12px 16px;
  }
`

const ResultArea = styled.div<{ $stale: boolean }>`
  display: grid;
  gap: 16px;
  scroll-margin-top: 96px;

  > section {
    opacity: ${props => (props.$stale ? 0.45 : 1)};
    transition: opacity var(--motion-fast) var(--ease-standard);
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
    font-weight: 700;
    line-height: 32px;
    word-break: keep-all;
  }
`

const Editors = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;

  @media ${SIMULATION_MEDIA.mobile} {
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

/* 카드 밖 페이지 바탕(grey50) 위라 grey600 은 4.42 로 미달이다 — 밴드 캡션 토큰. */
const SubmitHint = styled.p`
  color: var(--color-text-caption-on-band);
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
 * `createSimulationReportPair` 가 둘을 함께 실패시킨다. **부분 성공을 화면에 내지 않는다**(G10):
 * 한쪽만 성공한 화면은 비교가 아니라 "결과 하나 + 빈 칸"이고, 그 빈 칸을 사용자는 "이 조건은
 * 비용이 0"이나 "계산 중"으로 읽는다. 부분 성공을 허용하는 순간 오류 UI 도 좌우 두 개가
 * 되어 무엇이 잘못됐는지 흐려진다 — 오류는 **하나만** 띄운다. 안에서는 `allSettled` 로 둘 다
 * 기다려 **어느 쪽**이 실패했는지만 알아낸다(C5) — 오류는 하나, 고칠 쪽은 밝힌다.
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
    // 래퍼(SimulationPairError)를 벗겨 판정한다 — 그대로 넘기면 5xx·네트워크도 client 로 읽혀 재시도하지 않는다.
    retry: (failureCount, reason) =>
      retryUnlessClientError()(failureCount, unwrapSimulationPairError(reason)),
  })

  // `query` 객체는 매 렌더 새 참조지만 `refetch` 는 안정적이다 — deps 에는 이쪽을 쓴다.
  const { refetch } = query

  /** ≤767 에서 비교한 뒤 접힌 편집기를 사용자가 다시 펼쳤는가. 다시 비교하면 접는다. */
  const [expanded, setExpanded] = useState(false)
  /** 이번 계산이 `비교하기` 로 시작됐는가 — 그때만 결과로 데려간다(링크로 들어온 첫 화면은 그대로 둔다). */
  const moveToResultRef = useRef(false)

  /**
   * `비교하기` 는 계산을 직접 명령하지 않는다. **URL 을 편집기 상태와 맞추고**, 그 URL 이
   * 쿼리를 트리거한다.
   *
   * 조건을 고치지 않고 눌렀다면 URL 은 이미 맞으므로 재탐색할 것이 없다. 그때는
   * `refetch()` 로 같은 조건을 다시 계산한다. 아무것도 하지 않으면 활성인 버튼이 눌러도
   * 반응하지 않는 상태가 되는데, 재시도 버튼이 없는 오류(404 는 `isRetryable` 이 false 라
   * 안내에 버튼이 붙지 않는다)에서는 화면 어디에도 응답이 없어 사용자가 다음에 무엇을
   * 해야 하는지 알 수 없다. 라벨이 `비교하기` 인 이상 누르면 비교해야 한다.
   *
   * `push` 가 아니라 `replace` 인 이유: 조건을 고쳐 가며 여러 번 누르는 화면이라 매 계산이
   * 히스토리에 쌓이면 뒤로가기가 이 화면 안에서만 맴돈다.
   */
  const leftBrandName = left.state.brandName
  const rightBrandName = right.state.brandName
  const onCompare = useCallback(() => {
    if (!leftRequest || !rightRequest) return

    const href = buildSimulationCompareHref(
      { left: leftRequest, right: rightRequest },
      variant,
      // 표시용 브랜드명을 싣는다. 다시 들어와도 접힌 브랜드 줄에 이름이 남는다(C1).
      { left: leftBrandName, right: rightBrandName },
    )

    moveToResultRef.current = true
    setExpanded(false)

    // 같은 계산인지는 요청으로 가른다(href 는 표시용 brandName 까지 담는다). 같으면 URL 만 맞추고
    // 다시 계산한다 — 캐시를 집으면 눌러도 아무 일도 없는 버튼이 된다.
    const sameAsResult = isSameSimulationComparePair(
      { left: leftRequest, right: rightRequest },
      urlPair,
    )
    if (href !== `${pathname}?${searchParams}`) router.replace(href)
    if (sameAsResult) void refetch()
  }, [
    leftRequest,
    rightRequest,
    leftBrandName,
    rightBrandName,
    urlPair,
    pathname,
    searchParams,
    router,
    variant,
    refetch,
  ])

  // 어느 쪽이 실패했는지는 SimulationPairError 가 들고 온다. 분류(resolveApiError)는 원래 오류로 한다.
  const pairError =
    query.error instanceof SimulationPairError ? query.error : null
  const error = resolveApiError({
    error: unwrapSimulationPairError(query.error),
    data: undefined,
  })
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
  // 봉투 실패의 쪽도 메시지를 고른 것과 **같은 기준**(resolveApiError)으로 정한다.
  const failedSide: SimulationPairSide | null = error
    ? (pairError?.side ?? null)
    : envelopeError && pair
      ? resolveSimulationPairFailedSide(
          resolveApiError({ error: null, data: pair[0] }) !== null,
          resolveApiError({ error: null, data: pair[1] }) !== null,
        )
      : null
  /**
   * `enabled: false` 인 동안 v5 의 `status` 는 계속 `'pending'` 이다 — `isPending` 만 보면
   * 조건을 고르기도 전에 스켈레톤이 깔린다. URL 이 완성됐을 때만 계산 중으로 친다.
   */
  const isCalculating =
    urlLeft !== null &&
    urlRight !== null &&
    (query.isPending || query.isFetching)

  /**
   * 결과가 **지금 편집기 조건**의 결과인가(C2). 편집기를 고치면 URL(결과의 정본)은 그대로라 이전
   * 결과가 남는데, 그대로 두면 바뀐 조건의 결과로 오독된다. 입력 화면이 조건을 고치면 결과를
   * 내리는 것과 같은 원칙이지만, 여기서는 견줄 수 있게 지우지 않고 흐린다.
   */
  const stale =
    hasBoth &&
    !isSameSimulationComparePair(
      { left: leftRequest, right: rightRequest },
      urlPair,
    )
  /** ≤767 에서 편집기를 접는가 — 지금 조건의 결과가 있고, 사용자가 다시 펼치지 않았을 때(파생값). */
  const collapsed = hasBoth && !stale && !expanded

  /**
   * `비교하기` 로 계산이 끝나면 결과로 데려간다(C3). 결과가 화면 아래에 있으면 스크롤하고, 제목으로
   * 포커스를 옮긴다 — 옮기지 않으면 키보드·낭독기 사용자는 버튼 자리에 남은 채 결과가 생긴 것을
   * 모른다. 오류면 오류 안내(role=alert)가 알리므로 스크롤만 한다.
   * 그리기가 끝난 뒤의 DOM 을 봐야 해서 effect 다(계산은 URL 이 트리거하므로 클릭 핸들러에서 할 수 없다).
   */
  const settled = !isCalculating && (hasBoth || shownError !== null)
  useEffect(() => {
    if (!settled || !moveToResultRef.current) return
    moveToResultRef.current = false

    const area = document.getElementById('simulation-compare-result-area')
    // 아래쪽에 있을 때뿐 아니라 **위로 지나가 있을 때**도 스크롤한다 — ≤767 에서 다시 비교하면 편집기가
    // 접히며 1,400px 가 사라져 결과 머리가 화면 위쪽(top < 0)에 남을 수 있다.
    const top = area?.getBoundingClientRect().top ?? 0
    if (area && (top < 0 || top > window.innerHeight * 0.6)) {
      area.scrollIntoView({ block: 'start' })
    }
    if (hasBoth) {
      document
        .getElementById(SIMULATION_COMPARE_RESULT_HEADING_ID)
        ?.focus({ preventScroll: true })
    }
  }, [settled, hasBoth, query.dataUpdatedAt])

  /** 오류가 지목한 쪽 편집기의 그 필드로 데려간다(C5). 접혀 있으면 먼저 편다. */
  const editSide = useCallback(
    (side: 'left' | 'right', section: SimulationConditionSection) => {
      setExpanded(true)
      requestAnimationFrame(() => {
        const target = document.getElementById(
          compareFieldDomId(EDITOR_ID_PREFIX[side], section),
        )
        const focusable = target?.matches('input, select, button')
          ? target
          : target?.querySelector<HTMLElement>('input, select, button')
        target?.scrollIntoView({ block: 'center' })
        focusable?.focus({ preventScroll: true })
      })
    },
    [],
  )
  // 두 쪽이 다 실패했으면 A 부터 고치게 한다.
  const errorSide: 'left' | 'right' = failedSide === 'right' ? 'right' : 'left'
  const errorScope = failedSide
    ? {
        label:
          failedSide === 'both'
            ? `조건 ${SIMULATION_COMPARE_SIDE_MARKS.left}·${SIMULATION_COMPARE_SIDE_MARKS.right}`
            : SIMULATION_COMPARE_SIDE_LABELS[failedSide],
        onEdit: () => editSide(errorSide, 'franchise'),
      }
    : undefined

  return (
    <Page>
      <Container>
        <Head>
          <h1>조건 비교</h1>
          {/* A 조건을 실어 보낸다(C7) — 비교하다 하나만 자세히 보려는 사람이 다시 고르지 않게. */}
          <ButtonLink
            variant="ghost"
            href={simulationBuilderHref(variant, left.state)}
            leftIcon={<ArrowLeft />}
          >
            조건 하나만 계산하기
          </ButtonLink>
        </Head>

        {collapsed && leftReport && rightReport ? (
          <CollapsedSummary aria-label="비교한 조건">
            <dl>
              <div>
                <dt>{SIMULATION_COMPARE_SIDE_LABELS.left}</dt>
                <dd>{describeCompareConditionLine(leftReport.condition)}</dd>
              </div>
              <div>
                <dt>{SIMULATION_COMPARE_SIDE_LABELS.right}</dt>
                <dd>{describeCompareConditionLine(rightReport.condition)}</dd>
              </div>
            </dl>
            <Button
              size="medium"
              variant="secondary"
              leftIcon={<Pencil />}
              onClick={() => {
                setExpanded(true)
                // 누른 버튼(요약 줄)이 사라진다 — 포커스를 막 열린 조건 A 첫 필드로 옮긴다.
                requestAnimationFrame(() => {
                  document
                    .getElementById(
                      compareFieldDomId(EDITOR_ID_PREFIX.left, 'franchise'),
                    )
                    ?.focus()
                })
              }}
            >
              조건 고치기
            </Button>
          </CollapsedSummary>
        ) : null}

        <Editing $collapsed={collapsed}>
          <Editors>
            <EditorCard
              aria-label={`${SIMULATION_COMPARE_SIDE_LABELS.left} 조건`}
            >
              <h2>{SIMULATION_COMPARE_SIDE_LABELS.left}</h2>
              <SimulationConditionCompactEditor
                label={SIMULATION_COMPARE_SIDE_LABELS.left}
                conditions={left}
                idPrefix={EDITOR_ID_PREFIX.left}
              />
            </EditorCard>

            <EditorCard
              aria-label={`${SIMULATION_COMPARE_SIDE_LABELS.right} 조건`}
            >
              <h2>{SIMULATION_COMPARE_SIDE_LABELS.right}</h2>
              <SimulationConditionCompactEditor
                label={SIMULATION_COMPARE_SIDE_LABELS.right}
                conditions={right}
                idPrefix={EDITOR_ID_PREFIX.right}
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
              {isCalculating
                ? '비교하는 중…'
                : stale
                  ? '다시 비교하기'
                  : '비교하기'}
            </Button>
            {/* 무엇이 남았는지는 각 편집기가 자기 gap 으로 말한다. 여기서는 "양쪽이 필요하다"만. */}
            {canCalculate ? null : (
              <SubmitHint>양쪽 조건을 모두 고르면 비교할 수 있어요.</SubmitHint>
            )}
          </Submit>
        </Editing>

        <ResultArea id="simulation-compare-result-area" $stale={stale}>
          <StaleNotice role="status">
            {stale ? '조건이 바뀌었어요. 다시 비교해 주세요.' : ''}
          </StaleNotice>

          {!hasBoth && isCalculating ? (
            <Loading aria-label="비교 계산 중" role="status">
              <Skeleton $height="240px" />
            </Loading>
          ) : shownError ? (
            /* 오류는 하나만. 부분 성공은 그리지 않되, 어느 쪽 조건을 고쳐야 하는지는 밝힌다(C5). */
            <SimulationErrorNotice
              // h1(조건 비교) 바로 아래 결과 자리라 h2. 편집기 제목(조건 A·B)과 같은 수준이다.
              headingLevel={2}
              error={shownError}
              onRetry={() => {
                void query.refetch()
              }}
              onReselect={
                failedSide ? section => editSide(errorSide, section) : undefined
              }
              scope={errorScope}
            />
          ) : leftReport && rightReport ? (
            <SimulationCompareColumns
              left={leftReport}
              right={rightReport}
              variant={variant}
            />
          ) : null}
        </ResultArea>
      </Container>
    </Page>
  )
}
