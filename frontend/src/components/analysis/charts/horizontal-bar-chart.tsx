'use client'

import styled from 'styled-components'
import {
  Bar,
  BarChart as ReBarChart,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { computeNiceYScale } from '@/lib/analysis/chart-scale'
import type { AnalysisMetricRow } from '@/lib/analysis/presentation'
import {
  CHART_COLORS,
  ChartTooltipContent,
  createAxisTickFormatter,
} from './chart-theme'

const Empty = styled.p`
  padding: 24px 0;
  color: var(--color-text-600);
  font-size: 13px;
  text-align: center;
`

/**
 * 막대 **두께**는 `maxBarSize` 로 26px 에 묶여 있는데 **길이**에는 상한이 없어서,
 * `ResponsiveContainer width="100%"` 가 넓은 칸을 만나면 가로세로비가 무너진다
 * (실측: `/status` 「업종별 점포수」가 폭 1016px 칸에서 막대 800px · 약 31:1).
 * 그러면 왼쪽 라벨과 오른쪽 값이 멀어져 **어느 라벨의 값인지 눈으로 잇기 어렵다.**
 *
 * 그래서 차트 폭 자체에 상한을 둔다. 좁은 칸에서는 아무 영향이 없고(그대로 100%),
 * 넓은 칸에서만 왼쪽 정렬로 멈춘다.
 */
const CHART_MAX_WIDTH = 560

const Bounded = styled.div<{ $maxWidth: number }>`
  width: 100%;
  max-width: ${props => props.$maxWidth}px;
`

type CategoryTickProps = {
  hrefByLabel?: ReadonlyMap<string, string>
  x?: number
  y?: number
  payload?: { value?: string }
}

/**
 * Y축 카테고리 라벨. `href` 가 있는 항목은 **SVG 링크**로 그린다.
 *
 * recharts 는 라벨을 SVG 안에 그리므로 HTML `<a>` 를 쓸 수 없다. SVG `<a>` 는
 * 포커스를 받지 못하는 브라우저가 있어 `tabIndex` 를 직접 준다. 포커스 링도
 * SVG 에서는 `outline` 이 잘리는 경우가 있어 `stroke` 기반 규칙을 함께 둔다
 * (`chart-theme` 이 아니라 여기 두는 이유: 이 링크에만 해당한다).
 *
 * 명세 D6-2 — 이 셋은 **브라우저에서 실측해야 한다**: Tab 도달 · Enter 활성화 ·
 * 포커스 링 가시성. 하나라도 안 되면 명세 D8-2 의 대안으로 간다.
 */
function CategoryTick({ hrefByLabel, x, y, payload }: CategoryTickProps) {
  const label = payload?.value ?? ''
  const href = hrefByLabel?.get(label)
  const text = (
    <text
      x={x}
      y={y}
      dy={4}
      textAnchor="end"
      fill={href ? 'var(--color-primary-700)' : CHART_COLORS.axis}
      fontSize={12}
    >
      {label}
    </text>
  )

  if (!href) return text

  return (
    <a
      href={href}
      tabIndex={0}
      className="chart-category-link"
      aria-label={`${label} 상권분석으로 이동`}
      /*
        Enter 활성화를 **방어적으로 직접 잇는다.**

        검증된 것: Tab 도달 · 포커스 링 · 마우스 클릭 이동(전부 브라우저 실측).
        검증하지 못한 것: **진짜 Enter 키.** 자동화가 keydown 을 보내면서 `key` 를 빈
        문자열로 실어 보내(실측) 네이티브 동작을 가릴 수 없었다. SVG 앵커의 Enter 처리는
        브라우저마다 다르다고 알려져 있어, 안 되는 쪽을 가정하고 직접 잇는다.
        네이티브가 이미 동작하는 브라우저에서도 `preventDefault` 로 중복 이동을 막는다.

        `assign` 을 쓰는 이유: 마우스 클릭도 SVG 앵커라 Next 라우터를 타지 않고 전체
        로드다 — 둘의 동작이 어긋나지 않는다. (`useRouter` 를 쓰면 이 컴포넌트를 함수로
        직접 호출하는 차트 테스트 관례가 깨진다.)
      */
      onKeyDown={event => {
        if (event.key !== 'Enter') return
        event.preventDefault()
        window.location.assign(href)
      }}
    >
      {text}
    </a>
  )
}

export type HorizontalBarChartProps = {
  items: readonly AnalysisMetricRow[]
  unit: string
  ariaLabel: string
  /** Colors bars by sign (positive vs negative) instead of the primary series color. */
  diverging?: boolean
  /** Per-row height in px (drives the chart's total height). Default 34. */
  rowHeight?: number
  /**
   * Width reserved for the category (label) axis. If omitted, it auto-fits the
   * longest label so short labels (예: "반찬가게") don't leave a wide left gap.
   */
  yAxisWidth?: number
  /** Formats the value label drawn at the end of each bar. Defaults to a compact 만/억 tick. */
  valueFormatter?: (value: number) => string
  /**
   * 차트 폭 상한(px). 기본 {@link CHART_MAX_WIDTH}. 넓은 칸에서 막대가 한없이 길어져
   * 라벨과 값이 멀어지는 것을 막는다. 좁은 칸에서는 영향이 없다.
   */
  maxWidth?: number
}

/**
 * 가로 막대 차트. 카테고리(업종·행정동 등 긴 한글 라벨)를 왼쪽 축에 두어
 * 세로 막대보다 라벨이 겹치지 않고, 순위/증감 비교에 적합하다.
 */
export default function HorizontalBarChart({
  items,
  unit,
  ariaLabel,
  diverging = false,
  rowHeight = 34,
  yAxisWidth,
  valueFormatter,
  maxWidth = CHART_MAX_WIDTH,
}: HorizontalBarChartProps) {
  const hasData = items.some(item => typeof item.value === 'number')
  if (!hasData) return <Empty>데이터 없음</Empty>

  const values = items.map(item => item.value)
  const scale = computeNiceYScale(values)
  const domain: [number, number] = diverging
    ? scale.domain
    : [0, scale.domain[1]]
  /*
    막대 값 라벨도 **한 단위로 통일**한다. 값마다 따로 고르면 같은 목록에서 「1.2만」과
    「9,800」이 나란히 놓여 어느 쪽이 큰지 눈으로 못 비교한다(축 눈금과 같은 문제).
  */
  const formatLabel = valueFormatter ?? createAxisTickFormatter(values)
  // 라벨 축 폭: 지정이 없으면 가장 긴 라벨 길이에 맞춰(한글 ≈ 13px/자) 자동 산정해
  // 짧은 라벨에서 왼쪽 여백이 과하게 벌어지는 문제를 없앤다. 52~140px로 제한.
  const longestLabelLength = items.reduce(
    (max, item) => Math.max(max, item.label.length),
    0,
  )
  const axisWidth =
    yAxisWidth ?? Math.min(140, Math.max(52, longestLabelLength * 13 + 8))
  const height = Math.max(120, items.length * rowHeight + 24)
  /*
    recharts 의 tick 렌더러는 라벨 문자열만 받는다. 링크를 되찾으려면 라벨로 찾아야
    한다 — 같은 차트 안에서 행정동·업종 이름이 겹치는 경우는 없다(각각 Top 5 목록).
  */
  const hrefByLabel = new Map(
    items.flatMap(item =>
      item.href ? [[item.label, item.href] as const] : [],
    ),
  )
  const hasAnyHref = hrefByLabel.size > 0
  /*
    값 라벨을 **미리 계산해 데이터에 넣는다.** `LabelList` 의 `formatter` 는 행 인덱스를
    안정적으로 주지 않아 `subLabel` 을 행에 맞춰 붙일 수 없다. `dataKey` 로 읽게 하면
    recharts 의 포매터 타입과 싸울 일도 없다.
  */
  const chartData = items.map(item => ({
    ...item,
    valueLabel:
      typeof item.value === 'number'
        ? item.subLabel
          ? `${formatLabel(item.value)} · ${item.subLabel}`
          : formatLabel(item.value)
        : '',
  }))

  return (
    <Bounded $maxWidth={maxWidth}>
      <ResponsiveContainer
        width="100%"
        height={height}
        initialDimension={{ width: 300, height }}
        role="img"
        aria-label={ariaLabel}
      >
        <ReBarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 4, right: 52, bottom: 4, left: 8 }}
        >
          <XAxis type="number" domain={domain} hide />
          <YAxis
            type="category"
            dataKey="label"
            width={axisWidth}
            tick={
              hasAnyHref ? (
                <CategoryTick hrefByLabel={hrefByLabel} />
              ) : (
                { fill: CHART_COLORS.axis, fontSize: 12 }
              )
            }
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            content={
              <ChartTooltipContent
                unit={unit}
                valueFormatter={valueFormatter}
              />
            }
            cursor={{ fill: 'var(--color-primary-100)' }}
          />
          <Bar
            dataKey="value"
            name="값"
            radius={[0, 4, 4, 0]}
            maxBarSize={26}
            isAnimationActive={false}
          >
            {items.map((item, index) => (
              <Cell
                key={`${item.label}-${index}`}
                fill={
                  diverging
                    ? (item.value ?? 0) < 0
                      ? CHART_COLORS.negative
                      : CHART_COLORS.positive
                    : CHART_COLORS.seriesPrimary
                }
              />
            ))}
            <LabelList
              dataKey="valueLabel"
              position="right"
              style={{
                fill: 'var(--color-text-700)',
                fontSize: 11,
                fontVariantNumeric: 'tabular-nums',
              }}
            />
          </Bar>
        </ReBarChart>
      </ResponsiveContainer>
    </Bounded>
  )
}
