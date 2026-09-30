import type { ApiResponse } from '@/types/api'
import type { CodeNameDescriptionMetadata } from '@/types/recommend'

/**
 * 상권 A/B 비교 (`GET /api/v1/commercials/compare`).
 *
 * ⚠️ **정확히 두 개다.** 백엔드 계약이 `leftCommercialCode` / `rightCommercialCode`
 * 두 자리뿐이라 N개 비교가 없다. 화면의 상한(`COMPARE_MAX_COMMERCIALS`)도 여기에 맞춰
 * 2로 맞춰 두었다 — 늘리려면 백엔드 계약이 먼저 바뀌어야 한다.
 *
 * ⚠️ 이 응답은 **판단을 담고 있다**(`recommendedSide`, `winnerSide`, `recommendedReasons`).
 * 지표 표는 그 판단을 색으로 옮기지 않는다 — 중립 원칙은
 * `compare-presentation.ts` 의 `COMPARE_NEUTRAL_NOTICE` 에 적힌 그대로 유지하고,
 * 승자·추천 이유는 **리포트 영역에서만** 말한다.
 */

/** 비교 대상 한쪽의 신원. 표 머리에 쓴다. */
export type CommercialComparisonTarget = {
  commercialCode: string
  commercialName: string
  districtCode: string
  districtName: string
  administrationCode: string
  administrationName: string
}

/**
 * 지표 한 줄. `diffValue` 는 **좌 - 우** 이고 `diffRate` 는 %다(이미 ×100 된 값).
 *
 * `winnerSide` 는 백엔드의 판단이다. 표에서는 읽지 않는다(위 주석).
 *
 * 표시 메타 4종(BE #381)은 **선택**이다. 순차 배포 중 구버전 응답에는 없고, 없으면
 * 그 필드만 기존 표시로 물러난다(`docs/features/recommend/compare.md` D5-1). 한글
 * `label` 에서 단위를 추측하지 않는다.
 */
export type ComparisonMetric = {
  label: string
  leftValue: number | null
  rightValue: number | null
  diffValue: number | null
  diffRate: number | null
  /** 좌·우 값 단위: `원`·`명`·`건`·`개`·`%`. */
  unit?: string | null
  /** 화면 표시 소수 자릿수(0 또는 1). */
  displayPrecision?: number | null
  /** 차이 단위: 비율 지표는 `%p`, 나머지는 `unit` 과 같다. */
  differenceUnit?: string | null
  /** 지표의 집계·해석 기준. 지표명 옆 도움말로 쓴다. */
  description?: string | null
  winnerSide: CodeNameDescriptionMetadata
}

/** 묶음 안내. `code` 는 지표 배열 필드명(`salesMetrics` 등)과 같다. */
export type ComparisonMetricGroupGuide = {
  code: string
  name: string | null
  description: string | null
}

/** 비교 수치·추천 해석 안내(BE #381). 문장은 **그대로 표시**하는 한국어다. */
export type ComparisonGuide = {
  periodBasis: string | null
  serviceBasis: string | null
  differenceBasis: string | null
  diffRateBasis: string | null
  recommendationDisclaimer: string | null
  metricGroups: ComparisonMetricGroupGuide[] | null
}

/**
 * 지표 묶음의 키. 백엔드 응답의 필드명을 그대로 쓴다 —
 * 화면이 자기 이름을 따로 만들면 응답에 묶음이 추가될 때 조용히 빠진다.
 */
export const COMPARISON_METRIC_GROUPS = [
  'salesMetrics',
  'footTrafficMetrics',
  'storeMetrics',
  'spendingMetrics',
  'residentPopulationMetrics',
  'facilityMetrics',
  'salesTimeSlotMetrics',
  'salesAgeMetrics',
  'salesAgeGenderMetrics',
  'footTrafficTimeSlotMetrics',
  'footTrafficAgeMetrics',
  'footTrafficAgeGenderMetrics',
] as const

export type ComparisonMetricGroupKey = (typeof COMPARISON_METRIC_GROUPS)[number]

/** 묶음별 한글 라벨. 표의 소제목이다. */
export const COMPARISON_METRIC_GROUP_LABELS: Record<
  ComparisonMetricGroupKey,
  string
> = {
  salesMetrics: '매출',
  footTrafficMetrics: '유동인구',
  storeMetrics: '점포',
  spendingMetrics: '소비력',
  residentPopulationMetrics: '거주인구',
  facilityMetrics: '시설',
  salesTimeSlotMetrics: '매출 시간대',
  salesAgeMetrics: '매출 연령대',
  salesAgeGenderMetrics: '매출 연령·성별',
  footTrafficTimeSlotMetrics: '유동인구 시간대',
  footTrafficAgeMetrics: '유동인구 연령대',
  footTrafficAgeGenderMetrics: '유동인구 연령·성별',
}

export type CommercialComparisonBody = {
  left: CommercialComparisonTarget | null
  right: CommercialComparisonTarget | null
  /** 실제 조회에 쓴 분기 코드. 구버전 응답에는 없다. */
  periodCode?: string | null
  /** 실제 조회에 쓴 서비스 업종 코드. 구버전 응답에는 없다. */
  serviceCode?: string | null
  comparisonGuide?: ComparisonGuide | null
  /** 아래 넷은 백엔드의 판단이다 — 리포트 영역 전용. */
  comparisonSummary: string | null
  recommendedSide: CodeNameDescriptionMetadata
  recommendedReasons: string[] | null
  cautionPoints: string[] | null
  businessFitSummary: string | null
  dominantTimeSlots: string[] | null
  dominantAgeGroups: string[] | null
  comparisonHighlights: string[] | null
  highlights: string[] | null
} & Record<ComparisonMetricGroupKey, ComparisonMetric[] | null>

export type CommercialComparisonResponse = ApiResponse<CommercialComparisonBody>

/** 상권 비교 AI 인사이트 제출 (`POST /ai-reports/commercials/comparisons`). 비동기. */
export type CommercialComparisonAiQuery = {
  leftCommercialCode: string
  rightCommercialCode: string
  serviceCode: string
  periodCode?: string
}
