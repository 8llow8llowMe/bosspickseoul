'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
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
  hasEnoughViewSample,
} from '@/lib/home/popular-districts'
import { canShowViewCounts } from '@/lib/rankings/ranking-format'
import {
  toHomeMetricRankings,
  HOME_METRICS,
  RANKING_METRIC_TOP_N,
  homeMetricLabel,
  type HomeMetric,
} from '@/lib/home/metric-rankings'
import { buildRankingInsight } from '@/lib/home/ranking-insight'
import { buildRankingMapLayers } from '@/lib/home/ranking-map'
import { useNarrowViewport } from '@/hooks/use-narrow-viewport'
import RankBarList, { type RankBarRow } from '@/components/home/rank-bar-list'
import MetricToggleGroup from '@/components/home/metric-toggle-group'
import RankingMiniMap from '@/components/home/ranking-mini-map'
import RankingConnector from '@/components/home/ranking-connector'
import {
  HOME_COLUMN,
  HOME_FULL_SCREEN_SECTION,
} from '@/components/home/layout-constants'

const RANKING_SIZE = 8

/*
  행 ↔ 구 강조는 호버가 있는 넓은 폭에서만(ranking-mini-map.md D4-3). 좁은 폭·터치에서는 탭이 hover 를
  흉내 내 강조가 남으므로 핸들러를 붙이지 않는다. 연결선은 목록과 지도가 나란히 서는 두 칸 배치(≥1200)에서만.
*/
const ROW_HOVER_QUERY =
  '(min-width: 901px) and (hover: hover) and (pointer: fine)'
const CONNECTOR_QUERY =
  '(min-width: 1200px) and (hover: hover) and (pointer: fine)'

/*
  화면 높이를 붙잡지 않는다. 300dvh 스크롤 트랙(R1)은 home-restructure.md 에서
  철회했다 — 지표 전환은 토글 클릭 하나다. 세로 리듬은 판단 흐름·벤토와 같다.
*/
const Section = styled.section`
  ${HOME_FULL_SCREEN_SECTION}
  padding: 96px 0;

  @media (max-width: 900px) {
    padding: 72px 0;
  }

  @media (max-width: 640px) {
    padding: 56px 0;
  }
`

const Inner = styled.div`
  ${HOME_COLUMN}
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
  /*
    상태(스켈레톤 → dual / 지표만 / 조회만)마다 문구가 바뀌어 줄 수가 달라질 수 있다.
    2줄분을 예약해 교체가 아래 목록을 밀지 않게 한다(ranking-minimum-sample D4-2).
  */
  min-height: 72px;
  color: var(--color-text-900);
  font-size: 26px;
  font-weight: 700;
  line-height: 36px;
  word-break: keep-all;

  @media (max-width: 640px) {
    min-height: 60px;
    font-size: 22px;
    line-height: 30px;
  }

  @media (max-width: 480px) {
    min-height: 56px;
    font-size: 20px;
    line-height: 28px;
  }
`

type ColumnsLayout = 'dual' | 'metricOnly' | 'viewOnly'

/*
  폭별 배치(ranking-mini-map.md D4-5, #600 으로 지표 목록을 걷어 낸 뒤).

  지표 순위는 **목록으로 다시 그리지 않는다**(#600, 진단 H12). 홈에는 판단 흐름 01 단계 「자치구 순위 상위
  5곳」이 같은 지표·같은 다섯 구를 이미 보여 줘서, 여기 오른쪽 목록은 같은 강남·관악·송파·성북·강서를
  한 번 더 읽게 했다. 지표는 지도 칠과 범례(「유동인구 Top 5 · 진할수록 위」)가 맡고, 두 순위의 차이는
  인사이트 한 줄이 말한다. 지표 토글은 지도 머리에 둔다 — 토글이 바꾸는 것이 지도 칠이다.

  - 조회 목록이 있으면(dual·조회만): ≥1200 은 [많이 본][지도] 두 칸(지도 1.15fr), 그 아래는 지도가 위·
    목록이 아래 한 열이다.
  - 지표만: 지도 한 칸(최대 560px, 가운데).

  DOM 순서는 많이 본 → 지도다 — 넓은 폭의 읽는 순서와 같고, 좁은 폭에서 지도를 맨 위로 올리는 일은
  grid-area 가 한다.
*/
const COLUMNS_AREAS: Record<
  ColumnsLayout,
  { narrow: string; wide: string; wideColumns: string }
