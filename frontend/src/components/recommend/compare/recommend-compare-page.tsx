'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useMemo } from 'react'
import { useQueries, useQuery } from '@tanstack/react-query'
import { RotateCcw } from 'lucide-react'
import styled from 'styled-components'

import { Button } from '@/components/ui/button'
import EmptyState from '@/components/ui/empty-state'
import { findSimulationCategoryByCode } from '@/data/simulation-catalog'
import {
  isRetryable,
  resolveApiError,
  type NormalizedApiError,
} from '@/lib/api/api-error'
import {
  fetchCommercialProfile,
  fetchCommercialRecommendations,
  fetchCommercials,
  RECOMMENDATION_PERIOD_CODE,
} from '@/lib/api/recommend'
import { isApiSuccess } from '@/lib/api/response'
import {
  buildCompareRecommendationRequest,
  selectCompareColumns,
  selectTopRankedCandidates,
} from '@/lib/recommend/compare-data'
import {
  COMPARE_MIN_COMMERCIALS,
  isCompleteCompareState,
  parseCompareUrlState,
} from '@/lib/recommend/compare-url'
import {
  createCommercialCodesKey,
  recommendCommercialsKey,
  recommendProfileKey,
  recommendResultsKey,
} from '@/lib/recommend/recommend-query-keys'
import { readCommercials } from '@/lib/recommend/recommend-response'
import { formatRecommendationPeriod } from '@/lib/recommend/recommend-state'
import {
  createRecommendHrefFromCodes,
  RECOMMEND_URL_PARAMS,
} from '@/lib/recommend/recommend-url'
import type { CommercialProfile } from '@/types/recommend'

import RecommendCompareTable from './recommend-compare-table'

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

const Notice = styled.p`
  color: var(--color-text-700);
  font-size: 13px;
  line-height: 20px;
`

