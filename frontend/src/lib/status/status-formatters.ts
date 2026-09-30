import type { StatusMetric } from '@/types/status'

const koreanNumberFormatter = new Intl.NumberFormat('ko-KR')
const koreanChangeFormatter = new Intl.NumberFormat('ko-KR', {
  maximumFractionDigits: 1,
})

export const STATUS_METRIC_LABELS: Record<StatusMetric, string> = {
  footTraffic: '유동인구',
  sales: '매출',
  opened: '개업',
  closed: '폐업',
}

const EMPTY_STATUS_VALUE = '데이터 없음'
const TEN_THOUSAND = 10_000

const isFiniteNumber = (value: number | null | undefined): value is number =>
  typeof value === 'number' && Number.isFinite(value)

const isValidTotal = (value: number | null | undefined): value is number =>
  isFiniteNumber(value) && value >= 0 && Number.isInteger(value)

const EOK = TEN_THOUSAND * TEN_THOUSAND

/**
 * 큰 수를 **가장 큰 두 자리 단위 + 쉼표**로 표기한다. 둘째 단위에서 반올림한다.
 * 예) 145,283,456 → "1억 4,528만명", 3,134,652,050,000 → "3조 1,347억원"
 *
 * 예전에는 억 아래를 모두 만으로 적어 "31346억 5205만원"처럼 다섯 자리 억이 나왔다.
 * 자릿수를 세어야 크기가 들어와 조 단위를 올리고, 셋째 단위(만)는 버린다 — 순위
 * 목록에서 비교하는 건 앞 두 자리다. 시뮬레이션의 `formatLargeWon` 과 같은 쉼표 규칙이다.
 * 1만 미만은 반올림 없이 그대로 표기한다(작은 개수 등).
 */
export const formatSinoUnit = (
  value: number | null | undefined,
  suffix: string,
): string => {
  if (!isFiniteNumber(value) || value < 0) {
    return EMPTY_STATUS_VALUE
  }

  if (value < TEN_THOUSAND) {
    return `${koreanNumberFormatter.format(Math.round(value))}${suffix}`
  }

  // 반올림한 값으로 자리를 정한다. 9999만 5천은 "10,000만"이 아니라 "1억"이다.
  const totalMan = Math.round(value / TEN_THOUSAND)

  if (totalMan < TEN_THOUSAND) {
    return `${koreanNumberFormatter.format(totalMan)}만${suffix}`
  }

  const totalEok = Math.round(value / EOK)
  const [major, minor, majorLabel, minorLabel] =
    totalEok < TEN_THOUSAND
      ? [
          Math.floor(totalMan / TEN_THOUSAND),
          totalMan % TEN_THOUSAND,
          '억',
          '만',
        ]
      : [
          Math.floor(totalEok / TEN_THOUSAND),
          totalEok % TEN_THOUSAND,
          '조',
          '억',
        ]
  const majorText = `${koreanNumberFormatter.format(major)}${majorLabel}`

  return minor > 0
    ? `${majorText} ${koreanNumberFormatter.format(minor)}${minorLabel}${suffix}`
    : `${majorText}${suffix}`
}

/**
 * 개월 수를 "N년 M개월" 형태로 표기한다(만 12개월 기준). 반올림해서 정수 개월로
 * 환산한다. 예) 102 → "8년 6개월", 96 → "8년", 5 → "5개월", 0 → "0개월".
 */
export const formatMonths = (value: number | null | undefined): string => {
  if (!isFiniteNumber(value) || value < 0) {
    return EMPTY_STATUS_VALUE
  }

  const totalMonths = Math.round(value)
  const years = Math.floor(totalMonths / 12)
  const months = totalMonths % 12

  if (years > 0 && months > 0) {
    return `${years}년 ${months}개월`
  }
  if (years > 0) {
    return `${years}년`
  }
  return `${months}개월`
}

export const formatStatusValue = (
  metric: StatusMetric,
  value: number | null | undefined,
): string => {
  if (!isValidTotal(value)) {
    return EMPTY_STATUS_VALUE
  }

  if (metric === 'footTraffic') {
    return formatSinoUnit(value, '명')
  }

  if (metric === 'sales') {
    return formatSinoUnit(value, '원')
  }

  return `${koreanNumberFormatter.format(value)}개`
}

export const formatStatusChange = (
  value: number | null | undefined,
): string => {
  if (!isFiniteNumber(value)) {
    return EMPTY_STATUS_VALUE
  }

  const formattedValue = koreanChangeFormatter.format(value)

  if (value > 0) {
    return `+${formattedValue}%`
  }

  return `${formattedValue}%`
}

export type ChangeBadge = {
  changeLabel: string
  changeDirection: 'up' | 'down'
}

/**
 * 변화율 배지 필드. `changeRate` 가 유한수가 아니면(NaN 등) **빈 객체**를 낸다.
 *
 * `formatStatusChange(NaN)` 은 "데이터 없음"을 반환하고 `NaN >= 0` 은 false 라
 * `changeDirection: 'down'` 이 된다 — 그대로 쓰면 없는 하락을 있다고 말하는
 * 빨간 배지가 찍힌다. 배지를 붙이는 쪽(`RankBarList`)은 `changeLabel` 이 없으면
 * 아예 그리지 않으므로, 여기서 필드 자체를 비우는 것으로 막는다.
 */
export const toChangeBadge = (
  changeRate: number,
): ChangeBadge | Record<string, never> => {
  if (!Number.isFinite(changeRate)) return {}

  return {
    changeLabel: formatStatusChange(changeRate),
    changeDirection: changeRate >= 0 ? 'up' : 'down',
  }
}
