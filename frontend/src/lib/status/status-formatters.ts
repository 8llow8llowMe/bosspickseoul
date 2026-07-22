import type { StatusMetric } from '@/types/status'

const koreanNumberFormatter = new Intl.NumberFormat('ko-KR')

const EMPTY_STATUS_VALUE = '데이터 없음'
const TEN_THOUSAND = 10_000
const ONE_HUNDRED_MILLION = 100_000_000

const isFiniteNumber = (value: number | null | undefined): value is number =>
  typeof value === 'number' && Number.isFinite(value)

export const formatStatusValue = (
  metric: StatusMetric,
  value: number | null | undefined,
): string => {
  if (!isFiniteNumber(value)) {
    return EMPTY_STATUS_VALUE
  }

  if (metric === 'footTraffic') {
    return `${koreanNumberFormatter.format(Math.floor(value / TEN_THOUSAND))}만 명`
  }

  if (metric === 'sales') {
    const eok = Math.floor(value / ONE_HUNDRED_MILLION)
    const manWon = Math.floor((value % ONE_HUNDRED_MILLION) / TEN_THOUSAND)

    return `${koreanNumberFormatter.format(eok)}억 ${koreanNumberFormatter.format(manWon)}만원`
  }

  return `${koreanNumberFormatter.format(value)}개`
}

export const formatStatusChange = (value: number): string => {
  if (value > 0) {
    return `+${value}%`
  }

  return `${value}%`
}
