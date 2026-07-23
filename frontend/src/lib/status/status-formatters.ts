import type { StatusMetric } from '@/types/status'

const koreanNumberFormatter = new Intl.NumberFormat('ko-KR')
const koreanChangeFormatter = new Intl.NumberFormat('ko-KR', {
  maximumFractionDigits: 1,
})

const EMPTY_STATUS_VALUE = '데이터 없음'
const TEN_THOUSAND = 10_000
const ONE_HUNDRED_MILLION = 100_000_000

const isFiniteNumber = (value: number | null | undefined): value is number =>
  typeof value === 'number' && Number.isFinite(value)

const isValidTotal = (value: number | null | undefined): value is number =>
  isFiniteNumber(value) && value >= 0 && Number.isInteger(value)

export const formatStatusValue = (
  metric: StatusMetric,
  value: number | null | undefined,
): string => {
  if (!isValidTotal(value)) {
    return EMPTY_STATUS_VALUE
  }

  if (metric === 'footTraffic') {
    return `${koreanNumberFormatter.format(Math.floor(value / TEN_THOUSAND))}만 명`
  }

  if (metric === 'sales') {
    const eok = Math.floor(value / ONE_HUNDRED_MILLION)
    const manWon = Math.floor((value % ONE_HUNDRED_MILLION) / TEN_THOUSAND)

    return eok > 0
      ? `${koreanNumberFormatter.format(eok)}억 ${koreanNumberFormatter.format(manWon)}만원`
      : `${koreanNumberFormatter.format(manWon)}만원`
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
