import type { ApiResponse } from '@/types/api'

/**
 * 리포트 대상. `comparison` 만 **대상이 둘**이라(좌·우 상권) `useAiReport` 가
 * `rightCode` 를 함께 받는다 — 나머지 셋은 코드 하나로 끝난다.
 */
export type AiReportLevel =
  | 'district'
  | 'administration'
  | 'commercial'
  | 'comparison'

export type Meta<C extends string = string> = {
  code: C
  name: string
  description: string
}

export type AiReportSubmissionCode = 'CACHED' | 'ACCEPTED'
export type AiReportJobStatusCode =
  | 'PENDING'
  | 'RUNNING'
  | 'COMPLETED'
  | 'FAILED'
export type AiReportJobTypeCode =
  | 'COMMERCIAL'
  | 'COMMERCIAL_COMPARISON'
  | 'DISTRICT'
  | 'ADMINISTRATION'

export type CommercialAiReport = {
  summary: string | null
  strengths: string[] | null
  risks: string[] | null
  recommendedBusinessCategories: string[] | null
  recommendedCustomerSegments: string[] | null
  recommendedOperatingHours: string[] | null
  avoidOperatingHours: string[] | null
  targetAgeGroups: string[] | null
  targetGenders: string[] | null
  operationTips: string[] | null
  businessInsight: string | null
  generatedAt: string | null
}

/**
 * 상권 A/B 비교 AI 리포트.
 *
 * 같은 잡 파이프라인을 타므로 `commercialReport` 와 나란히 `AiReportJob` 에 실려 온다
 * (완료 시 `jobType` 에 해당하는 필드 **하나만** 채워진다).
 *
 * `recommendedSide` 는 `/commercials/compare` 의 `recommendedSide` 와 달리
 * 메타데이터가 아니라 **문자열**이다 — 두 응답을 섞어 쓰지 않는다.
 */
export type CommercialComparisonAiReport = {
  summary: string | null
  recommendedSide: string | null
  recommendedReasons: string[] | null
  riskComparison: string | null
  timeSlotInsight: string | null
  customerSegmentInsight: string | null
  operationStrategy: string[] | null
  businessInsight: string | null
  generatedAt: string | null
}

export type RegionAiReport = {
  summary: string | null
  marketStatus: string | null
  recommendedBusinessCategories: string[] | null
  cautionBusinessCategories: string[] | null
  businessInsight: string | null
  generatedAt: string | null
}

// 완료 리포트는 jobType.code에 해당하는 필드 하나만 채워진다.
type ReportFields = {
  commercialReport: CommercialAiReport | null
  commercialComparisonReport: CommercialComparisonAiReport | null
  districtReport: RegionAiReport | null
  administrationReport: RegionAiReport | null
}

export type AiReportSubmission = ReportFields & {
  submissionStatus: Meta<AiReportSubmissionCode>
  jobType: Meta<AiReportJobTypeCode>
  jobId: string | null
}

export type AiReportJob = ReportFields & {
  jobId: string
  jobType: Meta<AiReportJobTypeCode>
  status: Meta<AiReportJobStatusCode>
  progressMessages: string[] | null
  errorCode: string | null
  errorMessage: string | null
}

export type DistrictAiReportSubmissionResponse = ApiResponse<AiReportSubmission>
export type AdministrationAiReportSubmissionResponse =
  ApiResponse<AiReportSubmission>
export type CommercialAiReportSubmissionResponse =
  ApiResponse<AiReportSubmission>
export type AiReportJobStatusResponse = ApiResponse<AiReportJob>
