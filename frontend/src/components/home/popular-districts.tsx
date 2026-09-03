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
  formatStatusChange,
} from '@/lib/status/status-formatters'
import RankBarList, { type RankBarRow } from '@/components/home/rank-bar-list'

const RANKING_SIZE = 8

const Section = styled.section`
  min-height: 100dvh;
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

const MetricToggle = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`

const MetricButton = styled.button<{ $active: boolean }>`
  min-height: 32px;
  padding: 0 12px;
  border: 1px solid
    ${props =>
      props.$active ? 'var(--color-primary-600)' : 'var(--color-border-200)'};
  border-radius: var(--radius-pill);
  background: ${props =>
    props.$active ? 'var(--color-primary-100)' : 'var(--color-surface)'};
  color: ${props =>
    props.$active ? 'var(--color-primary-700)' : 'var(--color-text-700)'};
  font-size: 13px;
  font-weight: ${props => (props.$active ? 700 : 600)};
  cursor: pointer;
  transition:
    background-color var(--motion-fast) var(--ease-standard),
    border-color var(--motion-fast) var(--ease-standard),
    color var(--motion-fast) var(--ease-standard);

  &:hover {
    border-color: var(--color-primary-600);
  }
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

  const activeMetricRaw =
    metricRankings?.find(entry => entry.metric === metric) ?? null
  const activeMetric =
    activeMetricRaw && activeMetricRaw.items.length > 0 ? activeMetricRaw : null

  // 두 순위의 차이를 말하는 문장이므로 양쪽이 다 있을 때만 만들 수 있다.
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
    changeLabel: formatStatusChange(item.changeRate),
    changeDirection: item.changeRate >= 0 ? 'up' : 'down',
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

  const metricColumn = activeMetric ? (
    <Column>
      <MetricToggle role="group" aria-label="지표 선택">
        {HOME_METRICS.map(candidate => (
          <MetricButton
            key={candidate}
            type="button"
            $active={candidate === metric}
            aria-pressed={candidate === metric}
            onClick={() => setMetric(candidate)}
          >
            {homeMetricLabel(candidate)}
          </MetricButton>
        ))}
      </MetricToggle>
      <ColumnHeading>{activeMetric.label} 상위 자치구</ColumnHeading>
      <RankBarList
        rows={metricRows}
        ariaLabel={`${activeMetric.label} 상위 자치구 순위`}
        highlightKey={highlightKey}
      />
    </Column>
  ) : null

  return (
    <Section aria-label="지금 많이 본 자치구">
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
