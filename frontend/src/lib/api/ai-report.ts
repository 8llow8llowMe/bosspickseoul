import { apiClient } from '@/lib/api/client'
import { ANALYSIS_PERIOD_CODE } from '@/lib/analysis/selection'
import type {
  AdministrationAiReportSubmissionResponse,
  AiReportJob,
  AiReportJobStatusResponse,
  AiReportSubmission,
  CommercialAiReportSubmissionResponse,
  DistrictAiReportSubmissionResponse,
} from '@/types/ai-report'

export const aiReportPath = {
  job: (jobId: string) => `/ai-reports/jobs/${jobId}`,
}

export const buildDistrictSubmitPath = (
  code: string,
  periodCode: string,
): string => `/ai-reports/districts/${code}?periodCode=${periodCode}`

export const buildAdministrationSubmitPath = (
  code: string,
  periodCode: string,
): string => `/ai-reports/administrations/${code}?periodCode=${periodCode}`

export const buildCommercialSubmitPath = (
  commercialCode: string,
  serviceCode: string,
  periodCode: string,
): string =>
  `/ai-reports/commercials/${commercialCode}?serviceCode=${serviceCode}&periodCode=${periodCode}`

export const submitDistrictAiReport = async (
  code: string,
  periodCode: string = ANALYSIS_PERIOD_CODE,
): Promise<AiReportSubmission> => {
  const res = await apiClient.post<DistrictAiReportSubmissionResponse>(
    buildDistrictSubmitPath(code, periodCode),
  )
  return res.data.dataBody
}

export const submitAdministrationAiReport = async (
  code: string,
  periodCode: string = ANALYSIS_PERIOD_CODE,
): Promise<AiReportSubmission> => {
  const res = await apiClient.post<AdministrationAiReportSubmissionResponse>(
    buildAdministrationSubmitPath(code, periodCode),
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
