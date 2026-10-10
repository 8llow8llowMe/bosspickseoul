'use client'

import { useEffect, useRef, useState } from 'react'
import styled from 'styled-components'

import DemoFrame, { SampleBadge } from '@/components/home/demo-frame'
import MetricToggleGroup from '@/components/home/metric-toggle-group'
import RankBarList, { type RankBarRow } from '@/components/home/rank-bar-list'
import { useDistrictTopTen } from '@/hooks/use-district-top-ten'
import { isApiSuccess } from '@/lib/api/response'
import {
  HOME_METRICS,
  HOME_METRIC_FALLBACK,
  STORY_METRIC_TOP_N,
  isHomeRankingsAllEmpty,
  homeMetricLabel,
  toHomeMetricRankings,
  type HomeMetric,
} from '@/lib/home/metric-rankings'
import {
  STATUS_CHANGE_BASIS,
  formatStatusValue,
  presentStatusChange,
} from '@/lib/status/status-formatters'

const Subtitle = styled.span`
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
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

  /*
    세 지표가 **동시에** 폴백되면 단일 지표 결측이 아니라 데이터 공급 장애다. 폴백은
    의도된 설계라 그대로 두지만(라벨이 붙는다), 화면만 보면 정상과 구별되지 않아
    장애를 조용히 넘기게 된다 — 2026-09-11 dev 에서 홈만 정상처럼 보여 인지가
    늦었다(#371). 그래서 로그를 남긴다.

    한 번만 남긴다. 지표 토글은 같은 응답을 다시 그릴 뿐이라 매번 찍으면 콘솔이 막힌다.
  */
  const isAllFallback = isHomeRankingsAllEmpty(rankingsFromApi)
  const settled = !query.isPending
  const reportedRef = useRef(false)

  useEffect(() => {
    if (!settled || !isAllFallback) {
      reportedRef.current = false
      return
    }

    if (reportedRef.current) return
    reportedRef.current = true

    console.warn(
      '[home] 자치구 TOP 10 세 지표가 모두 비어 예시로 폴백했습니다. 데이터 공급 장애를 의심하세요.',
      { failed: query.isError, metrics: HOME_METRICS },
    )
  }, [isAllFallback, query.isError, settled])

  const active = rankings.find(entry => entry.metric === metric) ?? rankings[0]

  /*
    폴백은 10개를 갖는다(랭킹 섹션과 공유하는 정본). 01 은 5행이라 여기서 자른다 —
    API 장애 때 행 수가 바뀌면 같은 화면이 두 모양이 된다.
  */
  const rows: RankBarRow[] = active.items
    .slice(0, STORY_METRIC_TOP_N)
    .map(item => ({
      key: item.districtCode,
      rank: item.rank,
      name: item.districtName,
      value: item.value,
      valueLabel: formatStatusValue(active.metric, item.value),
      /*
        증감은 극성으로 칠하고 「개선/악화」를 같이 둔다(D-1). 값이 없으면(null·NaN) 칸째로 뺀다 —
        「변화율 데이터 없음」을 다섯 줄에 적으면 순위보다 결측이 먼저 읽힌다.
      */
      change: Number.isFinite(item.changeRate)
        ? presentStatusChange(active.metric, item.changeRate)
        : undefined,
      changeBasis: STATUS_CHANGE_BASIS,
    }))

  return (
    <DemoFrame
      title="자치구 순위"
      subtitle={
        <Subtitle>
          {/* 서버는 직전 분기를 비교 기준으로 쓴다(status.md 「백엔드 계약」) — 「전월」이 아니다. */}
          상위 {rows.length}곳 · {STATUS_CHANGE_BASIS}
          {isFallback ? <SampleBadge>예시 데이터</SampleBadge> : null}
        </Subtitle>
      }
      aside={
        <MetricToggleGroup
          options={HOME_METRICS}
          value={active.metric}
          getLabel={homeMetricLabel}
          onChange={setMetric}
          ariaLabel="지표 선택"
        />
      }
      footer={`${rows.length + 1}위부터는 구별 현황에서 볼 수 있어요`}
    >
      <RankBarList
        rows={rows}
        ariaLabel={`자치구 ${active.label} 상위 ${rows.length}곳`}
      />
    </DemoFrame>
  )
}
