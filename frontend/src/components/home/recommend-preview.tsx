'use client'

import { useQuery } from '@tanstack/react-query'
import styled from 'styled-components'

import RankBarList, { type RankBarRow } from '@/components/home/rank-bar-list'
import { retryUnlessClientError } from '@/lib/api/api-error'
import {
  HOME_RECOMMEND_SEED,
  RECOMMENDATION_PERIOD_CODE,
  RECOMMENDATION_TOP_N,
  fetchCommercialRecommendations,
  fetchCommercials,
} from '@/lib/api/recommend'
import { isApiSuccess } from '@/lib/api/response'
import {
  RECOMMEND_PREVIEW_FALLBACK,
  toRecommendPreview,
} from '@/lib/home/recommend-preview'

const SeedLabel = styled.p`
  margin: 0 0 10px;
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-caption);
`

const Reason = styled.p`
  margin-top: 10px;
  font-size: 13px;
  line-height: 20px;
  color: var(--color-text-700);
  word-break: keep-all;
`

const Sample = styled.p`
  margin-top: 10px;
  font-size: 12px;
  color: var(--color-text-caption);
`

export default function RecommendPreview() {
  const seedQuery = useQuery({
    queryKey: ['home', 'recommendSeed'],
    queryFn: () =>
      fetchCommercials(
        HOME_RECOMMEND_SEED.districtCode,
        HOME_RECOMMEND_SEED.administrationCode,
      ),
    // 고정 시드라 사람마다 다를 이유가 없다.
    retry: retryUnlessClientError(1),
    staleTime: 30 * 60 * 1000,
  })

  const commercialCodes =
    seedQuery.data && isApiSuccess(seedQuery.data)
      ? seedQuery.data.dataBody.map(area => area.commercialCode)
      : []

  const previewQuery = useQuery({
    // D. 키가 상수면 시드가 지역별로 갈리는 순간 다른 지역이 앞 지역의
    // 캐시를 그대로 받는다(staleTime 30분이 그 오류를 길게 유지한다).
    // 지금은 시드가 고정이라 아직 문제가 드러나지 않을 뿐이다.
    queryKey: ['home', 'recommendPreview', commercialCodes],
    queryFn: () =>
      fetchCommercialRecommendations({
        serviceCode: HOME_RECOMMEND_SEED.serviceCode,
        commercialCodes,
        periodCode: RECOMMENDATION_PERIOD_CODE,
        topN: RECOMMENDATION_TOP_N,
      }),
    // 두 쿼리는 연쇄다 — 상권 목록이 있어야 추천을 물을 수 있다.
    enabled: commercialCodes.length > 0,
    retry: retryUnlessClientError(1),
    staleTime: 30 * 60 * 1000,
  })

  const view =
    previewQuery.data && isApiSuccess(previewQuery.data)
      ? toRecommendPreview(previewQuery.data.dataBody)
      : RECOMMEND_PREVIEW_FALLBACK

  /*
    G. 두 쿼리가 아직 결론나지 않은 동안은 "대표 예시 데이터" 라벨을 감춘다.
    예시 5행 자체는 그대로 그린다(스켈레톤 대신 예시를 먼저 보여주는 결정은
    유지한다) — 라벨만 숨겨서 첫인상에 라벨이 떴다가 사라지는 깜빡임을 없앤다.
    시드 쿼리가 아직이면 무조건 로딩. 시드가 끝나 상권 코드가 나왔으면 추천
    쿼리가 끝날 때까지 로딩. 시드가 끝났는데 코드가 없으면(실패/빈 응답)
    더 기다릴 게 없으므로 로딩이 아니다 — 그 경우 예시+라벨이 최종 상태다.
  */
  const isLoading =
    seedQuery.isPending ||
    (commercialCodes.length > 0 && previewQuery.isPending)

  const rows: RankBarRow[] = view.rows.map(row => ({
    key: row.key,
    rank: row.rank,
    name: row.name,
    value: row.score,
    valueLabel: row.scoreLabel,
  }))

  return (
    <div>
      <SeedLabel>{HOME_RECOMMEND_SEED.label}</SeedLabel>
      <RankBarList rows={rows} ariaLabel={`추천 상권 상위 ${rows.length}곳`} />
      {view.reason ? <Reason>{view.reason}</Reason> : null}
      {view.isSample && !isLoading ? <Sample>대표 예시 데이터</Sample> : null}
    </div>
  )
}
