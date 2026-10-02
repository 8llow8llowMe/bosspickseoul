import {
  MAP_CAMERA_PARAM,
  serializeMapCamera,
  type MapCamera,
} from '@/lib/analysis/map-camera'
import { resolveDistrictCodeFromAdministration } from '@/lib/map/geometry'
import {
  ANALYSIS_PERIOD_CODE_PATTERN,
  ANALYSIS_PERIOD_FIRST_YEAR,
  buildAnalysisPeriod,
  parseAnalysisPeriod,
  readAnalysisPeriod,
} from '@/lib/analysis/period-catalog'

/**
 * @deprecated 「최신 분기」는 서버 카탈로그(`useAnalysisPeriodCatalog`)가 정한다(period-catalog.md).
 * 홈·추천·비교·커뮤니티가 3단계에서 옮겨 가면 지운다. 분석·현황 화면은 더 이상 쓰지 않는다.
 */
export const ANALYSIS_PERIOD_CODE = '20261' as const

/*
  분기 기본 단위(하한·형식·분해·합성)는 `period-catalog.ts` 가 정본이다. 옛 import 경로를 깨지 않게
  여기서 다시 내보낸다(period-catalog.md D8 단계 1).
*/
export {
  ANALYSIS_PERIOD_CODE_PATTERN,
  ANALYSIS_PERIOD_FIRST_YEAR,
  buildAnalysisPeriod,
  parseAnalysisPeriod,
}

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
  /**
   * `YYYYQ` 분기 코드. **URL 이 정본이다**(`periodCode` 파라미터). 결과 화면의 기간
   * 드롭다운은 이 값을 `replace` 로 갱신하므로, 새로고침·공유 링크에서도 사용자가
   * 고른 분기가 그대로 복원된다.
   *
   * `null` 은 「URL 에 없음 = 최신」이다. 요청에 쓸 분기는 `useResolvedAnalysisPeriod` 가 서버
   * 카탈로그로 해석한다(period-catalog.md D5-1). 여기에 최신 분기를 써 넣지 않는다 — 「최신」 링크로 남는다.
   */
  periodCode: string | null
}

type SearchParamsReader = {
  get(name: string): string | null
}

const readCode = (params: SearchParamsReader, name: string): string | null => {
  const value = params.get(name)?.trim()
  return value ? value : null
}

/**
 * URL 의 `periodCode` 를 읽는다. 형식이 틀리거나 2021년보다 이르면 **조용히** 「지정 없음(최신)」으로
 * 둔다 — 손편집·낡은 링크의 코드로 백엔드를 때리는 대신 최신 분기를 보여 주는 편이 사용자에게 낫다.
 *
 * 상한은 여기서 보지 않는다. 서버 기본 분기보다 새 분기는 카탈로그가 온 뒤 해석에서 최신으로 내린다
 * (`resolveAnalysisPeriod`).
 */
const readPeriodCode = (params: SearchParamsReader): string | null =>
  readAnalysisPeriod(params.get('periodCode'))

export const createEmptyAnalysisSelection = (): AnalysisSelection => ({
  districtCode: null,
  administrationCode: null,
  commercialCode: null,
  serviceCode: null,
  periodCode: null,
})

export const parseAnalysisSelection = (
  params: SearchParamsReader,
): AnalysisSelection => ({
  districtCode: readCode(params, 'districtCode'),
  administrationCode: readCode(params, 'administrationCode'),
  commercialCode: readCode(params, 'commercialCode'),
  serviceCode: readCode(params, 'serviceCode'),
  periodCode: readPeriodCode(params),
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
      periodCode: selection.periodCode,
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
    /**
     * **업종을 버리지 않는다.** 같은 업종으로 후보 상권 여럿을 견줘 보는 것이
     * 이 화면의 주된 쓰임인데, 상권을 바꿀 때마다 업종이 사라지면 매번 다시
     * 골라야 한다(4단계 리셋 + 「분석 결과 보기」 재비활성).
     *
     * 지도에서 상권을 고르는 경로(`selectCommercialWithParents`)는 이미 업종을
     * 보존한다 — 목록 경로만 버리고 있었다. 둘을 같은 규칙으로 맞춘다.
     *
     * 새 상권에 그 업종이 없을 수 있지만 여기서 검사하지 않는다. 업종 목록은
     * 상권별 API 로 오므로, 목록이 도착한 뒤 `analysis-map-shell` 의 정합성
     * 효과가 URL 에서 지운다(같은 파일의 다른 단계들과 동일한 방식).
     */
    return {
      ...selection,
      commercialCode: value,
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
  if (includePeriod && selection.periodCode !== null) {
    params.set('periodCode', selection.periodCode)
  }
  return params
}

/**
 * 카메라를 쿼리 **마지막**에 붙인다. 조건 코드가 앞에 모여 있어야 사람이 URL 을
 * 읽을 때 "무엇을 분석하는지"가 먼저 보인다(D4-1).
 * 카메라가 `null` 이면 아무것도 붙이지 않는다 — `c` 없는 기존 링크와 출력이 같다.
 */
const appendCamera = (
  params: URLSearchParams,
  camera?: MapCamera | null,
): URLSearchParams => {
  if (camera) params.set(MAP_CAMERA_PARAM, serializeMapCamera(camera))
  return params
}

export const createAnalysisExplorerHref = (
  selection: AnalysisSelection,
  camera?: MapCamera | null,
) => {
  // 사용자가 고른 분기는 왕복 손실 없이 싣고, 지정이 없으면(최신) 생략한다.
  const params = createSelectionSearchParams(selection, true)
  const query = appendCamera(params, camera).toString()
  return query ? `/analysis?${query}` : '/analysis'
}

export const createAnalysisResultHref = (
  selection: AnalysisSelection,
  tab: AnalysisResultTab,
  camera?: MapCamera | null,
) => {
  const params = createSelectionSearchParams(selection, true)
  params.set('tab', tab)
  return `/analysis/result?${appendCamera(params, camera)}`
}

/** AI 리포트는 `/analysis/report` 에 지도가 없으므로 카메라를 받지 않는다. */
export const createAiReportHref = (selection: AnalysisSelection) => {
  const params = createSelectionSearchParams(selection, true)
  return `/analysis/report?${params}`
}

export const selectAdministrationWithParent = (
  selection: AnalysisSelection,
  administrationCode: string,
): AnalysisSelection => ({
  districtCode: resolveDistrictCodeFromAdministration(administrationCode),
  administrationCode,
  commercialCode: null,
  serviceCode: null,
  periodCode: selection.periodCode,
})

export const selectCommercialWithParents = (
  selection: AnalysisSelection,
  {
    commercialCode,
    administrationCode,
  }: {
    commercialCode: string
    administrationCode: string
  },
): AnalysisSelection => ({
  districtCode: resolveDistrictCodeFromAdministration(administrationCode),
  administrationCode,
  commercialCode,
  serviceCode: selection.serviceCode,
  periodCode: selection.periodCode,
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