> = {
  dual: {
    narrow: "'map' 'view'",
    wide: "'view map'",
    wideColumns: 'minmax(0, 1fr) minmax(0, 1.15fr)',
  },
  metricOnly: {
    narrow: "'map'",
    wide: "'map'",
    wideColumns: 'minmax(0, 1fr)',
  },
  viewOnly: {
    narrow: "'map' 'view'",
    wide: "'view map'",
    wideColumns: 'minmax(0, 1fr) minmax(0, 1.15fr)',
  },
}

const Columns = styled.div<{ $layout: ColumnsLayout }>`
  /* 연결선 덮개(RankingConnector)의 기준 상자다. */
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  grid-template-areas: ${p => COLUMNS_AREAS[p.$layout].narrow};
  gap: 24px;
  align-items: start;

  @media (min-width: 1200px) {
    grid-template-columns: ${p => COLUMNS_AREAS[p.$layout].wideColumns};
    grid-template-areas: ${p => COLUMNS_AREAS[p.$layout].wide};
    gap: 32px;
  }
`

const Column = styled.div<{ $area: 'view' }>`
  grid-area: ${p => p.$area};
  min-width: 0;
  display: grid;
  gap: 12px;
`

/*
  지도 칸. 어느 배치에서나 최대 560px 로 제 칸 가운데에 선다 — 지표 목록이 빠진 두 칸 배치(#600)에서
  1.15fr 칸을 다 쓰면 1440 에서 지도가 약 730×590px 로 커져 옆 목록(약 200px)보다 세 배 높았다.
  두 칸 배치에서는 목록 높이 안에서 세로 가운데에 선다. 상자는 800:620 비율로 자리를 먼저 잡는다
  (MapSvg aspect-ratio) — 스켈레톤 실루엣과 크기가 같아 데이터가 와도 튀지 않는다(D2-9). 지표 토글이
  있으면 지도 머리에 둔다(#600).
*/
const MapCell = styled.div`
  grid-area: map;
  min-width: 0;
  width: 100%;
  max-width: 560px;
  justify-self: center;
  display: grid;
  gap: 12px;

  @media (min-width: 1200px) {
    align-self: center;
  }
`

/*
  두 열의 머리 줄. 예전엔 우측만 토글이 제목 **위**에 있어 좌측 제목과 우측 제목의
  높이가 어긋났다 — 토글을 제목과 같은 줄 오른쪽으로 옮기고, 토글 높이(32px)를
  양쪽 머리 줄의 최소 높이로 맞춘다.
*/
const ColumnHeader = styled.div`
  min-height: 32px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 12px;
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

/*
  인사이트는 이 섹션의 결론이라 두 열 **위**에 둔다. 예전엔 두 열 아래 셸 전폭(1865)
  점선 상자에 한 줄이 들어가 「무언가 들어갈 자리」처럼 읽혔다 — 점선을 버리고 글 폭
  만큼만 칠한다(fit-content).

  자리 예약(R2)은 유지한다. 지표를 넘길 때 문장이 나타나고 사라져도 아래 두 열이
  밀리면 안 된다. 예약 높이 = 줄 수 x 22 + 패딩 28 + 테두리 2. 두 열 위라 컬럼 전폭을
  쓰므로 데스크톱은 한 줄(52px)이면 된다 — 가장 긴 문장이 약 500px 다. 한 폭 안에서는
  높이가 일정하므로 폭별 예약이어도 밀림이 없다. 640 이하에서만 두 줄(74px).
*/
const InsightSlot = styled.p<{ $visible: boolean }>`
  width: fit-content;
  max-width: 100%;
  min-height: 52px;
  margin: 0 0 24px;
  padding: 14px 16px;
  /* 테두리를 빼지 않고 투명으로 둔다 — 문장이 나타날 때 2px 가 튀지 않게. */
  border: 1px solid transparent;
  border-radius: var(--radius-card);
  background: ${props =>
    props.$visible ? 'var(--color-primary-100)' : 'transparent'};
  font-size: 14px;
  font-weight: 600;
  line-height: 22px;
  color: var(--color-text-800);
  word-break: keep-all;

  @media (max-width: 640px) {
    min-height: 74px;
  }
