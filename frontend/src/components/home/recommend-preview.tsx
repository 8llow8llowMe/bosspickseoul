'use client'

import styled from 'styled-components'

import RankBarList, { type RankBarRow } from '@/components/home/rank-bar-list'
import { findDistrictOption, findIndustryOption } from '@/data/home-demo'
import type { DemoSelection } from '@/data/home-demo'
import { useRecommendPreview } from '@/hooks/use-recommend-preview'

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

export type RecommendPreviewProps = {
  /** `ProductStory` 가 소유한 선택 — 02단계·카운터와 같은 값을 본다(D8-3). */
  selection: DemoSelection
}

export default function RecommendPreview({ selection }: RecommendPreviewProps) {
  const { administrationName, isLoading, view } = useRecommendPreview(selection)

  const districtName = findDistrictOption(selection.districtId)?.name ?? ''
  const industryName = findIndustryOption(selection.industryId)?.name ?? ''

  /*
   * 행정동을 아직 못 정했으면(로딩/실패) 지역·업종만 적는다 — 실제로 쓰지 않은
   * 행정동 이름을 지어내지 않는다. 강남구 기본 선택이면 API가 실제로 준 첫
   * 행정동(예: 논현2동)이 여기 들어온다 — 하드코딩이던 "역삼1동"은 더 이상 없다.
   */
  const label = administrationName
    ? `${districtName} ${administrationName} · ${industryName}`
    : `${districtName} · ${industryName}`

  const rows: RankBarRow[] = view.rows.map(row => ({
    key: row.key,
    rank: row.rank,
    name: row.name,
    value: row.score,
    valueLabel: row.scoreLabel,
  }))

  return (
    <div>
      <SeedLabel>{label}</SeedLabel>
      <RankBarList rows={rows} ariaLabel={`추천 상권 상위 ${rows.length}곳`} />
      {view.reason ? <Reason>{view.reason}</Reason> : null}
      {view.isSample && !isLoading ? <Sample>대표 예시 데이터</Sample> : null}
    </div>
  )
}
