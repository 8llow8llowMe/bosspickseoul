'use client'

import { useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { TrendingUp } from 'lucide-react'
import styled from 'styled-components'
import { fetchAnalysisRankings } from '@/lib/api/analysis-ranking'
import { retryUnlessClientError } from '@/lib/api/api-error'
import { isApiSuccess } from '@/lib/api/response'
import { useDistrictTopTen } from '@/hooks/use-district-top-ten'
import { useStackedMode } from '@/hooks/use-stacked-mode'
import {
  toPopularDistrictsView,
  formatViewCount,
} from '@/lib/home/popular-districts'
import {
  toHomeMetricRankings,
  HOME_METRICS,
  RANKING_METRIC_TOP_N,
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
import { HEADER_HEIGHT } from '@/components/home/layout-constants'
import { activeStepFromProgress } from '@/components/home/scroll-fill'
import { scrollToPinnedStep } from '@/components/home/scroll-to-pinned-step'
import { useScrollProgress } from '@/components/home/use-scroll-progress'
import { shellWidth } from '@/styles/layout'

const RANKING_SIZE = 8

const Section = styled.section<{ $dual?: boolean }>`
  /*
    D5-4: 한쪽 열만 살아 있으면 100dvh 를 해제한다 — 살아 있는 한 열(약 170px)만으로
    900px 높이를 채우면 위아래가 텅 빈 여백이 된다("여백으로 채우지 않는다", D4-3).

    $dual 은 "지금 두 열이 렌더되고 있는가"가 아니라 "두 열이 최종적으로 있을
    것인가"다 — 아직 pending 인 쿼리는 "있을 것"으로 가정한다. 두 쿼리(조회수·
    지표)는 서로 다른 네트워크 호출이라 응답 시각이 다르다. "지금 렌더된 열"
    기준으로 계산하면, 한쪽이 먼저 도착했을 때 아직 안 온 나머지 쪽을 "없다"로
    오판해 100dvh → auto 로 수축했다가, 나머지 쪽이 도착하면 다시 100dvh 로
    팽창하는 깜빡임이 **열화 경로가 아니라 정상 로드마다** 발생했다. 결론이
    난(pending 이 끝난) 뒤에도 없을 때만 진짜로 "없다"로 취급한다.
  */
  ${props => (props.$dual === false ? '' : 'min-height: 100dvh;')}
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 64px 0;

  /* 900px 이하에서는 2단이 1단으로 접힌다. 두 목록을 한 화면에 넣으면 글자가 안 읽힌다. */
  @media (max-width: 900px) {
    min-height: auto;
    padding: 56px 0;
  }

  @media (max-width: 640px) {
    padding: 48px 0;
  }
`

/*
  R1: 지표를 스크롤로 넘긴다. 트랙 높이는 스토리가 쓰는 공식(100dvh x 스텝 수)을
  지표 개수에 그대로 적용한 값이다 — 300dvh 를 하드코딩하면 지표를 늘릴 때 어긋난다.

  dual 이고 스택 모드가 아닐 때만 쓴다(D5-3). 좌측 열 없이 우측 지표 하나만 핀
  고정하면 비교 맥락(「보는 곳」)이 없어 서사가 성립하지 않는다.
*/
const ScrollTrack = styled.section`
  height: calc(100dvh * ${HOME_METRICS.length});
`

const ScrollSticky = styled.div`
  position: sticky;
  top: ${HEADER_HEIGHT};
  min-height: calc(100dvh - ${HEADER_HEIGHT});
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 64px 0;

  @media (max-width: 900px) {
    padding: 56px 0;
  }

  @media (max-width: 640px) {
    padding: 48px 0;
  }
`

const Inner = styled.div`
  ${shellWidth}
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

const InsightSlot = styled.p<{ $visible: boolean }>`
  margin-top: 20px;
  /*
    2줄(line-height 22px x 2) + 상하 패딩(14px x 2) + 테두리(1px x 2) = 74px (D5-5).
    문장이 없을 때도 이 높이를 예약해야 지표를 넘길 때 아래 콘텐츠가 튀지 않는다.
    "가장 좁은 열에서 2줄" 기준이며 모든 브레이크포인트에 같은 값을 쓴다 —
    데스크톱에서 1줄로 끝나 일부가 비어도, 폭마다 다른 예약 높이를 계산하는 것보다
    밀림이 아예 없는 편이 낫다.
  */
  min-height: 74px;
  padding: 14px 16px;
  /*
    테두리를 없애는 대신 transparent 로 둔다 — 2px 를 박스 모델에서 빼지 않아야
    문장이 나타나는 순간 높이가 2px 튀는 것까지 막는다. 색이 투명이라 화면에는
    "빈 상자"가 보이지 않는다.
  */
  border: 1px dashed
    ${props => (props.$visible ? 'var(--color-primary-600)' : 'transparent')};
  border-radius: var(--radius-card);
  background: ${props =>
    props.$visible ? 'var(--color-primary-100)' : 'transparent'};
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

  /* 스크롤 트랙이 아닐 때(폴백·솔로)의 지표 정본. 트랙 모드에서는 스크롤이 정본이다. */
  const [pickedMetric, setPickedMetric] = useState<HomeMetric>('footTraffic')

  /* 훅은 전부 조기 반환보다 앞에 있어야 한다 — 아래 dual 계산도 그래서 위로 올렸다. */
  const trackRef = useRef<HTMLElement | null>(null)
  const progress = useScrollProgress(trackRef)
  const stacked = useStackedMode()

  const rawView =
    rankingQuery.data && isApiSuccess(rankingQuery.data)
      ? toPopularDistrictsView(rankingQuery.data.dataBody)
      : null
  // 집계가 아직 비었을 수도 있다(배포 직후). 빈 목록을 그리느니 그 쪽을 뺀다.
  const view = rawView && rawView.items.length > 0 ? rawView : null

  const metricRankings =
    metricQuery.data && isApiSuccess(metricQuery.data)
      ? toHomeMetricRankings(metricQuery.data.dataBody, RANKING_METRIC_TOP_N)
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

  /*
    아직 안 온 것(isPending)과 죽은 것을 구별한다. pending 인 쪽은 결론이 안 났으니
    "있을 것"으로 가정한다 — "지금 렌더된 열" 기준으로 판정하면 한쪽이 먼저 도착했을
    때 나머지를 "없다"로 오판해 수축했다가 재팽창하는 깜빡임이 정상 로드마다 난다.
  */
  const viewPending = rankingQuery.isPending
  const metricPending = metricQuery.isPending
  const viewWillExist = viewPending || view !== null
  const metricWillExist = metricPending || hasMetricData
  const dual = viewWillExist && metricWillExist

  /*
    D5-3. 스크롤 트랙은 dual 이고 스택 모드가 아닐 때만 쓴다. 모바일(≤768px)·
    reduced-motion 은 스토리와 **같은 판정**(useStackedMode)으로 폴백한다.
  */
  const useScrollTrack = dual && !stacked

  /*
    트랙 모드에서는 스크롤 진행도가 지표의 정본이다 — 로컬 state 를 정본으로 두면
    클릭 직후에도 스크롤 리스너가 progress 를 재계산해 다음 스크롤 이벤트(휠 관성·
    리사이즈)에서 상태가 스크롤 위치로 되돌아간다(클릭이 무시된 것처럼 보인다).
    신규 스크롤 계산 함수는 만들지 않는다 — activeStepFromProgress 가 이미 임의의
    스텝 수에 제네릭하다.
  */
  const scrollIndex = activeStepFromProgress(progress, HOME_METRICS.length)
  const metric = useScrollTrack ? HOME_METRICS[scrollIndex] : pickedMetric

  const activeMetric = hasMetricData
    ? (metricRankings!.find(entry => entry.metric === metric) ?? null)
    : null

  // 두 순위의 차이를 말하는 문장이므로 양쪽이 다 있을 때만 만들 수 있다.
  // (activeMetric.items 가 비어 있으면 buildRankingInsight 가 알아서 null 을 낸다.)
  const insight =
    view && activeMetric ? buildRankingInsight(view.items, activeMetric) : null

  /*
    둘 다 아직 로딩 중이면 **기존 스켈레톤을 그대로 낸다** — 여기서 null 을 내면
    로딩 동안 홈이 한 칸 꺼졌다가 나중에 아래 섹션을 밀어낸다(기존 코드가 스켈레톤을
    둔 이유가 그것이다). 둘 다 결론이 났는데 쓸 수 있는 게 없을 때만 섹션을 뺀다.
  */
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
        onChange={next => {
          /*
            트랙 모드에서 setState 만 하면 다음 스크롤 이벤트가 값을 되돌린다 —
            스크롤 위치 자체를 그 지표 구간으로 옮겨 정본을 덮어쓴다(조건①).
          */
          if (useScrollTrack && trackRef.current) {
            scrollToPinnedStep(
              trackRef.current,
              HOME_METRICS.indexOf(next),
              HOME_METRICS.length,
            )
            return
          }
          setPickedMetric(next)
        }}
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

  const body = (
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
      {/*
        항상 마운트해 자리를 예약한다(R2). aria-live 는 지표를 넘겨 문장이
        바뀌거나 나타나거나 사라질 때 스크린리더가 그 변화를 읽게 한다.
        두 열이 다 있을 때만 둔다 — 인사이트는 두 순위의 차이를 말하는 문장이라
        솔로 분기에서는 영원히 비어 있을 자리가 된다.
      */}
      {viewColumn && metricColumn ? (
        <InsightSlot $visible={insight !== null} aria-live="polite">
          {insight?.sentence ?? null}
        </InsightSlot>
      ) : null}
    </Inner>
  )

  /*
    좌측(조회수) 열은 스크롤과 무관한 고정 콘텐츠고, 우측 지표만 스크롤 진행도로
    바뀐다 — 그래서 본문 하나를 두 껍데기가 나눠 쓴다.
  */
  if (useScrollTrack) {
    return (
      <ScrollTrack ref={trackRef} aria-label="지금 많이 본 자치구">
        <ScrollSticky>{body}</ScrollSticky>
      </ScrollTrack>
    )
  }

  return (
    <Section aria-label="지금 많이 본 자치구" $dual={dual}>
      {body}
    </Section>
  )
}
