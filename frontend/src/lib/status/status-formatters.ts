import type { StatusMetric } from '@/types/status'

const koreanNumberFormatter = new Intl.NumberFormat('ko-KR')
const koreanChangeFormatter = new Intl.NumberFormat('ko-KR', {
  maximumFractionDigits: 1,
})

const EMPTY_STATUS_VALUE = '데이터 없음'
const TEN_THOUSAND = 10_000

const isFiniteNumber = (value: number | null | undefined): value is number =>
  typeof value === 'number' && Number.isFinite(value)

const isValidTotal = (value: number | null | undefined): value is number =>
  isFiniteNumber(value) && value >= 0 && Number.isInteger(value)

/**
 * 큰 수를 "N억 M만{단위}" 형태로 표기한다. 만 단위에서 반올림하며,
 * 1만 미만은 반올림 없이 그대로 표기한다(작은 개수 등).
 * 예) 145,283,456 → "1억 4528만명", 132,423,450,000 → "1324억 2345만원"
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

  const totalMan = Math.round(value / TEN_THOUSAND)
  const eok = Math.floor(totalMan / TEN_THOUSAND)
  const man = totalMan % TEN_THOUSAND

  if (eok > 0) {
    const base = man > 0 ? `${eok}억 ${man}만` : `${eok}억`
    return `${base}${suffix}`
  }

  return `${man}만${suffix}`
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
