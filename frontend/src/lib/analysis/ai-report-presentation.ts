import type { AnalysisSelection } from '@/lib/analysis/selection'
import type {
  AiReportLevel,
  CommercialAiReport,
  CommercialComparisonAiReport,
  RegionAiReport,
} from '@/types/ai-report'

const text = (value: string | null | undefined): string => value?.trim() ?? ''

const toList = (
  value: readonly (string | null)[] | null | undefined,
): string[] =>
  (value ?? [])
    .map(item => item?.trim() ?? '')
    .filter((item): item is string => item.length > 0)

export const resolveAiReportLevel = (
  selection: AnalysisSelection,
): AiReportLevel | null => {
  if (selection.commercialCode) return 'commercial'
  if (selection.administrationCode) return 'administration'
  if (selection.districtCode) return 'district'
  return null
}

export const resolveAiReportTargetCode = (
  selection: AnalysisSelection,
  level: AiReportLevel,
): string | null => {
  if (level === 'commercial') return selection.commercialCode
  if (level === 'administration') return selection.administrationCode
  return selection.districtCode
}

export const buildAiLevelKey = (
  level: AiReportLevel | null,
  code: string | null,
  serviceCode: string | null,
): string | null => {
  if (!level || !code) return null
  if (level === 'commercial') {
    return serviceCode ? `commercial:${code}:${serviceCode}` : null
  }
  return `${level}:${code}`
}

export const isAiReportActive = (
  levelKey: string | null,
  activeKey: string | null,
): boolean => Boolean(levelKey) && activeKey === levelKey

export const resolveAiReportVisibility = ({
  hydrated,
  isLoggedIn,
  levelKey,
  panelOpen,
}: {
  hydrated: boolean
  isLoggedIn: boolean
  levelKey: string | null
  panelOpen: boolean
}): { showCard: boolean; showLockCard: boolean; showPanel: boolean } => {
  const hasLevel = hydrated && Boolean(levelKey)
  return {
    showCard: hasLevel && isLoggedIn && !panelOpen,
    showLockCard: hasLevel && !isLoggedIn,
    showPanel: hasLevel && isLoggedIn && panelOpen,
  }
}

export type ReportBlockList = { title: string; items: string[] }

export type CommercialReportView = {
  headline: { summary: string; insight: string }
  strengths: string[]
  risks: string[]
  actions: ReportBlockList[]
  generatedAt: string
}

export const toCommercialReportView = (
  report: CommercialAiReport,
): CommercialReportView => ({
  headline: {
    summary: text(report.summary),
    insight: text(report.businessInsight),
  },
  strengths: toList(report.strengths),
  risks: toList(report.risks),
  actions: [
    {
      title: '추천 업종군',
      items: toList(report.recommendedBusinessCategories),
    },
    { title: '추천 고객층', items: toList(report.recommendedCustomerSegments) },
    {
      title: '추천 운영 시간',
      items: toList(report.recommendedOperatingHours),
    },
    { title: '피해야 할 시간', items: toList(report.avoidOperatingHours) },
    { title: '타깃 연령', items: toList(report.targetAgeGroups) },
    { title: '타깃 성별', items: toList(report.targetGenders) },
    { title: '운영 팁', items: toList(report.operationTips) },
  ].filter(block => block.items.length > 0),
  generatedAt: text(report.generatedAt),
})

export const isCommercialReportEmpty = (view: CommercialReportView): boolean =>
  !view.headline.summary &&
  !view.headline.insight &&
  view.strengths.length === 0 &&
  view.risks.length === 0 &&
  view.actions.length === 0

/**
 * 상권 비교 AI 리포트 뷰.
 *
 * 단일 상권 리포트와 **같은 어휘**로 세운다(요약 + 인사이트 + 목록 블록들) —
 * `report-insight-section` 을 그대로 재사용하기 위해서다. 비교만의 것은
 * `recommendedSide`(추천 측)뿐이라 머리에 따로 둔다.
 */
export type ComparisonReportView = {
  headline: { summary: string; insight: string }
  /** 백엔드가 고른 쪽. 비어 있으면 화면이 그 줄을 통째로 생략한다. */
  recommendedSide: string
  reasons: string[]
  blocks: ReportBlockList[]
  generatedAt: string
}

export const toComparisonReportView = (
  report: CommercialComparisonAiReport,
): ComparisonReportView => ({
  headline: {
    summary: text(report.summary),
    insight: text(report.businessInsight),
  },
  recommendedSide: text(report.recommendedSide),
  reasons: toList(report.recommendedReasons),
  /*
   * 문장 하나짜리 인사이트들도 목록 블록으로 세운다 — 각각을 따로 렌더하면
   * 비어 있을 때 제목만 남는 자리가 넷 생긴다. `toList` 가 빈 것을 걸러 주므로
   * 블록 필터 한 번으로 정리된다.
   */
  blocks: [
    { title: '위험 비교', items: toList([report.riskComparison]) },
    { title: '시간대 인사이트', items: toList([report.timeSlotInsight]) },
    {
      title: '고객층 인사이트',
      items: toList([report.customerSegmentInsight]),
    },
    { title: '운영 전략', items: toList(report.operationStrategy) },
  ].filter(block => block.items.length > 0),
  generatedAt: text(report.generatedAt),
})

export const isComparisonReportEmpty = (view: ComparisonReportView): boolean =>
  !view.headline.summary &&
  !view.headline.insight &&
  !view.recommendedSide &&
  view.reasons.length === 0 &&
  view.blocks.length === 0

export type RegionReportView = {
  headline: { summary: string; marketStatus: string }
  recommended: string[]
  caution: string[]
  insight: string
  generatedAt: string
}

export const toRegionReportView = (
  report: RegionAiReport,
): RegionReportView => ({
  headline: {
    summary: text(report.summary),
    marketStatus: text(report.marketStatus),
  },
  recommended: toList(report.recommendedBusinessCategories),
  caution: toList(report.cautionBusinessCategories),
  insight: text(report.businessInsight),
  generatedAt: text(report.generatedAt),
})

export const isRegionReportEmpty = (view: RegionReportView): boolean =>
  !view.headline.summary &&
  !view.headline.marketStatus &&
  view.recommended.length === 0 &&
  view.caution.length === 0 &&
  !view.insight
