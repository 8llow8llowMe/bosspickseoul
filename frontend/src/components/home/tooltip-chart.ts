export type TooltipChartPoint = { x: number; y: number }

export type TooltipAreaChart = {
  linePath: string
  areaPath: string
  lastPoint: TooltipChartPoint
}

const round = (value: number): number => Math.round(value * 100) / 100

/**
 * Fritsch–Carlson monotone-cubic tangents for a set of points.
 * Prevents the curve from overshooting past neighboring data points
 * (unlike a plain Catmull-Rom spline), which keeps a small sparkline-sized
 * chart from producing visible bumps above/below the real values.
 */
function monotoneTangents(points: TooltipChartPoint[]): number[] {
  const n = points.length
  const secants: number[] = new Array(n - 1).fill(0)
  for (let i = 0; i < n - 1; i++) {
    const dx = points[i + 1].x - points[i].x
    secants[i] = dx === 0 ? 0 : (points[i + 1].y - points[i].y) / dx
  }

  const tangents: number[] = new Array(n).fill(0)
  tangents[0] = secants[0] ?? 0
  tangents[n - 1] = secants[n - 2] ?? 0
  for (let i = 1; i < n - 1; i++) {
    const prev = secants[i - 1]
    const curr = secants[i]
    if (prev === 0 || curr === 0 || prev > 0 !== curr > 0) {
      tangents[i] = 0
    } else {
      tangents[i] = (prev + curr) / 2
    }
  }

  // Limiter step: clamps each tangent so the resulting Bezier segment stays
  // monotone between its two endpoints (no overshoot past the data).
  for (let i = 0; i < n - 1; i++) {
    const dk = secants[i]
    if (dk === 0) {
      tangents[i] = 0
      tangents[i + 1] = 0
      continue
    }
    const alpha = tangents[i] / dk
    const beta = tangents[i + 1] / dk
    const dist = alpha * alpha + beta * beta
    if (dist <= 9) continue
    const tau = 3 / Math.sqrt(dist)
    tangents[i] = alpha * tau * dk
    tangents[i + 1] = beta * tau * dk
  }

  return tangents
}

function buildLinePath(points: TooltipChartPoint[]): string {
  const tangents = monotoneTangents(points)
  const commands = [`M ${points[0].x} ${points[0].y}`]
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i]
    const p1 = points[i + 1]
    const dx = (p1.x - p0.x) / 3
    const c1x = round(p0.x + dx)
    const c1y = round(p0.y + tangents[i] * dx)
    const c2x = round(p1.x - dx)
    const c2y = round(p1.y - tangents[i + 1] * dx)
    commands.push(`C ${c1x} ${c1y} ${c2x} ${c2y} ${p1.x} ${p1.y}`)
  }
  return commands.join(' ')
}

/**
 * Geometry for the hover-tooltip area chart: a smooth monotone-cubic line
 * through `values`, the same curve closed down to the chart's baseline
 * (bottom edge, y = height) for a fillable gradient area, and the final
 * data point for an end-of-line dot.
 *
 * Mirrors the min/max normalization used by `sparklinePath`
 * (src/components/home/sparkline.ts) and `miniAreaChartGeometry`
 * (src/components/home/mini-area-chart.tsx): y is scaled so the minimum
 * value sits at the baseline and the maximum sits at y=0, with a flat
 * series centered at height/2.
 */
export function tooltipAreaChart(
  values: number[],
  width: number,
  height: number,
): TooltipAreaChart {
  if (values.length < 2) {
    return { linePath: '', areaPath: '', lastPoint: { x: 0, y: height / 2 } }
  }

  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min
  const stepX = width / (values.length - 1)

  const points: TooltipChartPoint[] = values.map((value, index) => {
    const x = index * stepX
    const y = span === 0 ? height / 2 : height - ((value - min) / span) * height
    return { x: round(x), y: round(y) }
  })

  const linePath = buildLinePath(points)
  const baseline = height
  const firstPoint = points[0]
  const lastPoint = points[points.length - 1]
  const areaPath = `${linePath} L ${lastPoint.x} ${baseline} L ${firstPoint.x} ${baseline} Z`

  return { linePath, areaPath, lastPoint }
}
