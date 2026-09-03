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
    queryKey: ['home', 'recommendPreview'],
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
      {view.isSample ? <Sample>대표 예시 데이터</Sample> : null}
    </div>
  )
}
