'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { TrendingUp } from 'lucide-react'
import styled from 'styled-components'
import { fetchAnalysisRankings } from '@/lib/api/analysis-ranking'
import { retryUnlessClientError } from '@/lib/api/api-error'
import { isApiSuccess } from '@/lib/api/response'
import { useDistrictTopTen } from '@/hooks/use-district-top-ten'
import {
  toPopularDistrictsView,
  formatViewCount,
} from '@/lib/home/popular-districts'
import {
  toHomeMetricRankings,
  HOME_METRICS,
  homeMetricLabel,
  type HomeMetric,
} from '@/lib/home/metric-rankings'
import { buildRankingInsight } from '@/lib/home/ranking-insight'
import {
  formatStatusValue,
  toChangeBadge,
} from '@/lib/status/status-formatters'
import RankBarList, { type RankBarRow } from '@/components/home/rank-bar-list'
import MetricToggleGroup from '@/components/home/metric-toggle-group'

const RANKING_SIZE = 8

const Section = styled.section<{ $dual?: boolean }>`
  /*
    D5-4: 한쪽 열만 살아 있으면 100dvh 를 해제한다 — 살아 있는 한 열(약 170px)만으로
    900px 높이를 채우면 위아래가 텅 빈 여백이 된다("여백으로 채우지 않는다", D4-3).
    두 열이 모두 있을 때만(기본값 포함 — 로딩/스켈레톤 단계는 아직 결과를 모르므로
    두 열을 가정한다) 100dvh 를 준다.
  */
  ${props => (props.$dual === false ? '' : 'min-height: 100dvh;')}
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 64px 20px;

  /* 900px 이하에서는 2단이 1단으로 접힌다. 두 목록을 한 화면에 넣으면 글자가 안 읽힌다. */
  @media (max-width: 900px) {
    min-height: auto;
    padding: 56px 20px;
  }

  @media (max-width: 640px) {
    padding: 48px 16px;
  }
`

const Inner = styled.div`
  width: min(1120px, 100%);
  margin: 0 auto;
`

const Header = styled.div`
  max-width: 680px;
  display: grid;
  gap: 10px;
  margin-bottom: 28px;

  @media (max-width: 640px) {
    margin-bottom: 20px;
  }
`

const Eyebrow = styled.p`
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--color-text-caption);
  font-size: 13px;
  font-weight: 600;
  line-height: 20px;

  svg {
    width: 16px;
    height: 16px;
    stroke: currentColor;
  }
`

const Title = styled.h2`
  color: var(--color-text-900);
  font-size: 26px;
  font-weight: 700;
  line-height: 36px;
  word-break: keep-all;

  @media (max-width: 640px) {
    font-size: 22px;
    line-height: 30px;
  }

  @media (max-width: 480px) {
    font-size: 20px;
    line-height: 28px;
  }
`

const Columns = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  align-items: start;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`

const Column = styled.div`
  display: grid;
  gap: 12px;
`

const ColumnHeading = styled.h3`
  display: flex;
  align-items: baseline;
  gap: 6px;
  font-size: 15px;
  font-weight: 700;
  color: var(--color-text-900);
  word-break: keep-all;
`

const ColumnCaption = styled.span`
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text-caption);
`

const MetricEmptyNotice = styled.p`
  margin: 0;
  padding: 14px 12px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  font-size: 13px;
  color: var(--color-text-caption);
`

const Insight = styled.p`
  margin-top: 20px;
  padding: 14px 16px;
  border: 1px dashed var(--color-primary-600);
  border-radius: var(--radius-card);
  background: var(--color-primary-100);
  font-size: 14px;
  line-height: 22px;
  color: var(--color-text-700);
  word-break: keep-all;
