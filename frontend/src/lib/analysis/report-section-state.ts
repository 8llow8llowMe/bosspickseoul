import { formatAnalysisValue } from '@/lib/analysis/presentation'
import type { SalesGrowth } from '@/lib/analysis/commercial-chart-selectors'
import type { AiReportState } from '@/hooks/use-ai-report'
import type { CommercialProfile } from '@/types/recommend'

export type MetricTone = 'positive' | 'negative' | 'neutral'
export type MetricCardModel = {
  label: string
  display: string
  loading: boolean
  tone?: MetricTone
}

const formatGrowth = (
  growth: SalesGrowth,
): { display: string; tone: MetricTone } => {
  if (growth.changeRate === null)
    return { display: '데이터 없음', tone: 'neutral' }
  const pct = growth.changeRate * 100
  const sign = pct > 0 ? '+' : ''
  const tone: MetricTone =
    growth.direction === 'INCREASE'
      ? 'positive'
      : growth.direction === 'DECREASE'
        ? 'negative'
        : 'neutral'
  return { display: `${sign}${pct.toFixed(1)}%`, tone }
}

export const resolveMetricCards = ({
  profile,
  profileLoading,
  growth,
  growthLoading,
}: {
  profile: CommercialProfile | null
  profileLoading: boolean
  growth: SalesGrowth
  growthLoading: boolean
}): MetricCardModel[] => {
  const km = profile?.keyMetrics ?? null
  const g = formatGrowth(growth)
  return [
    {
      label: '월 매출',
      loading: profileLoading,
      display: profileLoading
        ? ''
        : formatAnalysisValue(km?.totalSalesAmount, '원'),
    },
    {
      label: '유동인구',
      loading: profileLoading,
      display: profileLoading
        ? ''
        : formatAnalysisValue(km?.totalFootTraffic, '명'),
    },
    {
      label: '점포 수',
      loading: profileLoading,
      display: profileLoading
        ? ''
        : formatAnalysisValue(km?.totalStoreCount, '개'),
    },
    {
      label: '성장률',
      loading: growthLoading,
      display: growthLoading ? '' : g.display,
      tone: growthLoading ? undefined : g.tone,
    },
  ]
}

export type ChartSlotState = 'loading' | 'ready' | 'empty'

export const resolveChartSlot = (
  loading: boolean,
  isEmpty: boolean,
): ChartSlotState => (loading ? 'loading' : isEmpty ? 'empty' : 'ready')

export type InsightMode = 'locked' | 'loading' | 'ready' | 'empty' | 'error'

export const resolveInsightMode = ({
  hydrated,
  isLoggedIn,
  state,
}: {
  hydrated: boolean
  isLoggedIn: boolean
  state: AiReportState
}): InsightMode => {
  if (hydrated && !isLoggedIn) return 'locked'
  switch (state.status) {
    case 'ready-commercial':
    case 'ready-region':
      return 'ready'
    case 'empty':
      return 'empty'
    case 'error':
      return 'error'
    // idle: 선택이 불완전/부적격이라 useAiReport가 조회를 시작하지 않은 상태.
    // "로딩 중"이 아니라 "조회 대상 없음"이므로 안내(empty) 뷰가 맞다 —
    // 그렇지 않으면 카드/차트는 비어 있는데 인사이트만 무한 로딩 스피너로 남는다.
    case 'idle':
      return 'empty'
    default:
      return 'loading'
  }
}
