'use client'

import { RotateCcw } from 'lucide-react'
import styled from 'styled-components'
import {
  Line,
  LineChart as ReLineChart,
  ResponsiveContainer,
  YAxis,
} from 'recharts'

import {
  CHART_COLORS,
  formatChartValue,
} from '@/components/analysis/charts/chart-theme'
import { Button } from '@/components/ui/button'
import { isRetryable, type NormalizedApiError } from '@/lib/api/api-error'
import type { TrendPoint } from '@/lib/analysis/chart-data'
import {
  describeLatestChange,
  type TrendDirection,
} from '@/lib/analysis/chart-insights'
import {
  CHANGE_TONE_TEXT_COLOR,
  describeChangeTone,
  resolveDirectionChangeTone,
  type ChangeTone,
  type MetricPolarity,
} from '@/lib/metrics/metric-polarity'
import TermHelp from '@/components/analysis/term-help'

/*
  트렌드 그룹을 **카드 하나**로 묶는다. 예전에는 매출·유동인구·점포 변화가 축 달린 꺾은선
  카드 세 장이었는데, 4개 점짜리 선을 읽으려고 카드 세 장을 훑어야 했고 점포 수처럼 변화가
  없는 지표는 평평한 선 하나로 카드 한 장을 썼다.

  한 줄에 [지표·현재값][직전 분기 대비 문장·분기별 값][스파크라인] 을 둔다. 분기별 값을
  글자로도 적어 hover 가 없는 터치 화면에서도 값을 읽을 수 있게 한다.
*/

const List = styled.ul`
  display: grid;
`

const Row = styled.li`
  display: grid;
  grid-template-columns: minmax(120px, 160px) minmax(0, 1fr) minmax(
      120px,
      200px
    );
  align-items: center;
  gap: 8px 20px;
  padding: 16px 0;
  border-top: 1px solid var(--color-border-200);

  &:first-child {
    border-top: 0;
    padding-top: 0;
  }

  &:last-child {
    padding-bottom: 0;
  }

  @media (max-width: 640px) {
    grid-template-columns: minmax(0, 1fr) minmax(96px, 128px);
    grid-template-areas:
      'metric spark'
      'change change';
  }
`

const Metric = styled.div`
  display: grid;
  gap: 2px;

  @media (max-width: 640px) {
    grid-area: metric;
  }

  > div {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0 4px;
    color: var(--color-text-600);
    font-size: 13px;
    line-height: 20px;
  }

  strong {
    color: var(--color-text-900);
    font-size: 18px;
    font-weight: 700;
    line-height: 26px;
    font-variant-numeric: tabular-nums;
  }
`

const Change = styled.div`
  display: grid;
  gap: 4px;
  min-width: 0;

  @media (max-width: 640px) {
    grid-area: change;
  }

  p {
    display: flex;
    align-items: baseline;
    gap: 6px;
    color: var(--color-text-800);
    font-size: 14px;
    font-weight: 600;
    line-height: 21px;
  }

  /* 방향 기호(▲▼–). 색은 좋고 나쁨을 따른다(D-1) — 판단하지 않으면 무채색이다. */
  p > span[aria-hidden='true'] {
    font-size: 11px;
  }

  small {
    color: var(--color-text-caption);
    font-size: 12px;
    line-height: 18px;
    font-variant-numeric: tabular-nums;
  }
`

/** 기호와 「개선/악화」 글자에만 색을 싣는다. 문장은 본문 색이라 길어도 읽기 쉽다. */
const Toned = styled.span<{ $tone: ChangeTone }>`
  color: ${props => CHANGE_TONE_TEXT_COLOR[props.$tone]};
`

/** 화면에는 안 보이고 스크린리더만 읽는 구분. 문장과 「개선/악화」가 이어 붙어 읽히지 않게 한다. */
const ReaderPause = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
`

const ToneLabel = styled.em<{ $tone: ChangeTone }>`
  flex: none;
  color: ${props => CHANGE_TONE_TEXT_COLOR[props.$tone]};
  font-size: 12px;
  font-style: normal;
  font-weight: 700;
`

const Spark = styled.div`
  @media (max-width: 640px) {
    grid-area: spark;
  }
`

const Muted = styled.p`
  color: var(--color-text-600);
  font-size: 13px;