export default function RecommendComparePage() {
  const searchParams = useSearchParams()
  const state = useMemo(
    () => parseCompareUrlState(searchParams),
    [searchParams],
  )
  const isComplete = isCompleteCompareState(state)

  const recommendHref = createRecommendHrefFromCodes({
    districtCode: state.districtCode,
    administrationCode: state.administrationCode,
    serviceCode: state.serviceCode,
  })
  // 조건이 하나도 없으면 `/recommend` 그대로다 — 빈 `?view=results` 를 붙이지 않는다.
  const backHref = recommendHref.includes('?')
    ? `${recommendHref}&${RECOMMEND_URL_PARAMS.view}=${RESULTS_VIEW}`
    : recommendHref

  // 1) 행정동 전체 상권 — 추천 입력을 재현하기 위해서다.
  const commercialsQuery = useQuery({
    queryKey: recommendCommercialsKey(
      state.districtCode,
      state.administrationCode,
    ),
    queryFn: () =>
      fetchCommercials(state.districtCode!, state.administrationCode!),
    enabled: isComplete,
  })
  /*
   * 목록을 읽는 규칙은 `/recommend` 와 **같은 함수**여야 한다. 한쪽이 거르는 행을
   * 다른 쪽이 통과시키면 `commercialCodesKey` 가 갈라져 캐시가 둘로 쪼개지고,
   * 추천이 매겨지는 코드 집합 자체가 달라진다(명세 §4).
   */
  const allCodes = useMemo(
    () =>
      readCommercials(commercialsQuery.data).map(item => item.commercialCode),
    [commercialsQuery.data],
  )

  // 2) 추천 — /recommend 와 같은 요청, 같은 키.
  const recommendationQuery = useQuery({
    queryKey: recommendResultsKey({
      districtCode: state.districtCode,
      administrationCode: state.administrationCode,
      serviceCode: state.serviceCode,
      periodCode: RECOMMENDATION_PERIOD_CODE,
      commercialCodesKey: createCommercialCodesKey(allCodes),
    }),
    queryFn: () =>
      fetchCommercialRecommendations(
        buildCompareRecommendationRequest({
          serviceCode: state.serviceCode!,
          allCommercialCodes: allCodes,
        }),
      ),
    enabled: isComplete && allCodes.length > 0,
  })
  // 후보도 `/recommend` 와 같은 규칙으로 줄인다 — 같은 다섯 개, 같은 순위.
  const candidates = useMemo(() => {
    const body = recommendationQuery.data
    const items = body && isApiSuccess(body) ? (body.dataBody?.items ?? []) : []

    return selectTopRankedCandidates({
      candidates: items,
      allowedCommercialCodes: allCodes,
    })
  }, [allCodes, recommendationQuery.data])

  // 3) 열마다 프로필.
  const profileQueries = useQueries({
    queries: state.commercialCodes.map(code => ({
      queryKey: recommendProfileKey(
        code,
        state.serviceCode,
        RECOMMENDATION_PERIOD_CODE,
      ),
      queryFn: () =>
        fetchCommercialProfile(
          code,
          state.serviceCode!,
          RECOMMENDATION_PERIOD_CODE,
        ),
      enabled: isComplete,
    })),
  })

  const profileByCode = useMemo(() => {
    const map: Record<string, CommercialProfile | null> = {}
    state.commercialCodes.forEach((code, index) => {
      const body = profileQueries[index]?.data
      map[code] = body && isApiSuccess(body) ? (body.dataBody ?? null) : null
    })
    return map
  }, [profileQueries, state.commercialCodes])

  /*
   * 실패는 **블록별로** 다룬다(명세 §7). 추천이 실패했다고 원지표까지 버리거나,
   * 프로필이 전부 실패했다고 점수까지 버리면 「부분 실패에서 화면을 통째로 버리지
   * 않는다」는 원칙이 깨진다.
   */
  const commercialsError = resolveApiError(commercialsQuery)
  const recommendationError = resolveApiError(recommendationQuery)
  // 상권 목록이 없으면 추천 요청 자체가 성립하지 않는다 — 둘 다 점수 블록의 실패다.
  const scoreError = commercialsError ?? recommendationError
  const scoresReady = scoreError === null && recommendationQuery.isSuccess
  const scoresLoading =
    !scoresReady &&
    scoreError === null &&
    (commercialsQuery.isFetching || recommendationQuery.isFetching)

  const profileErrors = state.commercialCodes.map(
    (_, index) => resolveApiError(profileQueries[index] ?? {}) ?? null,
  )
  const failedProfileCodes = state.commercialCodes.filter((code, index) => {
    if (profileErrors[index]) return true
    // 200 인데 본문이 비어 온 경우도 그 열의 지표는 없는 것이다.
    return profileQueries[index]?.isSuccess === true && !profileByCode[code]
  })
  /*
   * 열 전부의 지표가 없으면 **어떻게 없어졌든** 원지표 블록이 사실을 말한다.
   * 200 인데 본문이 비어 온 경우에는 정규화할 오류가 없어 `metricsError` 가 null 이다 —
   * 그때도 카드는 나오고, 재시도 버튼만 `isRetryable` 규약대로 빠진다.
   */
  const metricsUnavailable =
    state.commercialCodes.length > 0 &&
    failedProfileCodes.length === state.commercialCodes.length
  const metricsError = metricsUnavailable
    ? (profileErrors.find(error => error !== null) ?? null)
    : null
  const metricsLoading = profileQueries.some(
    query => query.isFetching && query.data === undefined,
  )

  const handleRetryScores = () => {
    if (commercialsError) void commercialsQuery.refetch()
    if (recommendationError) void recommendationQuery.refetch()
  }
  const handleRetryMetrics = () => {
    profileQueries.forEach((query, index) => {
      if (profileErrors[index]) void query.refetch()
    })
  }

  const serviceName = state.serviceCode
    ? (findSimulationCategoryByCode(state.serviceCode)?.item.name ?? null)
    : null
  /*
   * 자치구·행정동 **이름**은 프로필에만 있다(`fetchCommercials` 의 `CommercialArea`
   * 는 이름을 싣지 않는다). 아직 한 열도 못 받았으면 코드를 날것으로 보여 주는
   * 대신 기간만 적는다.
   */
  const namedProfile = state.commercialCodes
    .map(code => profileByCode[code])
    .find((profile): profile is CommercialProfile => Boolean(profile))
  // `formatRecommendationPeriod` 가 「… 기준」까지 만든다. 여기서 또 붙이지 않는다.
  const periodLabel = formatRecommendationPeriod(RECOMMENDATION_PERIOD_CODE)
  const subtitle = namedProfile
    ? `${namedProfile.districtName} ${namedProfile.administrationName} · ${periodLabel}`
    : periodLabel

  const renderBlockError = (
    title: string,
    error: NormalizedApiError | null,
    fallbackDescription: string,
    onRetry: () => void,
  ) => (
    <EmptyState
      title={title}
      description={error ? error.message : fallbackDescription}
      action={
        // 재시도 노출은 `isRetryable(kind)` 로만 판단한다 — 404 는 다시 물어도 같다.
        error && isRetryable(error.kind) ? (
          <Button
            size="medium"
            variant="secondary"
            leftIcon={<RotateCcw />}
            onClick={onRetry}
          >
            다시 시도
          </Button>
        ) : undefined
      }
    />
  )

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
              ? `상권 추천 결과에서 상권을 ${COMPARE_MIN_COMMERCIALS}개 이상 골라 주세요.`
              : '자치구·행정동·업종이 있어야 비교할 수 있어요. 추천 결과에서 다시 골라 주세요.'
          }
          action={<BackLink href={backHref}>추천으로 돌아가기</BackLink>}
        />
      </Page>
    )
  }

  const { columns, missingCodes } = selectCompareColumns({
    requestedCodes: state.commercialCodes,
    candidates,
    profileByCode,
    // 추천을 아직/끝내 모르면 「Top N 에 없다」고 판정할 수 없다.
    scoresUnavailable: !scoresReady,
  })

  return (
    <Page>
      <Header>
        <Title>{serviceName ? `${serviceName} 상권 비교` : '상권 비교'}</Title>
        <Subtitle>{subtitle}</Subtitle>
        <BackLink href={backHref}>추천으로 돌아가기</BackLink>
      </Header>

      {state.truncated ? (
        <Notice>한 번에 4개까지 비교할 수 있어요. 앞 4개만 보여 드려요.</Notice>
      ) : null}

      {/* 낡은 링크에서만 나오는 안내다. 통신 실패는 여기에 해당하지 않는다. */}
      {scoresReady && missingCodes.length > 0 ? (
        <Notice>
          추천 결과에 없는 상권 {missingCodes.length}개는 표에서 뺐어요. 추천을
          다시 받아 주세요.
        </Notice>
      ) : null}

      {scoresLoading || metricsLoading ? (
        <Notice role="status">점수와 지표를 불러오는 중이에요.</Notice>
      ) : null}

      {scoreError
        ? renderBlockError(
            '추천 점수를 불러오지 못했어요',
            scoreError,
            '지금은 추천 점수를 보여 줄 수 없어요.',
            handleRetryScores,
          )
        : null}

      {metricsUnavailable
        ? renderBlockError(
            '상권 지표를 불러오지 못했어요',
            metricsError,
            '이 조건에서 받아 온 상권 지표가 없어요.',
            handleRetryMetrics,
          )
        : null}

      {columns.length < COMPARE_MIN_COMMERCIALS ? (
        <EmptyState
          title="비교할 상권이 부족해요"
          description="추천 결과에서 상권을 다시 골라 주세요."
          action={<BackLink href={backHref}>추천으로 돌아가기</BackLink>}
        />
      ) : (
        <RecommendCompareTable
          administrationCode={state.administrationCode!}
          columns={columns}
          districtCode={state.districtCode!}
          failedProfileCodes={failedProfileCodes}
          serviceCode={state.serviceCode!}
        />
      )}
    </Page>
  )
}
