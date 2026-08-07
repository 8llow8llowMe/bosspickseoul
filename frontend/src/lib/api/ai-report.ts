import { apiClient } from '@/lib/api/client'
import type {
  AdministrationAiReportResponse,
  AiReportJob,
  AiReportJobStatusResponse,
  AiReportSubmission,
  CommercialAiReportSubmissionResponse,
  DistrictAiReportResponse,
  RegionAiReport,
} from '@/types/ai-report'

export const aiReportPath = {
  district: (code: string) => `/ai-reports/districts/${code}`,
  administration: (code: string) => `/ai-reports/administrations/${code}`,
  commercialSubmit: (code: string) => `/ai-reports/commercials/${code}`,
  job: (jobId: string) => `/ai-reports/jobs/${jobId}`,
}

export const fetchDistrictAiReport = async (
  districtCode: string,
): Promise<RegionAiReport> => {
  const res = await apiClient.get<DistrictAiReportResponse>(
    aiReportPath.district(districtCode),
  )
  return res.data.dataBody
}

export const fetchAdministrationAiReport = async (
  administrationCode: string,
): Promise<RegionAiReport> => {
  const res = await apiClient.get<AdministrationAiReportResponse>(
    aiReportPath.administration(administrationCode),
  )
  return res.data.dataBody
}

export const submitCommercialAiReport = async (
  commercialCode: string,
): Promise<AiReportSubmission> => {
  const res = await apiClient.post<CommercialAiReportSubmissionResponse>(
    aiReportPath.commercialSubmit(commercialCode),
  )
  return res.data.dataBody
}

export const fetchAiReportJob = async (jobId: string): Promise<AiReportJob> => {
  const res = await apiClient.get<AiReportJobStatusResponse>(
    aiReportPath.job(jobId),
  )
  return res.data.dataBody
}
