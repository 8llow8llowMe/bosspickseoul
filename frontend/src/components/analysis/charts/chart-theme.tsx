'use client'

import styled from 'styled-components'

import { formatAnalysisValue } from '@/lib/analysis/presentation'

export const CHART_COLORS = {
  seriesPrimary: 'var(--color-primary-600)',
  seriesSecondary: 'var(--color-blue-500)',
  grid: 'var(--color-border-200)',
  axis: 'var(--color-text-caption)',
  surface: 'var(--color-surface)',
  border: 'var(--color-border-200)',
  positive: 'var(--color-positive)',
  negative: 'var(--color-negative)',
  /**
   * 성별 계열. 남성·여성을 primary·blue500 두 파랑으로 칠하면 명도·색상이 가까워 범례 없이는
   * 구분되지 않았다. 여성은 이미 정의돼 있던 `--color-chart-female` 을 쓴다.
   */
  male: 'var(--color-primary-600)',
  female: 'var(--color-chart-female)',
} as const

/**
 * 성별 조각 색을 **라벨로** 고른다. `toGenderSegments` 는 null 인 쪽을 빼므로 순서로 색을
 * 매기면 여성만 남은 도넛이 남성 색으로 칠해진다.
 */
export const genderColorsFor = (
  segments: readonly { label: string }[],
): string[] =>
  segments.map(segment =>
    segment.label === '여성' ? CHART_COLORS.female : CHART_COLORS.male,
  )

/**
 * Y 축 눈금 위에 붙이는 단위 표기. 눈금은 `8000만` 처럼 크기 단위만 갖고, 무엇을 센 값인지
 * (원·명·개)는 툴팁을 열어야 보였다. 막대·꺾은선 왼쪽 위에 한 번만 적는다.
 */
export const AxisUnitCaption = styled.p`
  height: 16px;
  margin: 0 0 4px;
  color: var(--color-text-caption);
  font-size: 11px;
  line-height: 16px;
`

/** {@link AxisUnitCaption} 이 차지하는 높이(16 + 아래 여백 4). 스켈레톤을 실제 차트에 맞출 때 쓴다. */
export const AXIS_UNIT_CAPTION_HEIGHT = 20

export const formatAxisUnitCaption = (unit: string): string | null =>
  unit && unit !== '%' ? `(${unit})` : null

type CategoryTickProps = {
  x?: number
  y?: number
  payload?: { value?: string | number }
  /** recharts 가 넘기는 축 폭과 그려지는 눈금 수. 눈금 하나가 쓸 수 있는 폭을 낸다. */
  width?: number
  visibleTicksCount?: number
  fontSize?: number
}

/** 한글은 1em, 그 밖(숫자·기호)은 약 0.62em 으로 어림한 글자 폭. */
const estimateTextWidth = (text: string, fontSize: number): number =>
  [...text].reduce(
    (sum, char) =>
      sum + (/[\u3131-\uD79D]/.test(char) ? fontSize : fontSize * 0.62),
    0,
  )

/**
 * 눈금 라벨이 칸 폭을 넘으면 두 줄로 접는다. 공백이 있으면 공백에서(「2025년」/「2분기」),
 * 없으면 물결표 뒤에서(「11~」/「14시」) 자른다. 접을 곳이 없으면 그대로 둔다.
 */
export const splitCategoryLabel = (
  label: string,
  maxWidth: number,
  fontSize = 12,
): string[] => {
  if (estimateTextWidth(label, fontSize) <= maxWidth) return [label]
  const space = label.indexOf(' ')
  if (space > 0) return [label.slice(0, space), label.slice(space + 1)]
  const tilde = label.indexOf('~')
  if (tilde > 0 && tilde < label.length - 1)
    return [label.slice(0, tilde + 1), label.slice(tilde + 1)]
  return [label]
}

/** 접힐 수 있는 라벨인가 — 공백이나 물결표가 있으면 두 줄이 될 수 있다. */
const isFoldable = (label: string): boolean => /[ ~]/.test(label)

