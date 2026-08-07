import type { ApiResponse } from '@/types/api'

export type AiReportLevel = 'district' | 'administration' | 'commercial'
export type AiReportSubmissionStatus = 'CACHED' | 'ACCEPTED'
export type AiReportJobStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED'

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

export type AiReportSubmission = {
  submissionStatus: AiReportSubmissionStatus
  jobType: string
  jobId: string | null
  commercialReport: CommercialAiReport | null
}

export type AiReportJob = {
  jobId: string
  jobType: string
  status: AiReportJobStatus
  commercialReport: CommercialAiReport | null
  errorCode: string | null
  errorMessage: string | null
}

export type DistrictAiReportResponse = ApiResponse<RegionAiReport>
export type AdministrationAiReportResponse = ApiResponse<RegionAiReport>
export type CommercialAiReportSubmissionResponse =
  ApiResponse<AiReportSubmission>
export type AiReportJobStatusResponse = ApiResponse<AiReportJob>
