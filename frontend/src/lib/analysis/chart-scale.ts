// Nice-number axis: zooms into clustered data (non-zero baseline) but keeps 0 when data spans a wide range.
const niceNum = (range: number, round: boolean): number => {
  const exponent = Math.floor(Math.log10(range))
  const fraction = range / 10 ** exponent
  let niceFraction: number
  if (round) {
    niceFraction = fraction < 1.5 ? 1 : fraction < 3 ? 2 : fraction < 7 ? 5 : 10
  } else {
    niceFraction =
      fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10
  }
  return niceFraction * 10 ** exponent
}

export type NiceYScale = { domain: [number, number]; ticks: number[] }

export const computeNiceYScale = (
  values: readonly (number | null | undefined)[],
  tickCount = 5,
): NiceYScale => {
  const nums = values.filter(
    (v): v is number => typeof v === 'number' && Number.isFinite(v),
  )
  if (nums.length === 0) return { domain: [0, 1], ticks: [0, 1] }
  let min = Math.min(...nums)
  let max = Math.max(...nums)
  if (min === max) {
    if (min === 0) return { domain: [0, 1], ticks: [0, 1] }
    const pad = Math.abs(min) * 0.1
    min -= pad
    max += pad
  }
  const range = niceNum(max - min || 1, false)
  const step = niceNum(range / Math.max(1, tickCount - 1), true)
  const niceMin = Math.floor(min / step) * step
  const niceMax = Math.ceil(max / step) * step
  const ticks: number[] = []
  for (let t = niceMin; t <= niceMax + step / 2; t += step) {
    ticks.push(Math.round(t))
  }
  return { domain: [niceMin, niceMax], ticks }
}
