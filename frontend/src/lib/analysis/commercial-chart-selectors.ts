import {
  toMetricRows,
  type AnalysisMetricRow,
} from '@/lib/analysis/presentation'
import {
  toPyramidRows,
  type PyramidRow,
  type TrendPoint,
} from '@/lib/analysis/chart-data'
import type {
  CommercialFootTraffic,
  CommercialSales,
  CommercialTrend,
} from '@/types/commercial-analysis'

export const footTimeDefinitions = [
  ['00~06시', 'footTrafficTime00To06'],
  ['06~11시', 'footTrafficTime06To11'],
  ['11~14시', 'footTrafficTime11To14'],
  ['14~17시', 'footTrafficTime14To17'],
  ['17~21시', 'footTrafficTime17To21'],
  ['21~24시', 'footTrafficTime21To24'],
] as const
export const footDayDefinitions = [
  ['월', 'mondayFootTraffic'],
  ['화', 'tuesdayFootTraffic'],
  ['수', 'wednesdayFootTraffic'],
  ['목', 'thursdayFootTraffic'],
  ['금', 'fridayFootTraffic'],
  ['토', 'saturdayFootTraffic'],
  ['일', 'sundayFootTraffic'],
] as const
export const salesTimeDefinitions = [
  ['00~06시', 'salesAmountTime00To06'],
  ['06~11시', 'salesAmountTime06To11'],
  ['11~14시', 'salesAmountTime11To14'],
  ['14~17시', 'salesAmountTime14To17'],
  ['17~21시', 'salesAmountTime17To21'],
  ['21~24시', 'salesAmountTime21To24'],
] as const
export const salesDayDefinitions = [
  ['월', 'mondaySalesAmount'],
  ['화', 'tuesdaySalesAmount'],
  ['수', 'wednesdaySalesAmount'],
  ['목', 'thursdaySalesAmount'],
  ['금', 'fridaySalesAmount'],
  ['토', 'saturdaySalesAmount'],
  ['일', 'sundaySalesAmount'],
] as const
export const salesAgeDefinitions = [
  ['10대', 'age10SalesAmount'],
  ['20대', 'age20SalesAmount'],
  ['30대', 'age30SalesAmount'],
  ['40대', 'age40SalesAmount'],
  ['50대', 'age50SalesAmount'],
  ['60대 이상', 'age60PlusSalesAmount'],
] as const
export const populationAgeDefinitions = [
  ['10대', 'age10ResidentPopulation'],
  ['20대', 'age20ResidentPopulation'],
  ['30대', 'age30ResidentPopulation'],
  ['40대', 'age40ResidentPopulation'],
  ['50대', 'age50ResidentPopulation'],
  ['60대 이상', 'age60PlusResidentPopulation'],
] as const
export const expenseDefinitions = [
  ['식료품', 'groceryExpenseAmount'],
  ['의류·신발', 'clothingExpenseAmount'],
  ['의료', 'medicalExpenseAmount'],
  ['생활용품', 'householdExpenseAmount'],
  ['교통', 'transportationExpenseAmount'],
  ['여가·오락', 'leisureExpenseAmount'],
  ['문화·취미', 'cultureExpenseAmount'],
  ['교육', 'educationExpenseAmount'],
  ['유흥', 'entertainmentExpenseAmount'],
] as const

export const createRows = (
  source: Record<string, number | null | undefined> | null | undefined,
  definitions: readonly (readonly [string, string])[],
): AnalysisMetricRow[] =>
  toMetricRows(
    source,
    definitions as readonly (readonly [
      string,
      keyof Record<string, number | null | undefined>,
    ])[],
  )

/** 시간대별 항목(라벨+값)을 LineChart 분기 추세 포인트 형태로 재사용한다. */
export const toLinePoints = (
  rows: readonly AnalysisMetricRow[],
): TrendPoint[] =>
  rows.map(row => ({
    periodLabel: row.label,
    value: row.value,
    changeRate: null,
  }))

export const buildSalesTimeLine = (
  sales: CommercialSales | null,
): TrendPoint[] =>
  toLinePoints(
    createRows(
      sales?.amountByTimeSlotItem as
        | Record<string, number | null>
        | null
        | undefined,
      salesTimeDefinitions,
    ),
  )

export const buildFootDayBars = (
  foot: CommercialFootTraffic | null,
): AnalysisMetricRow[] =>
  createRows(
    foot?.byDayOfWeekItem as Record<string, number | null> | null | undefined,
    footDayDefinitions,
  )

export const buildFootAgeGenderPyramid = (
  foot: CommercialFootTraffic | null,
): PyramidRow[] => toPyramidRows(foot?.byAgeGenderPercentItem)

export type SalesGrowth = {
  direction: 'INCREASE' | 'DECREASE' | 'STAGNANT' | null
  changeRate: number | null
}

export const selectSalesGrowth = (
  trend: CommercialTrend | null,
): SalesGrowth => {
  const periods = trend?.periods ?? []
  const last = periods[periods.length - 1]
  const rate = last?.changeRate
  return {
    direction: trend?.trendDirection ?? null,
    changeRate: typeof rate === 'number' && Number.isFinite(rate) ? rate : null,
  }
}
