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

/**
 * 로딩 중 지표는 **`--`** 다. DESIGN.md §4-8 이 skeleton 을 금지한다 — 지표 자리의
 * 회색 블록은 "값이 있는데 가려져 있다"로 읽히고, 도착한 값이 `데이터 없음` 이면
 * 화면이 두 번 바뀐다. `--` 는 자리를 잡아두면서 아직 값이 아님을 그대로 말한다.
 */
export const METRIC_PENDING_DISPLAY = '--'

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
        ? METRIC_PENDING_DISPLAY
        : formatAnalysisValue(km?.totalSalesAmount, '원'),
    },
    {
      label: '유동인구',
      loading: profileLoading,
      display: profileLoading
        ? METRIC_PENDING_DISPLAY
        : formatAnalysisValue(km?.totalFootTraffic, '명'),
    },
    {
      label: '점포 수',
      loading: profileLoading,
      display: profileLoading
        ? METRIC_PENDING_DISPLAY
        : formatAnalysisValue(km?.totalStoreCount, '개'),
    },
    {
      label: '성장률',
      loading: growthLoading,
      display: growthLoading ? METRIC_PENDING_DISPLAY : g.display,
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