`

/*
  스켈레톤 목록 자리. 머리 줄(32) + 간격(12) + 행 52px x 개수 + 구분선·테두리 — 최종 목록과 같은
  높이를 잡아 데이터가 와도 아래 섹션을 밀지 않는다. 많이 본 8행이다.
*/
const SkeletonPanel = styled.div<{ $area: 'view'; $rows: number }>`
  grid-area: ${p => p.$area};
  min-height: ${p => 44 + p.$rows * 52 + (p.$rows - 1) + 2}px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  background: var(--color-surface);
`

/*
  상태별 두 줄 문구(ranking-minimum-sample D4-2). 각 상태에서 **참인 문장**만 쓴다 —
  좌측 열이 없는데 「많이 본」을 약속하지 않는다.

  「지표만」 제목은 #600 에서 「…수로 자치구를 비교해요」 → 「…상위 자치구를 서울 지도에 칠했어요」로 바꿨다.
  지표 목록을 걷어 내 이 상태에 남는 것은 지도 칠과 토글뿐이다 — 비교할 숫자가 화면에 없는데 「비교해요」는
  거짓이다. 새 문장은 dual 에서도 참이라(dual 도 같은 지도 칠을 갖는다) 스켈레톤 문구로도 그대로 쓴다.
*/
const COPY = {
  dual: {
    eyebrow: '지금 많이 본 지역',
    title: '다른 사람들이 보는 곳과, 숫자가 좋은 곳은 달라요.',
  },
  metricOnly: {
    eyebrow: '자치구 지표 순위',
    title: '유동인구·매출·개업 상위 자치구를 서울 지도에 칠했어요.',
  },
  viewOnly: {
    eyebrow: '지금 많이 본 지역',
    title: '지금은 이 자치구들을 많이 보고 있어요.',
  },
} as const

/*
  스켈레톤은 「지표만」 문구를 쓴다. 그 문장은 dual 에서도 참이라(dual 은 지표 열을
  반드시 포함한다) 최종 상태가 무엇이 되든 거짓을 먼저 약속하지 않는다(D4-4).
*/
function RankingSkeleton() {
  return (
    <Section aria-busy="true" aria-label={COPY.metricOnly.eyebrow}>
      <Inner>
        <Header>
          <Eyebrow>
            <TrendingUp aria-hidden="true" />
            {COPY.metricOnly.eyebrow}
          </Eyebrow>
          <Title>{COPY.metricOnly.title}</Title>
        </Header>
        {/* 최종 상태의 가장 흔한 배치(듀얼)로 자리를 잡는다. 지도는 같은 크기의 회색 실루엣이다. */}
        <Columns $layout="dual" aria-hidden="true">
          <SkeletonPanel $area="view" $rows={RANKING_SIZE} />
          <MapCell>
            {/* 지도 머리(지표 토글) 자리 — 최종 듀얼 배치와 높이를 맞춘다. */}
            <ColumnHeader />
            <RankingMiniMap layers={null} />
          </MapCell>
        </Columns>
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

  /* 지표 정본. 토글이 바꾸고, 그 자리에서 우측 목록만 바뀐다. */
  const [metric, setMetric] = useState<HomeMetric>('footTraffic')
  /* 행·폴리곤 호버/포커스가 가리키는 구(ranking-mini-map.md D5-1). */
  const [hoverCode, setHoverCode] = useState<string | null>(null)
  const [mapIntroDone, setMapIntroDone] = useState(false)
  const columnsRef = useRef<HTMLDivElement | null>(null)
  const mapSvgRef = useRef<SVGSVGElement | null>(null)
  const rowHoverEnabled = useNarrowViewport(ROW_HOVER_QUERY) === true
  const connectorAllowed = useNarrowViewport(CONNECTOR_QUERY) === true

  /*
    같은 코드의 leave 에서만 끄고, 끄는 것도 한 틱 미룬다(D5-1). 행 A → 이웃 행 B 로 옮기면 A 의 leave 가
    B 의 enter 보다 먼저 온다 — 바로 끄면 그 사이 인사이트 강조로 돌아갔다가 B 로 오며 선이 한 번
    더 그려진다. 미룬 끄기는 같은 작업 안에서 오는 enter 가 취소한다.
  */
  const leaveTimerRef = useRef<number | null>(null)
  const cancelLeave = useCallback(() => {
    if (leaveTimerRef.current !== null) {
      window.clearTimeout(leaveTimerRef.current)
      leaveTimerRef.current = null
    }
  }, [])
  const enterDistrict = useCallback(
    (code: string) => {
      cancelLeave()
      setHoverCode(code)
    },
    [cancelLeave],
  )
  const leaveDistrict = useCallback(
    (code: string) => {
      cancelLeave()
      leaveTimerRef.current = window.setTimeout(() => {
        leaveTimerRef.current = null
        setHoverCode(current => (current === code ? null : current))
      }, 0)
    },
    [cancelLeave],
  )
  useEffect(() => cancelLeave, [cancelLeave])
  /*
    호버 핸들러가 사라지면(폭이 901 아래로 줄었다) leave·blur 가 다시 오지 않는다. 남은 호버가 좁은 폭에서
    인사이트 강조를 영영 가리지 않게 지운다.
  */
  useEffect(() => {
    if (rowHoverEnabled) return
    cancelLeave()
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHoverCode(null)
  }, [rowHoverEnabled, cancelLeave])
  /* 바뀐 목록에 그 행이 없을 수 있어 토글하면 호버를 지운다. */
  const changeMetric = useCallback((next: HomeMetric) => {
    setHoverCode(null)
    setMetric(next)
  }, [])

  const rawView =
    rankingQuery.data && isApiSuccess(rankingQuery.data)
      ? toPopularDistrictsView(rankingQuery.data.dataBody)
      : null
  /*
    빈 목록(배포 직후)과 표본 부족(1~2곳)은 같은 결과 — 좌측 열이 없다. 1~2곳짜리
    「많이 본 순위」는 사회적 증거가 아니라 역효과다(ranking-minimum-sample.md).
  */
  const view =
    rawView && rawView.items.length > 0 && hasEnoughViewSample(rawView)
      ? rawView
      : null

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

  const viewPending = rankingQuery.isPending
  const metricPending = metricQuery.isPending

  const activeMetric = hasMetricData
    ? (metricRankings!.find(entry => entry.metric === metric) ?? null)
    : null

  // 두 순위의 차이를 말하는 문장이므로 양쪽이 다 있을 때만 만들 수 있다.
  // (activeMetric.items 가 비어 있으면 buildRankingInsight 가 알아서 null 을 낸다.)
  const insight =
    view && activeMetric ? buildRankingInsight(view.items, activeMetric) : null

  /*
    스켈레톤으로 기다리는 두 경우(ranking-minimum-sample D5-1 pending 표):
    ① 조회가 아직 안 왔다 — 지표가 먼저 와도 「지표만」을 먼저 그리지 않는다. 뒤이어
       조회가 3곳 이상으로 오면 dual 로 바뀌며 인사이트 슬롯·2단 배치가 끼어들어
       아래 벤토를 민다(지표 쿼리는 01 데모와 공유라 먼저 오는 경우가 흔하다).
    ② 조회는 결론(좌측 없음)인데 지표가 아직 안 왔다.
    여기서 null 을 내면 로딩 동안 홈이 한 칸 꺼졌다가 나중에 아래 섹션을 민다.
    둘 다 결론이 났는데 쓸 수 있는 게 없을 때만 섹션을 뺀다.
  */
  if (viewPending) return <RankingSkeleton />
  if (!view && !activeMetric) {
    return metricPending ? <RankingSkeleton /> : null
  }

  /*
    조회 수가 임계값(`MIN_VISIBLE_VIEW_COUNT`) 아래인 곳이 있으면 숫자·막대 없이 순위만 보인다(#600).
    「1회」 다섯 곳은 아무도 쓰지 않는 서비스처럼 읽히고, 그 막대는 모두 100% 라 아무것도 말하지 않는다.
  */
  const showViewCounts = view ? canShowViewCounts(view.items) : false
  const viewRows: RankBarRow[] = (view?.items ?? []).map(item => ({
    key: item.districtCode,
    rank: item.rank,
    name: item.name,
    value: item.viewCount,
    valueLabel: showViewCounts ? formatViewCount(item.viewCount) : '',
    href: item.href,
    ariaLabel: `${item.rank}위 ${item.name}${
      showViewCounts ? `, 조회 ${item.viewCount.toLocaleString('ko-KR')}회` : ''
    }${view?.windowLabel ? ` (${view.windowLabel})` : ''}. 이 자치구로 상권분석 시작하기`,
  }))

  /* 호버·포커스 > 인사이트가 가리키는 구 > 없음. 양쪽 목록과 지도가 이 한 값을 본다(D5-1). */
  const activeCode = hoverCode ?? insight?.highlightCode ?? null
  const highlightKey = activeCode
  /* 「현재」는 인사이트가 가리키는 행 하나다 — 호버·포커스를 따라 aria-current 가 옮겨 다니지 않게. */
  const currentKey = insight?.highlightCode ?? null
  const rowHoverProps = rowHoverEnabled
    ? { onRowEnter: enterDistrict, onRowLeave: leaveDistrict }
    : {}

  const viewColumn = view ? (
    <Column $area="view" data-rank-column="view">
      <ColumnHeader>
        <ColumnHeading>
          지금 많이 본 지역
          {view.windowLabel ? (
            <ColumnCaption>· {view.windowLabel}</ColumnCaption>
          ) : null}
        </ColumnHeading>
      </ColumnHeader>
      <RankBarList
        rows={viewRows}
        ariaLabel="지금 많이 본 자치구 조회수 순위"
        highlightKey={highlightKey}
        currentKey={currentKey}
        variant="card"
        showBars={showViewCounts}
        {...rowHoverProps}
      />
    </Column>
  ) : null

  /*
    A. 세 지표 중 하나라도 데이터가 있으면 토글은 항상 낸다 — 선택된 지표만 비었을 때는 그 자리에 짧은
    안내만 낸다. 토글은 지도 머리에 있다 — 지표 순위는 목록이 아니라 지도 칠로 보인다(#600, H12).
  */
  const metricHeader = hasMetricData ? (
    <>
      <ColumnHeader data-map-metric-header="">
        <ColumnHeading>지도에 칠한 지표</ColumnHeading>
        <MetricToggleGroup
          options={HOME_METRICS}
          value={metric}
          getLabel={homeMetricLabel}
          onChange={changeMetric}
          ariaLabel="지표 선택"
        />
      </ColumnHeader>
      {activeMetric && activeMetric.items.length > 0 ? null : (
        <MetricEmptyNotice>이 지표는 아직 집계가 없어요.</MetricEmptyNotice>
      )}
    </>
  ) : null

  const layout: ColumnsLayout =
    viewColumn && metricHeader ? 'dual' : viewColumn ? 'viewOnly' : 'metricOnly'
  const copy = COPY[layout]

  /*
    지도에는 섹션에 실제로 있는 레이어만 그린다(D5-3). 선택 지표만 비었으면 칠 없이 배지만 남는다 —
    `activeMetric.items` 가 비어 `fills` 가 빈 Map 이 된다.
  */
  const mapLayers = buildRankingMapLayers(view, activeMetric)

  return (
    /* 랜드마크 이름도 상태에서 유도한다 — 좌측 열이 없는데 「많이 본」을 읽지 않게. */
    <Section aria-label={copy.eyebrow}>
      <Inner>
        <Header>
          <Eyebrow>
            <TrendingUp aria-hidden="true" />
            {copy.eyebrow}
          </Eyebrow>
          <Title>{copy.title}</Title>
        </Header>
        {/*
        항상 마운트해 자리를 예약한다(R2). aria-live 는 지표를 넘겨 문장이
        바뀌거나 나타나거나 사라질 때 스크린리더가 그 변화를 읽게 한다.
        두 열이 다 있을 때만 둔다 — 인사이트는 두 순위의 차이를 말하는 문장이라
        솔로 분기에서는 영원히 비어 있을 자리가 된다.
      */}
        {viewColumn && metricHeader ? (
          <InsightSlot $visible={insight !== null} aria-live="polite">
            {insight?.sentence ?? null}
          </InsightSlot>
        ) : null}
        <Columns ref={columnsRef} $layout={layout}>
          {viewColumn}
          <MapCell>
            {metricHeader}
            <RankingMiniMap
              layers={mapLayers}
              metricLabel={activeMetric?.label ?? null}
              activeCode={activeCode}
              svgRef={mapSvgRef}
              onIntroDoneChange={setMapIntroDone}
              {...(rowHoverEnabled
                ? {
                    onDistrictEnter: enterDistrict,
                    onDistrictLeave: leaveDistrict,
                  }
                : {})}
            />
          </MapCell>
          <RankingConnector
            containerRef={columnsRef}
            mapSvgRef={mapSvgRef}
            activeCode={activeCode}
            enabled={connectorAllowed && mapIntroDone}
            revision={[metric, viewRows.map(row => row.key).join(',')].join(
              '|',
            )}
            badgeCodes={mapLayers.badges.map(badge => badge.code)}
          />
        </Columns>
      </Inner>
    </Section>
  )
}
