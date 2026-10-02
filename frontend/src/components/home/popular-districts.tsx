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
import {
  formatStatusValue,
  toChangeBadge,
} from '@/lib/status/status-formatters'
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
  흉내 내 강조가 남으므로 핸들러를 붙이지 않는다. 연결선은 지도가 두 목록 사이에 서는 3칸 배치에서만.
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
  폭별 배치(ranking-mini-map.md D4-5). 지도는 두 목록 사이에서 「어디 · 겹침」만 더한다.

  - ≥1200: 3칸 [많이 본][지도][지표]. 지도 칸만 1.15fr — 1440 에서 목록 424 · 지도 488.
  - 901~1199: 지도(최대 560px, 가운데)가 위, 두 목록이 아래 두 칸.
  - ≤900: 1열 — 지도 → 많이 본 → 지표.

  솔로 분기(지표만·조회만)는 ≥1200 에서 [지도][지표] · [많이 본][지도] 두 칸이다(D5-3).
  DOM 순서는 많이 본 → 지도 → 지표로 둔다 — 넓은 폭의 읽는 순서와 같고, 좁은 폭에서 지도를 맨 위로
  올리는 일은 grid-area 가 한다. 지도는 포커스되지 않아 Tab 순서가 어긋나지 않는다.
*/
const COLUMNS_AREAS: Record<
  ColumnsLayout,
  {
    narrow: string
    middle: string
    middleColumns: string
    wide: string
    wideColumns: string
  }
> = {
  dual: {
    narrow: "'map' 'view' 'metric'",
    middle: "'map map' 'view metric'",
    middleColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
    wide: "'view map metric'",
    wideColumns: 'minmax(0, 1fr) minmax(0, 1.15fr) minmax(0, 1fr)',
  },
  metricOnly: {
    narrow: "'map' 'metric'",
    middle: "'map' 'metric'",
    middleColumns: 'minmax(0, 1fr)',
    wide: "'map metric'",
    wideColumns: 'minmax(0, 1.15fr) minmax(0, 1fr)',
  },
  viewOnly: {
    narrow: "'map' 'view'",
    middle: "'map' 'view'",
    middleColumns: 'minmax(0, 1fr)',
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

  @media (min-width: 901px) and (max-width: 1199px) {
    grid-template-columns: ${p => COLUMNS_AREAS[p.$layout].middleColumns};
    grid-template-areas: ${p => COLUMNS_AREAS[p.$layout].middle};
  }

  @media (min-width: 1200px) {
    grid-template-columns: ${p => COLUMNS_AREAS[p.$layout].wideColumns};
    grid-template-areas: ${p => COLUMNS_AREAS[p.$layout].wide};
    gap: 32px;
  }
`

const Column = styled.div<{ $area: 'view' | 'metric' }>`
  grid-area: ${p => p.$area};
  min-width: 0;
  display: grid;
  gap: 12px;
`

/*
  지도 칸. 901~1199 에서는 두 목록 위에 최대 560px 로 가운데 서고, 3칸 배치에서는 목록 높이 안에서
  세로 가운데에 선다. 상자는 800:620 비율로 자리를 먼저 잡는다(MapSvg aspect-ratio) — 스켈레톤
  실루엣과 크기가 같아 데이터가 와도 튀지 않는다(D2-9).
*/
const MapCell = styled.div`
  grid-area: map;
  min-width: 0;
  width: 100%;

  @media (min-width: 901px) and (max-width: 1199px) {
    max-width: 560px;
    justify-self: center;
  }

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
  높이를 잡아 데이터가 와도 아래 섹션을 밀지 않는다. 많이 본 8행 · 지표 5행이다.
*/
const SkeletonPanel = styled.div<{ $area: 'view' | 'metric'; $rows: number }>`
  grid-area: ${p => p.$area};
  min-height: ${p => 44 + p.$rows * 52 + (p.$rows - 1) + 2}px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  background: var(--color-surface);
`

/*
  상태별 두 줄 문구(ranking-minimum-sample D4-2). 각 상태에서 **참인 문장**만 쓴다 —
  좌측 열이 없는데 「많이 본」을 약속하지 않는다.
*/
const COPY = {
  dual: {
    eyebrow: '지금 많이 본 지역',
    title: '다른 사람들이 보는 곳과, 숫자가 좋은 곳은 달라요.',
  },
  metricOnly: {
    eyebrow: '자치구 지표 순위',
    title: '유동인구·매출·개업 수로 자치구를 비교해요.',
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
            <RankingMiniMap layers={null} />
          </MapCell>
          <SkeletonPanel $area="metric" $rows={RANKING_METRIC_TOP_N} />
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
        {...rowHoverProps}
      />
    </Column>
  ) : null

  // A. 세 지표 중 하나라도 데이터가 있으면 토글은 항상 낸다 — 선택된 지표만
  // 비었을 때는 토글이 아니라 그 자리에 짧은 안내만 낸다.
  const metricColumn = hasMetricData ? (
    <Column $area="metric" data-rank-column="metric">
      <ColumnHeader>
        <ColumnHeading>
          {activeMetric?.label ?? homeMetricLabel(metric)} 상위 자치구
        </ColumnHeading>
        <MetricToggleGroup
          options={HOME_METRICS}
          value={metric}
          getLabel={homeMetricLabel}
          onChange={changeMetric}
          ariaLabel="지표 선택"
        />
      </ColumnHeader>
      {activeMetric && activeMetric.items.length > 0 ? (
        <RankBarList
          rows={metricRows}
          ariaLabel={`${activeMetric.label} 상위 자치구 순위`}
          highlightKey={highlightKey}
          currentKey={currentKey}
          variant="card"
          {...rowHoverProps}
        />
      ) : (
        <MetricEmptyNotice>이 지표는 아직 집계가 없어요.</MetricEmptyNotice>
      )}
    </Column>
  ) : null

  const layout: ColumnsLayout =
    viewColumn && metricColumn ? 'dual' : viewColumn ? 'viewOnly' : 'metricOnly'
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
        {viewColumn && metricColumn ? (
          <InsightSlot $visible={insight !== null} aria-live="polite">
            {insight?.sentence ?? null}
          </InsightSlot>
        ) : null}
        <Columns ref={columnsRef} $layout={layout}>
          {viewColumn}
          <MapCell>
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
          {metricColumn}
          <RankingConnector
            containerRef={columnsRef}
            mapSvgRef={mapSvgRef}
            activeCode={activeCode}
            enabled={connectorAllowed && mapIntroDone}
            revision={[
              metric,
              viewRows.map(row => row.key).join(','),
              metricRows.map(row => row.key).join(','),
            ].join('|')}
            badgeCodes={mapLayers.badges.map(badge => badge.code)}
          />
        </Columns>
      </Inner>
    </Section>
  )
}
