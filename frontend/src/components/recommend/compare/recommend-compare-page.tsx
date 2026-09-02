'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PenLine, RotateCcw } from 'lucide-react'
import styled from 'styled-components'

import { Button, ButtonLink } from '@/components/ui/button'
import EmptyState from '@/components/ui/empty-state'
import { findSimulationCategoryByCode } from '@/data/simulation-catalog'
import { isRetryable, resolveApiError } from '@/lib/api/api-error'
import { fetchCommercialComparison } from '@/lib/api/commercial-comparison'
import { RECOMMENDATION_PERIOD_CODE } from '@/lib/api/recommend'
import { isApiSuccess } from '@/lib/api/response'
import {
  COMPARE_MIN_COMMERCIALS,
  isCompleteCompareState,
  parseCompareUrlState,
} from '@/lib/recommend/compare-url'
import { createComparisonDraftHref } from '@/lib/community/comparison-draft-url'
import {
  toComparisonGroups,
  toComparisonVerdict,
} from '@/lib/recommend/comparison-presentation'
import { recommendComparisonKey } from '@/lib/recommend/recommend-query-keys'
import { formatRecommendationPeriod } from '@/lib/recommend/recommend-state'
import {
  createRecommendHrefFromCodes,
  RECOMMEND_URL_PARAMS,
} from '@/lib/recommend/recommend-url'

import RecommendCompareTable from './recommend-compare-table'
import RecommendComparisonAiPanel from './recommend-comparison-ai-panel'
import RecommendComparisonVerdict from './recommend-comparison-verdict'

/**
 * `view` 가 가질 수 있는 유일한 값(`recommend-url.ts`). 파라미터 **이름**은
 * 손으로 적지 않고 `RECOMMEND_URL_PARAMS.view` 에서 가져온다.
 */
const RESULTS_VIEW = 'results'

const Page = styled.main`
  max-width: 1120px;
  margin: 0 auto;
  padding: 24px 20px 48px;
  display: grid;
  gap: 20px;
`

const Header = styled.header`
  display: grid;
  gap: 6px;
`

const Title = styled.h1`
  color: var(--color-text-900);
  font-size: 24px;
  font-weight: 700;
  line-height: 34px;
  word-break: keep-all;
`

const Subtitle = styled.p`
  color: var(--color-text-600);
  font-size: 14px;
  line-height: 22px;
`

const BackLink = styled(Link)`
  justify-self: start;
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  color: var(--color-text-600);
  font-size: 13px;
  font-weight: 700;
  text-decoration: underline;
  text-underline-offset: 3px;
`

const Actions = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
`

const Notice = styled.p`
  color: var(--color-text-700);
  font-size: 13px;
  line-height: 20px;