`

const SYMBOL = { INCREASE: '▲', DECREASE: '▼', STAGNANT: '–' } as const

/**
 * 직전 분기 대비 방향 → 색과 판단 글자. 보합 판정(±1%)은 `describeLatestChange` 가 이미 했으므로
 * 방향만 본다 — 문장이 「거의 같아요」인데 색이 「개선」이면 서로 다르게 말한다.
 */
export const resolveTrendChangeTone = (
  direction: TrendDirection | null,
  polarity: MetricPolarity | null | undefined,
): { tone: ChangeTone; label: string } => {
  const tone = resolveDirectionChangeTone(direction, polarity ?? null)
  return { tone, label: describeChangeTone(tone) }
}

export type TrendSummaryItem = {
  key: string
  /** 지표 이름(「매출」). */
  label: string
  /** 문장 주어(조사 포함, 「매출이」). */
  subject: string
  unit: string
  points: TrendPoint[]
  /**
   * 지표 극성(`ANALYSIS_TREND_POLARITY`). 직전 분기 대비 방향을 **좋고 나쁨으로** 칠하는 데 쓴다
   * (DESIGN.md §Charts, D-1). 없거나 중립이면 기호·문장 모두 무채색이고 「개선/악화」를 적지 않는다.
   */
  polarity?: MetricPolarity | null
  /** 지표 이름 옆 용어 도움말(#564). 없으면 버튼을 두지 않는다. */
  definition?: string
  /**
   * 이 지표 조회의 오류. 카드 하나로 합쳤으므로 오류도 **행 단위**로 보여 준다 — 하나만 실패한
   * 지표를 「값 없음」으로 그리면 일시 오류가 「이 상권엔 데이터가 없다」로 읽힌다.
   */
  error?: NormalizedApiError | null
  onRetry?: () => void
}

export type TrendSectionState = {
  loading: boolean
  error: NormalizedApiError | null
  empty: boolean
}

/**
 * 세 지표 조회를 카드 하나의 상태로 합친다.
 *
 * - 하나라도 불러오는 중이면 loading(세 쿼리는 트렌드 그룹이 활성화될 때 함께 나간다).
 * - 보여 줄 값이 있는 지표가 **하나도 없고** 오류가 있으면 섹션 오류. 재시도할 수 있는 오류를
 *   먼저 골라 재시도 버튼이 숨지 않게 한다.
 * - 그 밖에 값이 있는 지표가 없으면 empty. 값이 하나라도 있으면 행 단위로 그린다(실패한 행은
 *   행 안에서 오류와 재시도를 보여 준다).
 */
export const resolveTrendSectionState = (
  items: readonly {
    pending: boolean
    error: NormalizedApiError | null
    hasData: boolean
  }[],
): TrendSectionState => {
  if (items.some(item => item.pending))
    return { loading: true, error: null, empty: false }
  const anyData = items.some(item => item.hasData)
  const errors = items
    .map(item => item.error)
    .filter((error): error is NormalizedApiError => error !== null)
  if (!anyData && errors.length > 0) {
    const retryable = errors.find(error => isRetryable(error.kind))
    return { loading: false, error: retryable ?? errors[0], empty: false }
  }
  return { loading: false, error: null, empty: !anyData }
}

/** 받침이 있으면 「으로」, 없거나 ㄹ 받침이면 「로」. 숫자·기호로 끝나면 「로」. */
export const withRo = (word: string): string => {
  const code = word.charCodeAt(word.length - 1) - 0xac00
  if (code < 0 || code > 11171) return `${word}로`
  const jong = code % 28
  return jong === 0 || jong === 8 ? `${word}로` : `${word}으로`
}

/**
 * 모든 값이 같으면 「점포 수가 4분기째 10개로 같아요」. 평평한 선은 아무 말도 하지 않으므로
 * 이때는 스파크라인을 그리지 않는다.
 */
export const describeFlatTrend = (
  points: readonly TrendPoint[],
  subject: string,
  unit: string,
): string | null => {
  const values = points.map(point => point.value)
  if (values.length < 2 || values.some(value => typeof value !== 'number'))
    return null
  const first = values[0] as number
  if (!values.every(value => value === first)) return null
  return `${subject} ${values.length}분기째 ${withRo(formatChartValue(first, unit))} 같아요`
}

/** 표시용 축약 분기(「2025년 2분기」 → 「25년 2분기」). 값 줄에서 칸을 아낀다. */
export const shortPeriod = (label: string): string => {
  const match = /^\d{2}(\d{2})년 (\d)분기$/.exec(label)
  return match ? `${match[1]}년 ${match[2]}분기` : label
}

/**
 * 스파크라인 세로 범위. 축이 없으므로 데이터 범위에 딱 맞추면 0.03% 변화도 48px 를 다 쓰는
 * 급경사로 그려져 「거의 같아요」 문장과 반대로 말한다. 범위가 평균의 ±5%(합 10%)보다 좁으면
 * 평균을 가운데 두고 그만큼 넓힌다.
 */
export const sparklineDomain = (
  values: readonly (number | null)[],
): [number, number] => {
  const nums = values.filter(
    (value): value is number =>
      typeof value === 'number' && Number.isFinite(value),
  )
  if (nums.length === 0) return [0, 1]
  const min = Math.min(...nums)
  const max = Math.max(...nums)
  const mean = nums.reduce((sum, value) => sum + value, 0) / nums.length
  const minSpan = Math.abs(mean) * 0.1
  if (max - min >= minSpan && max > min) return [min, max]
  const half = Math.max(minSpan, 1) / 2
  const center = (min + max) / 2
  return [center - half, center + half]
}

function Sparkline({ points, label }: { points: TrendPoint[]; label: string }) {
  const domain = sparklineDomain(points.map(point => point.value))
  const lastIndex = points.length - 1
  return (
    <div role="img" aria-label={`${label} 분기별 추이 선`}>
      <ResponsiveContainer
        width="100%"
        height={48}
        initialDimension={{ width: 160, height: 48 }}
      >
        <ReLineChart
          data={points}
          margin={{ top: 6, right: 6, bottom: 6, left: 6 }}
        >
          <YAxis hide domain={domain} />
          <Line
            // 4개 점 사이를 곡선으로 이으면 점 사이에 없는 굴곡이 생긴다. 직선으로 잇는다.
            type="linear"
            dataKey="value"
            stroke={CHART_COLORS.seriesPrimary}
            strokeWidth={2}
            connectNulls
            isAnimationActive={false}
            dot={props => {
              const { cx, cy, index } = props as {
                cx?: number
                cy?: number
                index?: number
              }
              if (typeof cx !== 'number' || typeof cy !== 'number')
                return <g key={index} />
              return (
                <circle
                  key={index}
                  cx={cx}
                  cy={cy}
                  r={index === lastIndex ? 4 : 2.5}
                  fill={
                    index === lastIndex
                      ? CHART_COLORS.seriesPrimary
                      : CHART_COLORS.surface
                  }
                  stroke={CHART_COLORS.seriesPrimary}
                  strokeWidth={1.5}
                />
              )
            }}
          />
        </ReLineChart>
      </ResponsiveContainer>
    </div>
  )
}

export default function AnalysisTrendSummary({
  items,
}: {
  items: readonly TrendSummaryItem[]
}) {
  return (
    <List>
      {items.map(item => {
        const numeric = item.points.filter(
          point => typeof point.value === 'number',
        )
        const latest = item.points[item.points.length - 1]
        if (item.error && numeric.length === 0) {
          return (
            <Row key={item.key}>
              <Metric>
                <div>{item.label}</div>
                <strong>-</strong>
              </Metric>
              <Change>
                <Muted role="alert">
                  {item.label} 정보를 불러오지 못했어요.
                </Muted>
                {item.onRetry && isRetryable(item.error.kind) ? (
                  <div>
                    <Button
                      type="button"
                      size="medium"
                      variant="secondary"
                      leftIcon={<RotateCcw />}
                      onClick={item.onRetry}
                    >
                      다시 시도
                    </Button>
                  </div>
                ) : null}
              </Change>
            </Row>
          )
        }
        if (numeric.length === 0) {
          return (
            <Row key={item.key}>
              <Metric>
                <div>{item.label}</div>
                <strong>데이터 없음</strong>
              </Metric>
              <Change>
                <Muted>이 조건에서 제공되는 분기별 값이 없어요.</Muted>
              </Change>
            </Row>
          )
        }
        const flat = describeFlatTrend(item.points, item.subject, item.unit)
        const change = flat
          ? null
          : describeLatestChange(item.points, item.subject)
        const changeTone = resolveTrendChangeTone(
          change?.direction ?? null,
          item.polarity,
        )
        return (
          <Row key={item.key}>
            <Metric>
              <div>
                <span>
                  {item.label}
                  {latest ? ` · ${shortPeriod(latest.periodLabel)}` : ''}
                </span>
                {item.definition ? (
                  <TermHelp label={item.label} definition={item.definition} />
                ) : null}
              </div>
              <strong>
                {formatChartValue(latest?.value ?? null, item.unit)}
              </strong>
            </Metric>
            <Change>
              <p>
                {flat ? (
                  <>
                    <span aria-hidden="true">{SYMBOL.STAGNANT}</span>
                    {flat}
                  </>
                ) : change ? (
                  <>
                    <Toned $tone={changeTone.tone} aria-hidden="true">
                      {SYMBOL[change.direction]}
                    </Toned>
                    <span>
                      {change.sentence}
                      {changeTone.label ? <ReaderPause>, </ReaderPause> : null}
                    </span>
                    {changeTone.label ? (
                      <ToneLabel $tone={changeTone.tone}>
                        {changeTone.label}
                      </ToneLabel>
                    ) : null}
                  </>
                ) : (
                  '직전 분기와 비교할 값이 없어요'
                )}
              </p>
              <small>
                {item.points
                  .map(
                    point =>
                      `${shortPeriod(point.periodLabel)} ${formatChartValue(point.value, item.unit)}`,
                  )
                  .join(' → ')}
              </small>
            </Change>
            <Spark>
              {flat || numeric.length < 2 ? null : (
                <Sparkline points={item.points} label={item.label} />
              )}
            </Spark>
          </Row>
        )
      })}
    </List>
  )
}
