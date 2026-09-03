import type { AnalysisResultTab } from '@/lib/analysis/selection'

export type AnalysisTabDefinition = {
  value: AnalysisResultTab
  label: string
}

export const ANALYSIS_TABS: readonly AnalysisTabDefinition[] = [
  { value: 'summary', label: '요약' },
  { value: 'foot-traffic', label: '유동인구' },
  { value: 'sales', label: '매출' },
  { value: 'stores', label: '점포' },
  { value: 'living', label: '생활권' },
  { value: 'trend', label: '트렌드' },
  { value: 'benchmark', label: '지역 평균 대비' },
] as const

const allowedTabs = new Set(ANALYSIS_TABS.map(tab => tab.value))

export const normalizeAnalysisTab = (
  value: string | null | undefined,
): AnalysisResultTab =>
  value && allowedTabs.has(value as AnalysisResultTab)
    ? (value as AnalysisResultTab)
    : 'summary'

/**
 * 원 금액을 억/만원 단위로 표기한다. 만원 미만 자리는 버린다(절사).
 * 예) 345,345,345 → '3억 4534만원', 3,234,278 → '323만원',
 *     471,000,000,000 → '4,710억원', 5,000 → '5,000원', 0 → '0원'.
 * null/undefined/비유한수는 '데이터 없음'.
 */
export const formatKoreanMoney = (value: number | null | undefined): string => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '데이터 없음'
  const sign = value < 0 ? '-' : ''
  const abs = Math.floor(Math.abs(value))
  const eok = Math.floor(abs / 100_000_000)
  const man = Math.floor((abs % 100_000_000) / 10_000)
  const parts: string[] = []
  if (eok > 0) parts.push(`${eok.toLocaleString('ko-KR')}억`)
  if (man > 0) parts.push(`${man}만`)
  if (parts.length === 0) return `${sign}${abs.toLocaleString('ko-KR')}원`
  return `${sign}${parts.join(' ')}원`
}

export const formatAnalysisValue = (
  value: number | null | undefined,
  unit = '',
): string => {
  if (unit === '원') return formatKoreanMoney(value)
  return typeof value === 'number' && Number.isFinite(value)
    ? `${new Intl.NumberFormat('ko-KR', {
        maximumFractionDigits: 1,
      }).format(value)}${unit}`
    : '데이터 없음'
}

export const formatPeriodCode = (periodCode: string): string => {
  const match = /^(\d{4})([1-4])$/.exec(periodCode)
  return match ? `${match[1]}년 ${match[2]}분기` : '기준 시점 정보 없음'
}

export type AnalysisMetricRow = {
  label: string
  value: number | null
  /**
   * 라벨을 링크로 만들 목적지. 없으면 링크 없이 텍스트로 그린다.
   *
   * 선택 필드로 둔 이유: 이 타입은 `/analysis` 결과 차트·시뮬레이션 리포트도 쓴다.
   * 필수로 만들면 6개 사용처를 전부 고쳐야 한다.
   */
  href?: string
  /** 값 뒤에 함께 적을 보조 표기(예: 개업률 `8.5%`). 없으면 생략한다. */
  subLabel?: string
}

export const toMetricRows = <
  T extends Record<string, number | null | undefined>,
>(
  source: T | null | undefined,
  definitions: readonly (readonly [label: string, key: keyof T])[],
): AnalysisMetricRow[] =>
  definitions.map(([label, key]) => {
    const value = source?.[key]
    return {
      label,
      value: typeof value === 'number' && Number.isFinite(value) ? value : null,
    }
  })

export const getMetricMaximum = (rows: readonly AnalysisMetricRow[]): number =>
  rows.reduce(
    (maximum, row) =>
      row.value === null ? maximum : Math.max(maximum, row.value),
    0,
  )
