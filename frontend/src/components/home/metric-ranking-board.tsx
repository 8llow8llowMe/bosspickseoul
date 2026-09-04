'use client'

import { useState } from 'react'
import styled from 'styled-components'

import MetricToggleGroup from '@/components/home/metric-toggle-group'
import RankBarList, { type RankBarRow } from '@/components/home/rank-bar-list'
import { useDistrictTopTen } from '@/hooks/use-district-top-ten'
import { isApiSuccess } from '@/lib/api/response'
import {
  HOME_METRICS,
  HOME_METRIC_FALLBACK,
  STORY_METRIC_TOP_N,
  homeMetricLabel,
  toHomeMetricRankings,
  type HomeMetric,
} from '@/lib/home/metric-rankings'
import {
  formatStatusValue,
  toChangeBadge,
} from '@/lib/status/status-formatters'

const ToggleWrap = styled.div`
  margin-bottom: 12px;
`

const Sample = styled.p`
  margin-top: 10px;
  font-size: 12px;
  color: var(--color-text-caption);
`

export default function MetricRankingBoard() {
  const query = useDistrictTopTen()
  const [metric, setMetric] = useState<HomeMetric>('footTraffic')

  const rankingsFromApi =
    query.data && isApiSuccess(query.data)
      ? toHomeMetricRankings(query.data.dataBody, STORY_METRIC_TOP_N)
      : null

  const activeFromApi =
    rankingsFromApi?.find(entry => entry.metric === metric) ?? null

  /*
    top-ten 이 죽거나(실패), 200 이어도 지금 고른 지표가 빈 배열이면 예시로
    폴백한다 — 둘 다 "이 지표는 쓸 수 있는 실 데이터가 없다"는 같은 상황이다.
    라벨 없이 빈 상자만 그리는 것보다 "대표 예시 데이터" 라벨이 붙은 예시가 낫다.
    스토리에서 한 단계만 사라지면 번호 01~04 에 구멍이 나므로, 어느 쪽이든
    단계 자체는 비우지 않는다.
  */
  const isFallback = !activeFromApi || activeFromApi.items.length === 0
  const rankings = isFallback ? HOME_METRIC_FALLBACK : rankingsFromApi!

  const active = rankings.find(entry => entry.metric === metric) ?? rankings[0]

  const rows: RankBarRow[] = active.items.map(item => ({
    key: item.districtCode,
    rank: item.rank,
    name: item.districtName,
    value: item.value,
    valueLabel: formatStatusValue(active.metric, item.value),
    ...toChangeBadge(item.changeRate),
  }))

  return (
    <div>
      <ToggleWrap>
        <MetricToggleGroup
          options={HOME_METRICS}
          value={active.metric}
          getLabel={homeMetricLabel}
          onChange={setMetric}
          ariaLabel="지표 선택"
        />
      </ToggleWrap>
      <RankBarList
        rows={rows}
        ariaLabel={`자치구 ${active.label} 상위 ${rows.length}곳`}
      />
      {isFallback ? <Sample>대표 예시 데이터</Sample> : null}
    </div>
  )
}
