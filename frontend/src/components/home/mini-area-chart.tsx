import { useId } from 'react'

const WIDTH = 600
const HEIGHT = 140
const CHART_TOP = 14
const CHART_BOTTOM = 28
const CHART_SIDE = 10

const DEFAULT_LABELS = [
  '6개월 전',
  '5개월 전',
  '4개월 전',
  '3개월 전',
  '2개월 전',
  '이번 달',
]

export type MiniAreaChartGeometry = {
  points: { x: number; y: number }[]
  linePoints: string
  areaPath: string
  baselineY: number
  chartLeft: number
  chartRight: number
}

export function miniAreaChartGeometry(
  values: number[],
  width: number = WIDTH,
  height: number = HEIGHT,
): MiniAreaChartGeometry {
  const chartLeft = CHART_SIDE
  const chartRight = width - CHART_SIDE
  const chartWidth = chartRight - chartLeft
  const chartTop = CHART_TOP
  const baselineY = height - CHART_BOTTOM
  const chartHeight = baselineY - chartTop

  if (values.length < 2) {
    return {
      points: [],
      linePoints: '',
      areaPath: '',
      baselineY,
      chartLeft,
      chartRight,
    }
  }

  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min
  const stepX = chartWidth / (values.length - 1)

  const points = values.map((value, index) => {
    const x = chartLeft + index * stepX
    const y =
      span === 0
        ? chartTop + chartHeight / 2
        : baselineY - ((value - min) / span) * chartHeight
    return { x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100 }
  })

  const linePoints = points.map(p => `${p.x},${p.y}`).join(' ')
  const firstPoint = points[0]
  const lastPoint = points[points.length - 1]
  const areaPath = [
    `M ${firstPoint.x} ${baselineY}`,
    ...points.map(p => `L ${p.x} ${p.y}`),
    `L ${lastPoint.x} ${baselineY}`,
    'Z',
  ].join(' ')

  return { points, linePoints, areaPath, baselineY, chartLeft, chartRight }
}

type MiniAreaChartProps = {
  values: number[]
  labels?: string[]
  className?: string
}

export default function MiniAreaChart({
  values,
  labels = DEFAULT_LABELS,
  className,
}: MiniAreaChartProps) {
  const gradientId = useId()

  if (values.length < 2) return null

  const geometry = miniAreaChartGeometry(values)
  const lastPoint = geometry.points[geometry.points.length - 1]

  return (
    <svg
      className={className}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      width="100%"
      height="auto"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.22" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <line
        x1={geometry.chartLeft}
        y1={geometry.baselineY}
        x2={geometry.chartRight}
        y2={geometry.baselineY}
        stroke="var(--color-border-200)"
        strokeWidth={1}
      />
      <path d={geometry.areaPath} fill={`url(#${gradientId})`} />
      <polyline
        points={geometry.linePoints}
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {lastPoint ? (
        <circle cx={lastPoint.x} cy={lastPoint.y} r={4} fill="currentColor" />
      ) : null}
      {geometry.points.map((point, index) => {
        const label = labels[index]
        if (label === undefined) return null
        const textAnchor =
          index === 0
            ? 'start'
            : index === geometry.points.length - 1
              ? 'end'
              : 'middle'
        return (
          <text
            key={label}
            x={point.x}
            y={HEIGHT - 8}
            textAnchor={textAnchor}
            fontSize={11}
            fill="var(--color-text-caption)"
          >
            {label}
          </text>
        )
      })}
    </svg>
  )
}
