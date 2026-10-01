/**
 * 리포트 섹션 표시 판정.
 *
 * `genderAgeAnalysis`와 `seasonAnalysis`는 해당 자치구×업종의 매출 데이터가 없으면 **null**로 온다.
 * 이건 **오류가 아니다** — 오류 화면·재시도 버튼을 띄우면 안 되고 해당 섹션만 숨긴다.
 * (`@/lib/api/api-error`의 `kind`는 HTTP 실패를 분류하는 것이고, 여기는 200 성공 응답 안의 결측이다.
 *  둘을 섞지 않으려고 판정을 이 모듈로 따로 뺐다.)
 */

import type {
  SimulationGenderAgeAnalysis,
  SimulationReport,
  SimulationSeasonAnalysis,
} from '@/types/simulation'

/**
 * 성별·연령 섹션을 그릴 수 있는가.
 * null뿐 아니라 `topAgeGroups`가 비어 있는 경우도 그릴 것이 없으므로 함께 숨긴다.
 */
export const hasGenderAgeAnalysis = (
  analysis: SimulationGenderAgeAnalysis | null | undefined,
): analysis is SimulationGenderAgeAnalysis =>
  analysis != null &&
  Array.isArray(analysis.topAgeGroups) &&
  analysis.topAgeGroups.length > 0

/**
 * 성수기 섹션을 그릴 수 있는가.
 * 성수기·비성수기 어느 쪽이든 값이 있으면 보여준다 — 한쪽만 비는 경우가 있다.
 */
export const hasSeasonAnalysis = (
  analysis: SimulationSeasonAnalysis | null | undefined,
): analysis is SimulationSeasonAnalysis =>
  analysis != null &&
  (analysis.peakMonths?.length > 0 || analysis.offPeakMonths?.length > 0)

/** 프랜차이즈 창업일 때만 가맹 부담금(`levy`)이 있다. 비프랜차이즈면 null이라 항목을 감춘다. */
export const hasFranchiseeLevy = (report: SimulationReport): boolean =>
  report.costDetail.levy !== null && report.costDetail.levy !== undefined

/**
 * 「2024년 자료로 계산한 결과예요」 안내 문구 — 입력 화면 결과 카드처럼 **비용만** 보여 주는 곳에 쓴다.
 * `dataBaseYear`는 화면 노출이 **필수**다 — 언제 기준 데이터인지 밝히지 않으면 최신 시세로 오인된다.
 */
export const formatDataBaseYearNotice = (dataBaseYear: string): string =>
  `${dataBaseYear}년 자료로 계산한 결과예요.`

/**
 * 리포트 상단 기준 안내 — **출처별로 한 번에** 밝힌다(R4).
 *
 * 리포트에는 기준 시점이 둘이다. BE 는 임대료·인테리어(업종)·권리금·가맹 정보를 `dataBaseYear`
 * 연도 자료로 조회하고(`simulationProperties.dataBaseYear()`), 고객 지표·성수기는 `periodCode`
 * 분기 매출로 집계한다. 상단에 「2024년 기준」만 두면 아래 섹션의 「2026년 1분기 기준」과 설명 없이
 * 어긋나 보였다. 고객·성수기 섹션이 둘 다 숨으면(데이터 없음) 두 번째 문장도 뺀다 — 없는 섹션의
 * 기준을 적으면 무엇을 가리키는지 알 수 없다. 분기 형식이 어긋나도 지어내지 않고 뺀다.
 */
export const describeReportDataBasis = (report: SimulationReport): string => {
  const cost = `비용·권리금은 ${report.dataBaseYear}년 자료로 계산했어요.`

  const salesSections = [
    hasGenderAgeAnalysis(report.genderAgeAnalysis) ? '고객 지표' : null,
    hasSeasonAnalysis(report.seasonAnalysis) ? '성수기' : null,
  ].filter((label): label is string => label !== null)
  const period = report.condition.periodCode
  if (salesSections.length === 0 || !/^\d{4}[1-4]$/.test(period)) return cost

  return `${cost} ${salesSections.join('·')}는 ${period.slice(0, 4)}년 ${period.slice(4)}분기 매출 기준이에요.`
}