/**
 * 칸이 좁을 때만 두 줄로 접는 X 축 눈금. recharts 의 자동 생략에 맡기면 「2025년 4분기」·
 * 「17~21시」 같은 라벨이 빠져 어느 점이 어느 분기·시간대인지 읽을 수 없었고, 생략을 끄면
 * 375px 에서 「00~06시06~11시」처럼 붙어 버렸다. `interval={0}` 으로 전부 그리고 칸 폭에
 * 맞춰 접는다.
 */
export function CategoryTick({
  x = 0,
  y = 0,
  payload,
  width,
  visibleTicksCount,
  fontSize = 12,
}: CategoryTickProps) {
  const label = String(payload?.value ?? '')
  // 이웃 라벨과 붙지 않게 칸 폭에서 4px 를 뺀다.
  const band =
    width && visibleTicksCount ? width / visibleTicksCount - 4 : Infinity
  const lines = splitCategoryLabel(label, band, fontSize)
  const lineHeight = fontSize + 2
  return (
    <text
      x={x}
      y={y}
      fill={CHART_COLORS.axis}
      fontSize={fontSize}
      textAnchor="middle"
    >
      {lines.map((line, index) => (
        <tspan
          key={`${line}-${index}`}
          x={x}
          dy={index === 0 ? fontSize : lineHeight}
        >
          {line}
        </tspan>
      ))}
    </text>
  )
}

/**
 * {@link CategoryTick} 가 차지할 X 축 높이. 접힐 수 있는 라벨이 있으면 두 줄 높이를 잡아
 * 라벨이 잘리지 않게 한다(실제로 접힐지는 렌더 폭이 정한다).
 */
export const categoryAxisHeight = (
  labels: readonly string[],
  fontSize = 12,
): number => fontSize + 8 + (labels.some(isFoldable) ? fontSize + 2 : 0)

export const formatChartValue = (
  value: number | null | undefined,
  unit = '',
): string => formatAnalysisValue(value, unit)

/** `toFixed` 결과에서 의미 없는 0 을 턴다. 1.50 → '1.5', 2.00 → '2'. */
const trimZeros = (text: string): string =>
  text.includes('.') ? text.replace(/\.?0+$/, '') : text

type AxisUnit = { divisor: number; suffix: string }

/**
 * 소수 자리 상한. 간격 기준을 만족하는 자리가 여기까지도 안 나오면(단위로 나눈 뒤
 * 간격이 1e-6 미만 — 억 축에서 눈금 간격 100원 아래) 포기한다. 6 은 가독 한계와
 * 탐색 종료를 위한 값이지 축 폭의 한계가 아니다 — `bar-chart`·`line-chart` 의 YAxis
 * 폭 44px 는 `1.0002만` 에서 이미 넘고, 그것은 이 변경 전에도 같았다.
 *
 * ⚠️ 상한에 걸려 떨어지면 라벨은 다시 겹칠 수 있다. 아래 `pickDecimals` 의 유일성
 * 논증은 허용 오차를 **만족한** 경우에만 성립한다.
 */
const MAX_AXIS_DECIMALS = 6

