export function sparklinePath(
  values: number[],
  width: number,
  height: number,
): string {
  if (values.length < 2) return ''
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min
  const stepX = width / (values.length - 1)
  return values
    .map((v, i) => {
      const x = Math.round(i * stepX)
      const y = span === 0 ? height / 2 : height - ((v - min) / span) * height
      return `${x},${Math.round(y)}`
    })
    .join(' ')
}

type SparklineProps = {
  values: number[]
  width?: number
  height?: number
  className?: string
}

export default function Sparkline({
  values,
  width = 120,
  height = 32,
  className,
}: SparklineProps) {
  const points = sparklinePath(values, width, height)
  return (
    <svg
      className={className}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      aria-hidden="true"
      preserveAspectRatio="none"
    >
      <polyline
        points={points}
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
