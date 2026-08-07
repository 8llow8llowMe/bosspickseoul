import { apiClient } from '@/lib/api/client'
import { ANALYSIS_PERIOD_CODE } from '@/lib/analysis/selection'
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
  job: (jobId: string) => `/ai-reports/jobs/${jobId}`,
}

export const buildCommercialSubmitPath = (
  commercialCode: string,
  serviceCode: string,
  periodCode: string,
): string =>
  `/ai-reports/commercials/${commercialCode}?serviceCode=${serviceCode}&periodCode=${periodCode}`

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
  serviceCode: string,
  periodCode: string = ANALYSIS_PERIOD_CODE,
): Promise<AiReportSubmission> => {
  const res = await apiClient.post<CommercialAiReportSubmissionResponse>(
    buildCommercialSubmitPath(commercialCode, serviceCode, periodCode),
  )
  return res.data.dataBody
}

export const fetchAiReportJob = async (jobId: string): Promise<AiReportJob> => {
  const res = await apiClient.get<AiReportJobStatusResponse>(
    aiReportPath.job(jobId),
  )
  return res.data.dataBody
}
