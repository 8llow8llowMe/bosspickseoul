import type { ApiResponse } from '@/types/api'

export type AiReportLevel = 'district' | 'administration' | 'commercial'

export type Meta<C extends string = string> = {
  code: C
  name: string
  description: string
}

export type AiReportSubmissionCode = 'CACHED' | 'ACCEPTED'
export type AiReportJobStatusCode = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED'
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
export type CommercialAiReportSubmissionResponse = ApiResponse<AiReportSubmission>
export type AiReportJobStatusResponse = ApiResponse<AiReportJob>
