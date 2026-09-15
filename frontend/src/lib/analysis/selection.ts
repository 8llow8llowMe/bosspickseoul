import {
  MAP_CAMERA_PARAM,
  serializeMapCamera,
  type MapCamera,
} from '@/lib/analysis/map-camera'
import { resolveDistrictCodeFromAdministration } from '@/lib/map/geometry'

/**
 * 적재가 끝난 **최신 분기**. 기본값이면서 동시에 드롭다운 옵션의 **상한**이다.
 * 다음 분기가 적재되면 이 상수만 올리면 연도 목록과 분기 목록이 같이 따라온다.
 */
export const ANALYSIS_PERIOD_CODE = '20261' as const

/** 적재가 시작되는 연도. 이 아래 분기는 팩트 테이블에 없다. */
export const ANALYSIS_PERIOD_FIRST_YEAR = 2021

/** `YYYYQ` 기간 코드 형식. URL 에서 읽은 값이 이 형식이 아니면 기본값으로 폐기한다. */
export const ANALYSIS_PERIOD_CODE_PATTERN = /^\d{4}[1-4]$/

/** `YYYYQ` 기간 코드(예: '20233' = 2023년 3분기)를 연/분기로 분해한다. */
export const parseAnalysisPeriod = (
  code: string,
): { year: number; quarter: number } => ({
  year: Number(code.slice(0, 4)),
  quarter: Number(code.slice(4)),
})

/** 연/분기를 `YYYYQ` 기간 코드로 합친다. */
export const buildAnalysisPeriod = (year: number, quarter: number): string =>
  `${year}${quarter}`

const LATEST_PERIOD = parseAnalysisPeriod(ANALYSIS_PERIOD_CODE)

/** 기간 선택 드롭다운에서 제공하는 연도 옵션. 최신 분기의 연도까지만 연다. */
export const ANALYSIS_PERIOD_YEARS: readonly number[] = Array.from(
  { length: LATEST_PERIOD.year - ANALYSIS_PERIOD_FIRST_YEAR + 1 },
  (_, index) => ANALYSIS_PERIOD_FIRST_YEAR + index,
)

const ALL_QUARTERS = [1, 2, 3, 4] as const

/**
 * 그 연도에 **실제로 데이터가 있는** 분기 목록.
 *
 * 최신 연도는 적재된 분기까지만 연다 — 2026년은 1분기만 있으므로 2·3·4분기를 고르면
 * 빈 화면이 된다. 지난 연도는 네 분기가 모두 차 있다. 다음 분기가 적재되면
 * {@link ANALYSIS_PERIOD_CODE} 만 올리면 되고 이 함수는 손대지 않는다.
 */
export const analysisPeriodQuartersOf = (year: number): readonly number[] => {
  if (year > LATEST_PERIOD.year || year < ANALYSIS_PERIOD_FIRST_YEAR) return []
  if (year < LATEST_PERIOD.year) return ALL_QUARTERS
  return ALL_QUARTERS.slice(0, LATEST_PERIOD.quarter)
}

/**
 * 연도를 바꿀 때 쓸 분기. 고르고 있던 분기가 새 연도에 없으면 그 연도의 **마지막
 * 분기**로 내린다 — 2023년 4분기를 보다가 2026년으로 옮기면 1분기가 된다.
 */
export const clampQuarterToYear = (year: number, quarter: number): number => {
  const quarters = analysisPeriodQuartersOf(year)
  if (quarters.length === 0) return quarter
  return quarters.includes(quarter) ? quarter : quarters[quarters.length - 1]
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
   */
  periodCode: string
}

type SearchParamsReader = {
  get(name: string): string | null
}

const readCode = (params: SearchParamsReader, name: string): string | null => {
  const value = params.get(name)?.trim()
  return value ? value : null
}

/**
 * `YYYYQ` 형식이고 **드롭다운이 실제로 제공하는 연/분기**인지 검사한다.
 *
 * 형식만 보면 부족하다: 기간 선택은 `<select>` 라서 옵션에 없는 값을 주면 브라우저가
 * 조용히 첫 옵션을 그린다 — 그러면 헤더는 "2024년 1분기 기준", 드롭다운은 "2021년"을
 * 가리키는 어긋난 화면이 된다. 선택 가능한 값으로 좁혀 URL 과 UI 가 항상 일치하게 한다.
 *
 * 연도별로 열려 있는 분기가 다르므로({@link analysisPeriodQuartersOf}) 연도·분기를 따로
 * 보면 `20264` 같은 미적재 조합이 통과한다. 두 축을 함께 본다.
 */
export const isSupportedAnalysisPeriod = (value: string): boolean => {
  if (!ANALYSIS_PERIOD_CODE_PATTERN.test(value)) return false
  const { year, quarter } = parseAnalysisPeriod(value)
  return analysisPeriodQuartersOf(year).includes(quarter)
}

/**
 * URL 의 `periodCode` 를 읽는다. 지원하지 않는 값은 **조용히** 기본 분기로 폐기한다 —
 * 기간은 뷰 상태가 아니라 분석 조건이지만, 손편집·낡은 링크의 코드로 백엔드를 때리는
 * 대신 기본 분기를 보여 주는 편이 사용자에게 낫다.
 */
const readPeriodCode = (params: SearchParamsReader): string => {
  const value = readCode(params, 'periodCode')
  return value && isSupportedAnalysisPeriod(value)
    ? value
    : ANALYSIS_PERIOD_CODE
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
  if (includePeriod) {
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
  const params = createSelectionSearchParams(selection, false)
  // 탐색 화면은 기간을 쓰지 않으므로 기본 분기면 파라미터를 생략한다(기존 출력 유지).
  // 사용자가 결과 화면에서 고른 비기본 분기만 왕복 손실 없이 실어 보낸다.
  if (selection.periodCode !== ANALYSIS_PERIOD_CODE) {
    params.set('periodCode', selection.periodCode)
  }
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
