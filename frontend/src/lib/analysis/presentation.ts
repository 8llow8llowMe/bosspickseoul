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

/**
 * `peerStores` → 가로 막대 행. **점포 수 많은 순**으로 세운다.
 *
 * 이 배열은 **선택한 업종을 뺀 나머지 업종**이다(커피-음료로 조회하면 커피-음료가
 * 목록에 없다). 그래서 화면 문구가 「이 상권의 업종 구성」이라고 말하면 안 된다 —
 * 선택 업종이 빠진 그림이다.
 *
 * 0 개인 업종은 버리지 않고 남긴다. 「치킨전문점 0개」는 **비어 있는 자리**를 뜻하는
 * 정보라, 목록에서 지우면 그 사실이 사라진다.
 */
export const toPeerStoreRows = (
  peerStores:
    | ReadonlyArray<{
        serviceName?: string | null
        totalStoreCount?: number | null
      }>
    | null
    | undefined,
): AnalysisMetricRow[] =>
  (peerStores ?? [])
    .filter(
      (item): item is { serviceName: string; totalStoreCount: number } =>
        typeof item?.serviceName === 'string' &&
        item.serviceName.trim().length > 0 &&
        typeof item.totalStoreCount === 'number' &&
        Number.isFinite(item.totalStoreCount),
    )
    .map(item => ({ label: item.serviceName, value: item.totalStoreCount }))
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))

/**
 * 그릴 값이 하나라도 있는가. **전부 0 이면 차트를 그리지 않는다** — 길이가 0 인 막대만
 * 늘어선 그림은 눈금도 못 만들고 아무것도 말하지 않는다.
 */
export const hasPositiveRow = (rows: readonly AnalysisMetricRow[]): boolean =>
  rows.some(row => typeof row.value === 'number' && row.value > 0)

/**
 * 막대로 그릴 것과 **문장으로 적을 것**을 가른다.
 *
 * recharts 는 길이가 0 인 막대에 값 라벨을 그리지 않는다. 그래서 「치킨전문점 0개」를
 * 차트에 두면 **이름만 있고 숫자가 없는 줄**이 되어, 0 이 아니라 「데이터 없음」으로
 * 읽힌다. 0 은 「그 업종이 이 상권에 없다」는 정보라 버릴 수도 없다.
 *
 * 그래서 차트에서 빼고 **한 줄 문장으로 따로 적는다.** 정보는 남고 차트는 깨지지 않는다.
 */
export const splitPeerStoreRows = (
  rows: readonly AnalysisMetricRow[],
): { charted: AnalysisMetricRow[]; absentLabels: string[] } => ({
  charted: rows.filter(row => typeof row.value === 'number' && row.value > 0),
  absentLabels: rows.filter(row => row.value === 0).map(row => row.label),
})