/**
 * 눈금 라벨이 **자기 눈금을 정확히 가리키는** 최소 소수 자리.
 *
 * ⚠️ 자리를 1 로 고정하면 서로 다른 눈금이 같은 글자가 된다. 분기별 추이 축이 실제로
 * **「1.4억 · 1.4억 · 1.5억 · 1.5억」**으로 그려졌다 — 눈금선은 네 개인데 읽을 수 있는
 * 값은 두 개뿐이라, 그 사이 값을 가늠할 수 없었다. 이 축은 자리를 2 로 늘려
 * 「1.4억 · 1.45억 · 1.5억 · 1.55억」이 된다.
 *
 * **「서로 다른 글자면 된다」로는 부족하다.** 눈금 `[0, 0.5억, 2.5억]` 은 소수 0 자리로도
 * 「0 · 1억 · 3억」이라 다 다르지만, 0.5 를 1 로 적는 것은 **틀린 값**이다. 그래서
 * 기준을 반올림 오차로 둔다 — 오차가 **눈금 간격의 절반**보다 작아야 그 라벨이 옆
 * 눈금이 아니라 자기 눈금을 가리킨다.
 *
 * ⚠️ 자리 상한을 2 로 두면 그 기준을 못 맞추는 축이 생긴다(#319). `computeNiceYScale`
 * 이 눈금을 정수로 반올림하지 않게 된 뒤로 소수 눈금이 축까지 내려오고, 만·억으로
 * 나누면 정수 데이터도 소수가 된다 — 실측 `[10000.4, 10001.6]` 은 만으로 나눈 간격이
 * 0.00012 라 2 자리로는 둘 다 「1만」이었다. 그래서 상한을 {@link MAX_AXIS_DECIMALS}
 * 까지 열고 **간격이 요구하는 만큼만** 늘린다(간격 `g` 에 대한 닫힌 형태
 * `ceil(-log10(g))` 와 같은 값이지만, 이 탐색은 `1.05`·`1.15` 처럼 경계에 걸린 값의
 * 부동소수 반올림까지 실제로 확인한다).
 *
 * 오차가 간격의 절반보다 **작다**는 것은 서로 다른 눈금의 라벨이 서로 다르다는 뜻이기도
 * 하다: `b - a ≥ g` 이고 두 반올림 오차가 각각 `g/2` 미만이면 반올림 결과의 차가 0 보다
 * 크다. 라벨 유일성 불변식은 여기서 나온다. 상한 {@link MAX_AXIS_DECIMALS} 까지 그
 * 조건을 못 맞추면 이 보장도 없다.
 */
const pickDecimals = (values: readonly number[], unit: AxisUnit): number => {
  const scaled = [...new Set(values)]
    .map(value => value / unit.divisor)
    .sort((a, b) => a - b)
  if (scaled.length < 2) return scaled.some(v => !Number.isInteger(v)) ? 1 : 0

  const minGap = scaled
    .slice(1)
    .reduce(
      (gap, value, index) => Math.min(gap, value - scaled[index]),
      Infinity,
    )
  // 간격이 0 이면(중복 눈금) 비교할 것이 없다.
  const tolerance = minGap > 0 ? minGap / 2 : Infinity

  for (let decimals = 0; decimals <= MAX_AXIS_DECIMALS; decimals += 1) {
    const worstError = scaled.reduce(
      (max, value) =>
        Math.max(max, Math.abs(Number(value.toFixed(decimals)) - value)),
      0,
    )
    if (worstError < tolerance) return decimals
  }

  return MAX_AXIS_DECIMALS
}

/** 값의 크기에 맞는 단위 하나. 1만 미만이면 단위 없이 콤마 표기다. */
const pickAxisUnit = (magnitude: number): AxisUnit => {
  if (magnitude >= 100_000_000) return { divisor: 100_000_000, suffix: '억' }
  if (magnitude >= 10_000) return { divisor: 10_000, suffix: '만' }
  return { divisor: 1, suffix: '' }
}

/**
 * 접미사 없는 경로가 `toLocaleString` 기본값으로 쓰는 소수 자리. ko-KR 기본이 3 자리다.
 * 자리를 이 아래로 **깎지 않는다** — 기존 라벨을 줄이는 것은 이 이슈의 범위가 아니고,
 * 필요보다 많은 자리는 유일성을 깨지 않는다(오차만 더 작아진다).
 */
const DEFAULT_PLAIN_DECIMALS = 3

