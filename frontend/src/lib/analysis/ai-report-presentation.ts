import type { AnalysisSelection } from '@/lib/analysis/selection'
import type {
  AiReportLevel,
  CommercialAiReport,
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
  enabled,
  levelKey,
  panelOpen,
}: {
  enabled: boolean
  levelKey: string | null
  panelOpen: boolean
}): { showCard: boolean; showPanel: boolean } => ({
  showCard: enabled && Boolean(levelKey) && !panelOpen,
  showPanel: enabled && Boolean(levelKey) && panelOpen,
})

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