`

/**
 * 상권 비교 화면.
 *
 * 비교의 정본은 **백엔드**다(`GET /commercials/compare`). 예전에는 추천 응답과
 * 상권 프로필을 화면에서 조립해 표를 만들었는데, 그 경로는 세 종류의 호출과
 * 블록별 부분 실패 처리를 화면이 떠안게 했다. 이제 호출은 하나다.
 *
 * ⚠️ 계약이 좌/우 두 자리뿐이라 **정확히 두 개**만 비교한다(`COMPARE_MAX_COMMERCIALS`).
 */
export default function RecommendComparePage() {
  const searchParams = useSearchParams()
  const state = useMemo(
    () => parseCompareUrlState(searchParams),
    [searchParams],
  )
  const isComplete = isCompleteCompareState(state)

  const [leftCommercialCode, rightCommercialCode] = state.commercialCodes

  const recommendHref = createRecommendHrefFromCodes({
    districtCode: state.districtCode,
    administrationCode: state.administrationCode,
    serviceCode: state.serviceCode,
  })
  // 조건이 하나도 없으면 `/recommend` 그대로다 — 빈 `?view=results` 를 붙이지 않는다.
  const backHref = recommendHref.includes('?')
    ? `${recommendHref}&${RECOMMEND_URL_PARAMS.view}=${RESULTS_VIEW}`
    : recommendHref

  /*
   * 로그인 후 **이 비교 화면으로** 돌아와야 한다. `searchParams` 를 그대로 이어 붙여
   * 고른 상권과 조건을 잃지 않는다 — `/recommend/compare` 만 넘기면 빈 화면으로 돌아온다.
   */
  const returnTo = `/recommend/compare?${searchParams.toString()}`

  const comparisonQuery = useQuery({
    queryKey: recommendComparisonKey({
      leftCommercialCode,
      rightCommercialCode,
      serviceCode: state.serviceCode,
      periodCode: RECOMMENDATION_PERIOD_CODE,
    }),
    queryFn: ({ signal }) =>
      fetchCommercialComparison(
        {
          leftCommercialCode: leftCommercialCode!,
          rightCommercialCode: rightCommercialCode!,
          serviceCode: state.serviceCode!,
          periodCode: RECOMMENDATION_PERIOD_CODE,
        },
        signal,
      ),
    enabled: isComplete,
  })

  const body =
    comparisonQuery.data && isApiSuccess(comparisonQuery.data)
      ? comparisonQuery.data.dataBody
      : null

  const groups = useMemo(() => toComparisonGroups(body), [body])
  const verdict = useMemo(() => toComparisonVerdict(body), [body])

  const error = resolveApiError(comparisonQuery)

  const serviceName = state.serviceCode
    ? (findSimulationCategoryByCode(state.serviceCode)?.item.name ?? null)
    : null
  /*
   * 자치구·행정동 **이름**은 비교 응답의 좌측 메타에 들어 있다. 아직 못 받았으면
   * 코드를 날것으로 보여 주는 대신 기간만 적는다.
   */
  // `formatRecommendationPeriod` 가 「… 기준」까지 만든다. 여기서 또 붙이지 않는다.
  const periodLabel = formatRecommendationPeriod(RECOMMENDATION_PERIOD_CODE)
  const subtitle = body?.left
    ? `${body.left.districtName} ${body.left.administrationName} · ${periodLabel}`
    : periodLabel

  /*
   * 비교를 읽은 다음의 출구. **비교 결과를 받은 뒤에만** 연다 — 아직 아무 숫자도
   * 못 본 사람에게 「이 비교로 글쓰기」는 쓸 내용이 없는 버튼이다.
   *
   * 초안 제목·본문은 URL 에 싣지 않는다. 글쓰기 화면이 이 코드들로 백엔드에서 초안을
   * 받는다 — 글쓰기는 로그인이 필요하고, 그 왕복을 통과하려면 상태가 URL 에 있어야 한다.
   */
  const draftHref =
    body && state.administrationCode && state.serviceCode
      ? createComparisonDraftHref({
          leftCommercialCode: leftCommercialCode!,
          rightCommercialCode: rightCommercialCode!,
          serviceCode: state.serviceCode,
          administrationCode: state.administrationCode,
        })
      : null

  if (!isComplete) {
    const hasConditions = Boolean(
      state.districtCode && state.administrationCode && state.serviceCode,
    )

    return (
      <Page>
        <EmptyState
          title={
            hasConditions ? '비교할 상권이 부족해요' : '비교 조건이 없어요'
          }
          description={
            hasConditions
              ? `상권 추천 결과에서 상권을 ${COMPARE_MIN_COMMERCIALS}개 골라 주세요.`
              : '자치구·행정동·업종이 있어야 비교할 수 있어요. 추천 결과에서 다시 골라 주세요.'
          }
          action={<BackLink href={backHref}>추천으로 돌아가기</BackLink>}
        />
      </Page>
    )
  }

  return (
    <Page>
      <Header>
        <Title>{serviceName ? `${serviceName} 상권 비교` : '상권 비교'}</Title>
        <Subtitle>{subtitle}</Subtitle>
        <Actions>
          <BackLink href={backHref}>추천으로 돌아가기</BackLink>
          {draftHref ? (
            <ButtonLink
              href={draftHref}
              size="medium"
              variant="secondary"
              leftIcon={<PenLine />}
            >
              이 비교로 글쓰기
            </ButtonLink>
          ) : null}
        </Actions>
      </Header>

      {state.truncated ? (
        <Notice>한 번에 2개까지 비교할 수 있어요. 앞 2개만 보여 드려요.</Notice>
      ) : null}

      {comparisonQuery.isFetching && !body ? (
        <Notice role="status">비교 결과를 불러오는 중이에요.</Notice>
      ) : null}

      {error ? (
        <EmptyState
          title="비교 결과를 불러오지 못했어요"
          description={error.message}
          action={
            // 재시도 노출은 `isRetryable(kind)` 로만 판단한다 — 404 는 다시 물어도 같다.
            isRetryable(error.kind) ? (
              <Button
                size="medium"
                variant="secondary"
                leftIcon={<RotateCcw />}
                onClick={() => void comparisonQuery.refetch()}
              >
                다시 시도
              </Button>
            ) : (
              <BackLink href={backHref}>추천으로 돌아가기</BackLink>
            )
          }
        />
      ) : null}

      {/*
        판단은 **여기서만** 말한다. 표는 값만 적는다 — comparison-presentation.ts 주석 참고.
      */}
      {verdict ? (
        <RecommendComparisonVerdict
          leftName={body?.left?.commercialName ?? null}
          rightName={body?.right?.commercialName ?? null}
          verdict={verdict}
        />
      ) : null}

      {/*
        AI 리포트는 표 **위**가 아니라 리포트 바로 다음에 둔다 — 판단끼리 모아 두고
        값(표)은 그 아래에 그대로 남긴다. 비로그인에게도 자리는 보인다(제출만 잠긴다).
      */}
      {!error && isComplete ? (
        <RecommendComparisonAiPanel
          leftCommercialCode={leftCommercialCode!}
          rightCommercialCode={rightCommercialCode!}
          serviceCode={state.serviceCode!}
          returnTo={returnTo}
        />
      ) : null}

      {!error && body && groups.length === 0 ? (
        <EmptyState
          title="비교할 지표가 없어요"
          description="이 조건에서 받아 온 비교 지표가 비어 있어요. 다른 업종이나 분기를 골라 보세요."
          action={<BackLink href={backHref}>추천으로 돌아가기</BackLink>}
        />
      ) : null}

      {groups.length > 0 ? (
        <RecommendCompareTable
          groups={groups}
          leftName={body?.left?.commercialName ?? '좌측 상권'}
          rightName={body?.right?.commercialName ?? '우측 상권'}
        />
      ) : null}
    </Page>
  )
}
