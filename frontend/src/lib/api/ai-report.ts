import { apiClient } from '@/lib/api/client'
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

/*
  제출에는 **선택(해석)된 분기**를 보낸다(period-catalog.md D4-3). 예전에는 기본 인자로 상수를 보내
  사용자가 지난 분기를 보고 있어도 리포트는 최신 분기로 나갔다.
*/
export const submitDistrictAiReport = async (
  code: string,
  periodCode: string,
): Promise<AiReportSubmission> => {
  const res = await apiClient.post<DistrictAiReportSubmissionResponse>(
    buildDistrictSubmitPath(code, periodCode),
  )
  return res.data.dataBody
}

export const submitAdministrationAiReport = async (
  code: string,
  periodCode: string,
): Promise<AiReportSubmission> => {
  const res = await apiClient.post<AdministrationAiReportSubmissionResponse>(
    buildAdministrationSubmitPath(code, periodCode),
  )
  return res.data.dataBody
}

export const submitCommercialAiReport = async (
  commercialCode: string,
  serviceCode: string,
  periodCode: string,
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
