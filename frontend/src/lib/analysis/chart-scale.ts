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
  let step = niceNum(range / Math.max(1, tickCount - 1), true)
  // 눈금은 데이터 정밀도보다 촘촘해지지 않는다.
  // 값이 모두 정수면 step 을 최소 1로 유지해 눈금 중복을 막는다.
  if (nums.every(v => Number.isInteger(v))) step = Math.max(step, 1)
  const decimals = Math.min(20, Math.max(0, -Math.floor(Math.log10(step))))
  const trimStepNoise = (v: number): number => Number(v.toFixed(decimals))
  // 0.3 / 0.1 이 2.9999... 로 떨어지는 나눗셈 오차를 눈금 경계로 되돌린다.
  const stepIndexOf = (v: number): number => {
    const quotient = v / step
    const nearest = Math.round(quotient)
    return Math.abs(quotient - nearest) < 1e-9 ? nearest : quotient
  }
  const niceMin = trimStepNoise(Math.floor(stepIndexOf(min)) * step)
  const niceMax = trimStepNoise(Math.ceil(stepIndexOf(max)) * step)
  const tickTotal = Math.max(1, Math.round((niceMax - niceMin) / step))
  const ticks = Array.from(
    new Set(
      Array.from({ length: tickTotal + 1 }, (_, i) =>
        trimStepNoise(niceMin + i * step),
      ),
    ),
  ).sort((a, b) => a - b)
  return { domain: [niceMin, niceMax], ticks }
}