const formatWithUnit = (
  value: number,
  unit: AxisUnit,
  decimals: number,
): string => {
  if (!Number.isFinite(value)) return ''
  if (value === 0) return '0'

  const sign = value < 0 ? '-' : ''
  const abs = Math.abs(value)

  if (unit.suffix) {
    return `${sign}${trimZeros((abs / unit.divisor).toFixed(decimals))}${unit.suffix}`
  }
  /*
    ⚠️ 여기서 `decimals` 를 버리면 만·억이 안 붙는 축만 기본 3 자리에 갇힌다(#319).
    간격이 0.0005 이하인 축은 「0 · 0.001 · 0.001」처럼 눈금 두 개가 같은 글자가 됐다.
  */
  return `${sign}${abs.toLocaleString('ko-KR', {
    maximumFractionDigits: Math.max(DEFAULT_PLAIN_DECIMALS, decimals),
  })}`
}

/**
 * 축 전체가 **하나의 단위**를 쓰도록 포맷터를 만든다.
 *
 * ⚠️ 값마다 단위를 따로 고르면(예전 `formatAxisTick` 이 그랬다) 한 축 안에서 단위가
 * 섞인다. 손익 눈금 `[-15000, -10000, -5000, 0, 5000, 10000]` 이 실제로
 * **「-1.5만 · -1만 · -5,000 · 0 · 5,000 · 1만」**으로 그려졌다 — 1만을 넘는 값만
 * 만 단위가 되어, 같은 축의 눈금끼리 자릿수를 비교할 수 없었다.
 *
 * 그래서 **가장 큰 눈금**으로 단위를 한 번 정하고 모든 눈금에 같은 단위를 쓴다.
 * 위 예는 「-1.5만 · -1만 · -0.5만 · 0 · 0.5만 · 1만」이 된다.
 *
 * 소수 자리도 여기서 함께 정한다 — `pickDecimals` 참고.
 */
export const createAxisTickFormatter = (
  values: readonly (number | null | undefined)[],
): ((value: number) => string) => {
  const magnitude = values.reduce<number>(
    (max, value) =>
      typeof value === 'number' && Number.isFinite(value)
        ? Math.max(max, Math.abs(value))
        : max,
    0,
  )
  const unit = pickAxisUnit(magnitude)
  const finite = values.filter(
    (value): value is number =>
      typeof value === 'number' && Number.isFinite(value),
  )
  const decimals = pickDecimals(finite, unit)

  return value => formatWithUnit(value, unit, decimals)
}

export const TooltipBox = styled.div`
  border: 1px solid ${CHART_COLORS.border};
  border-radius: var(--radius-control);
  background: ${CHART_COLORS.surface};
  box-shadow: var(--shadow-level-2);
  padding: 8px 10px;
  font-size: 12px;
  line-height: 18px;

  strong {
    display: block;
    color: var(--color-text-900);
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }

  span {
    color: var(--color-text-caption);
  }
`

export type ChartTooltipContentProps = {
  active?: boolean
  payload?: Array<{
    name?: string
    value?: number
    payload?: Record<string, unknown>
  }>
  label?: string
  unit?: string
  /**
   * 값 포맷터. 지정하면 unit 기반 기본 포맷 대신 이 함수로 툴팁 값을 표기한다
   * (예: 유동인구 명 단위를 "1억 4528만명"처럼 억/만으로 축약).
   */
  valueFormatter?: (value: number) => string
}

export function ChartTooltipContent({
  active,
  payload,
  label,
  unit = '',
  valueFormatter,
}: ChartTooltipContentProps) {
  if (!active || !payload || payload.length === 0) return null
  const formatValue = (value: number | undefined): string =>
    typeof value === 'number' && Number.isFinite(value) && valueFormatter
      ? valueFormatter(value)
      : formatChartValue(value, unit)
  return (
    <TooltipBox>
      {label ? <span>{label}</span> : null}
      {payload.map((entry, index) => (
        <strong key={entry.name ?? index}>
          {entry.name ? `${entry.name} ` : ''}
          {formatValue(entry.value)}
        </strong>
      ))}
    </TooltipBox>
  )
}