`

const List = styled.ol`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;

  @media (max-width: 900px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`

const Item = styled.li`
  display: grid;
`

const SkeletonCard = styled.div`
  min-height: 72px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  background: var(--color-surface);
`

function RankingSkeleton() {
  return (
    <Section aria-busy="true" aria-label="지금 많이 본 자치구">
      <Inner>
        <Header>
          <Eyebrow>
            <TrendingUp aria-hidden="true" />
            지금 많이 본 지역
          </Eyebrow>
          <Title>다른 사람들이 보는 곳과, 숫자가 좋은 곳은 다릅니다.</Title>
        </Header>
        <List aria-hidden="true">
          {Array.from({ length: RANKING_SIZE }, (_, index) => (
            <Item key={index}>
              <SkeletonCard />
            </Item>
          ))}
        </List>
      </Inner>
    </Section>
  )
}

export default function PopularDistricts() {
  const rankingQuery = useQuery({
    queryKey: ['home', 'analysisRankings', 'DISTRICT', RANKING_SIZE],
    queryFn: () => fetchAnalysisRankings('DISTRICT', RANKING_SIZE),
    /*
      이 API 만 따로 죽는다 — 집계 파이프라인(Kafka/Redis)이 멈추면 여기만
      RANKING_001(503)이고 다른 분석 API 는 멀쩡하다. 그래서 다른 데이터와 한
      쿼리로 묶지 않고 이 섹션만의 쿼리로 둔다.
    */
    retry: retryUnlessClientError(1),
    staleTime: 5 * 60 * 1000,
  })

  const metricQuery = useDistrictTopTen()

  const [metric, setMetric] = useState<HomeMetric>('footTraffic')

  const rawView =
    rankingQuery.data && isApiSuccess(rankingQuery.data)
      ? toPopularDistrictsView(rankingQuery.data.dataBody)
      : null
  // 집계가 아직 비었을 수도 있다(배포 직후). 빈 목록을 그리느니 그 쪽을 뺀다.
  const view = rawView && rawView.items.length > 0 ? rawView : null

  const metricRankings =
    metricQuery.data && isApiSuccess(metricQuery.data)
      ? toHomeMetricRankings(metricQuery.data.dataBody)
      : null

  /*
    A. `top-ten` 이 200 을 주고도 지표 하나만 빈 배열일 수 있다(예: footTraffic 만
    비고 매출·개업은 정상). 그 경우에도 세 지표 중 하나라도 데이터가 있으면 토글은
    남긴다 — 토글이 사라지면 멀쩡한 다른 지표로 넘어갈 방법이 없어진다.
    세 지표가 전부 비었을 때만(=사실상 API 가 죽은 것과 같다) 우측을 통째로 뺀다.
  */
  const hasMetricData =
    metricRankings !== null &&
    metricRankings.some(entry => entry.items.length > 0)

  const activeMetric = hasMetricData
    ? (metricRankings!.find(entry => entry.metric === metric) ?? null)
    : null

  // 두 순위의 차이를 말하는 문장이므로 양쪽이 다 있을 때만 만들 수 있다.
  // (activeMetric.items 가 비어 있으면 buildRankingInsight 가 알아서 null 을 낸다.)
  const insight =
    view && activeMetric ? buildRankingInsight(view.items, activeMetric) : null

  /*
    아직 안 온 것(isPending)과 죽은 것을 구별한다. 둘 다 아직 로딩 중이면
    **기존 스켈레톤을 그대로 낸다** — 여기서 null 을 내면 로딩 동안 홈이 한 칸 꺼졌다가
    나중에 아래 섹션을 밀어낸다(기존 코드가 스켈레톤을 둔 이유가 그것이다).
    둘 다 결론이 났는데 쓸 수 있는 게 없을 때만 섹션을 뺀다.
  */
  const viewPending = rankingQuery.isPending
  const metricPending = metricQuery.isPending

  if (!view && !activeMetric) {
    if (viewPending || metricPending) return <RankingSkeleton />
    return null
  }

  const viewRows: RankBarRow[] = (view?.items ?? []).map(item => ({
    key: item.districtCode,
    rank: item.rank,
    name: item.name,
    value: item.viewCount,
    valueLabel: formatViewCount(item.viewCount),
    href: item.href,
    ariaLabel: `${item.rank}위 ${item.name}, 조회 ${item.viewCount.toLocaleString('ko-KR')}회${
      view?.windowLabel ? ` (${view.windowLabel})` : ''
    }. 이 자치구로 상권분석 시작하기`,
  }))

  const metricRows: RankBarRow[] = (activeMetric?.items ?? []).map(item => ({
    key: item.districtCode,
    rank: item.rank,
    name: item.districtName,
    value: item.value,
    valueLabel: formatStatusValue(activeMetric!.metric, item.value),
    ...toChangeBadge(item.changeRate),
  }))

  const highlightKey = insight?.highlightCode ?? null

  const viewColumn = view ? (
    <Column>
      <ColumnHeading>
        지금 많이 본 지역
        {view.windowLabel ? (
          <ColumnCaption>· {view.windowLabel}</ColumnCaption>
        ) : null}
      </ColumnHeading>
      <RankBarList
        rows={viewRows}
        ariaLabel="지금 많이 본 자치구 조회수 순위"
        highlightKey={highlightKey}
      />
    </Column>
  ) : null

  // A. 세 지표 중 하나라도 데이터가 있으면 토글은 항상 낸다 — 선택된 지표만
  // 비었을 때는 토글이 아니라 그 자리에 짧은 안내만 낸다.
  const metricColumn = hasMetricData ? (
    <Column>
      <MetricToggleGroup
        options={HOME_METRICS}
        value={metric}
        getLabel={homeMetricLabel}
        onChange={setMetric}
        ariaLabel="지표 선택"
      />
      <ColumnHeading>
        {activeMetric?.label ?? homeMetricLabel(metric)} 상위 자치구
      </ColumnHeading>
      {activeMetric && activeMetric.items.length > 0 ? (
        <RankBarList
          rows={metricRows}
          ariaLabel={`${activeMetric.label} 상위 자치구 순위`}
          highlightKey={highlightKey}
        />
      ) : (
        <MetricEmptyNotice>이 지표는 집계가 없습니다.</MetricEmptyNotice>
      )}
    </Column>
  ) : null

  return (
    <Section
      aria-label="지금 많이 본 자치구"
      $dual={Boolean(viewColumn && metricColumn)}
    >
      <Inner>
        <Header>
          <Eyebrow>
            <TrendingUp aria-hidden="true" />
            지금 많이 본 지역
          </Eyebrow>
          <Title>다른 사람들이 보는 곳과, 숫자가 좋은 곳은 다릅니다.</Title>
        </Header>
        {viewColumn && metricColumn ? (
          <Columns>
            {viewColumn}
            {metricColumn}
          </Columns>
        ) : (
          (viewColumn ?? metricColumn)
        )}
        {insight ? <Insight>{insight.sentence}</Insight> : null}
      </Inner>
    </Section>
  )
}
