import { resolveDistrictCodeFromAdministration } from '@/lib/map/geometry'

export const ANALYSIS_PERIOD_CODE = '20233' as const

export const ANALYSIS_STEPS = [
  'district',
  'administration',
  'commercial',
  'service',
] as const

export type AnalysisStep = (typeof ANALYSIS_STEPS)[number]

export type AnalysisResultTab =
  | 'summary'
  | 'foot-traffic'
  | 'sales'
  | 'stores'
  | 'living'
  | 'trend'
  | 'benchmark'

export type AnalysisSelection = {
  districtCode: string | null
  administrationCode: string | null
  commercialCode: string | null
  serviceCode: string | null
  periodCode: typeof ANALYSIS_PERIOD_CODE
}

type SearchParamsReader = {
  get(name: string): string | null
}

const readCode = (params: SearchParamsReader, name: string): string | null => {
  const value = params.get(name)?.trim()
  return value ? value : null
}

export const createEmptyAnalysisSelection = (): AnalysisSelection => ({
  districtCode: null,
  administrationCode: null,
  commercialCode: null,
  serviceCode: null,
  periodCode: ANALYSIS_PERIOD_CODE,
})

export const parseAnalysisSelection = (
  params: SearchParamsReader,
): AnalysisSelection => ({
  districtCode: readCode(params, 'districtCode'),
  administrationCode: readCode(params, 'administrationCode'),
  commercialCode: readCode(params, 'commercialCode'),
  serviceCode: readCode(params, 'serviceCode'),
  periodCode: ANALYSIS_PERIOD_CODE,
})

export const selectAnalysisValue = (
  selection: AnalysisSelection,
  step: AnalysisStep,
  code: string,
): AnalysisSelection => {
  const value = code.trim() || null

  if (step === 'district') {
    return {
      districtCode: value,
      administrationCode: null,
      commercialCode: null,
      serviceCode: null,
      periodCode: ANALYSIS_PERIOD_CODE,
    }
  }

  if (step === 'administration') {
    return {
      ...selection,
      administrationCode: value,
      commercialCode: null,
      serviceCode: null,
    }
  }

  if (step === 'commercial') {
    return {
      ...selection,
      commercialCode: value,
      serviceCode: null,
    }
  }

  return { ...selection, serviceCode: value }
}

export const getActiveAnalysisStep = (
  selection: AnalysisSelection,
): AnalysisStep => {
  if (!selection.districtCode) return 'district'
  if (!selection.administrationCode) return 'administration'
  if (!selection.commercialCode) return 'commercial'
  return 'service'
}

export const isCompleteAnalysisSelection = (
  selection: AnalysisSelection,
): selection is AnalysisSelection & {
  districtCode: string
  administrationCode: string
  commercialCode: string
  serviceCode: string
} =>
  Boolean(
    selection.districtCode &&
    selection.administrationCode &&
    selection.commercialCode &&
    selection.serviceCode,
  )

const createSelectionSearchParams = (
  selection: AnalysisSelection,
  includePeriod: boolean,
) => {
  const params = new URLSearchParams()
  if (selection.districtCode) {
    params.set('districtCode', selection.districtCode)
  }
  if (selection.administrationCode) {
    params.set('administrationCode', selection.administrationCode)
  }
  if (selection.commercialCode) {
    params.set('commercialCode', selection.commercialCode)
  }
  if (selection.serviceCode) {
    params.set('serviceCode', selection.serviceCode)
  }
  if (includePeriod) {
    params.set('periodCode', ANALYSIS_PERIOD_CODE)
  }
  return params
}

export const createAnalysisExplorerHref = (selection: AnalysisSelection) => {
  const query = createSelectionSearchParams(selection, false).toString()
  return query ? `/analysis?${query}` : '/analysis'
}

export const createAnalysisResultHref = (
  selection: AnalysisSelection,
  tab: AnalysisResultTab,
) => {
  const params = createSelectionSearchParams(selection, true)
  params.set('tab', tab)
  return `/analysis/result?${params}`
}

export const selectAdministrationWithParent = (
  selection: AnalysisSelection,
  administrationCode: string,
): AnalysisSelection => ({
  districtCode: resolveDistrictCodeFromAdministration(administrationCode),
  administrationCode,
  commercialCode: null,
  serviceCode: null,
  periodCode: ANALYSIS_PERIOD_CODE,
})

export const selectCommercialWithParents = (
  selection: AnalysisSelection,
  { commercialCode, administrationCode }: {
    commercialCode: string
    administrationCode: string
  },
): AnalysisSelection => ({
  districtCode: resolveDistrictCodeFromAdministration(administrationCode),
  administrationCode,
  commercialCode,
  serviceCode: selection.serviceCode,
  periodCode: ANALYSIS_PERIOD_CODE,
})

export const shouldAutoNavigateToAnalysis = (
  selection: AnalysisSelection,
): boolean =>
  Boolean(
    selection.districtCode &&
      selection.administrationCode &&
      selection.commercialCode &&
      selection.serviceCode,
  )
