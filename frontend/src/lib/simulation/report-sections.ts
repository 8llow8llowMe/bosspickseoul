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
 * "2024년 기준 데이터로 계산된 결과입니다" 안내 문구.
 * `dataBaseYear`는 화면 노출이 **필수**다 — 언제 기준 데이터인지 밝히지 않으면 최신 시세로 오인된다.
 */
export const formatDataBaseYearNotice = (dataBaseYear: string): string =>
  `${dataBaseYear}년 기준 데이터로 계산된 결과입니다.`
