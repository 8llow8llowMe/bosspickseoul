'use client'

import { useState } from 'react'
import styled from 'styled-components'

import RankBarList, { type RankBarRow } from '@/components/home/rank-bar-list'
import { useDistrictTopTen } from '@/hooks/use-district-top-ten'
import { isApiSuccess } from '@/lib/api/response'
import {
  HOME_METRICS,
  HOME_METRIC_FALLBACK,
  homeMetricLabel,
  toHomeMetricRankings,
  type HomeMetric,
} from '@/lib/home/metric-rankings'
import {
  formatStatusChange,
  formatStatusValue,
} from '@/lib/status/status-formatters'

const Toggles = styled.div`
  display: flex;
  gap: 6px;
  margin-bottom: 12px;
  flex-wrap: wrap;
`

const Toggle = styled.button<{ $active: boolean }>`
  border: 1px solid
    ${p => (p.$active ? 'var(--color-primary-600)' : 'var(--color-border-200)')};
  background: ${p =>
    p.$active ? 'var(--color-primary-600)' : 'var(--color-surface)'};
  color: ${p => (p.$active ? '#ffffff' : 'var(--color-text-600)')};
  border-radius: var(--radius-pill);
  padding: 5px 12px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;

  &:focus-visible {
    outline: none;
    box-shadow: var(--shadow-focus-primary);
  }
`

const Sample = styled.p`
  margin-top: 10px;
  font-size: 12px;
  color: var(--color-text-caption);
`

export default function MetricRankingBoard() {
  const query = useDistrictTopTen()
  const [metric, setMetric] = useState<HomeMetric>('footTraffic')

  /*
    top-ten 이 죽어도 단계를 비우지 않는다 — 스토리에서 한 단계만 사라지면
    번호 01~04 에 구멍이 난다. 폴백은 실 데이터와 모양이 같아 분기가 없다.
  */
  const rankings =
    query.data && isApiSuccess(query.data)
      ? toHomeMetricRankings(query.data.dataBody)
      : HOME_METRIC_FALLBACK
  const isFallback = !(query.data && isApiSuccess(query.data))

  const active = rankings.find(entry => entry.metric === metric) ?? rankings[0]

  const rows: RankBarRow[] = active.items.map(item => ({
    key: item.districtCode,
    rank: item.rank,
    name: item.districtName,
    value: item.value,
    valueLabel: formatStatusValue(active.metric, item.value),
    changeLabel: formatStatusChange(item.changeRate),
    changeDirection: item.changeRate >= 0 ? 'up' : 'down',
  }))

  return (
    <div>
      <Toggles role="group" aria-label="지표 선택">
        {HOME_METRICS.map(item => (
          <Toggle
            key={item}
            type="button"
            $active={item === active.metric}
            aria-pressed={item === active.metric}
            onClick={() => setMetric(item)}
          >
            {homeMetricLabel(item)}
          </Toggle>
        ))}
      </Toggles>
      <RankBarList
        rows={rows}
        ariaLabel={`자치구 ${active.label} 상위 ${rows.length}곳`}
      />
      {isFallback ? <Sample>대표 예시 데이터</Sample> : null}
    </div>
  )
}
