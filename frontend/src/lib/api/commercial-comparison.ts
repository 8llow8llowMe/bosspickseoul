/**
 * 상권 A/B 비교 (`commercial-service` `/api/v1/commercials/compare`). 인증 불필요.
 *
 * 이 화면은 예전에 추천 응답을 클라이언트에서 조립해 표를 그렸다. 백엔드가 비교를
 * 정본으로 들고 있고(요약·추천측·주의사항·지표 12묶음), 검증까지 붙였으므로
 * (`COMMERCIAL_103~105`) 그쪽을 쓴다.
 *
 * 대신 **정확히 두 개**만 비교할 수 있다 — 계약에 좌/우 두 자리뿐이다.
 */

import { apiClient } from '@/lib/api/client'
import { ANALYSIS_PERIOD_CODE } from '@/lib/analysis/selection'
import type {
  CommercialComparisonAiQuery,
  CommercialComparisonResponse,
} from '@/types/commercial-comparison'
import type {
  AiReportSubmission,
  CommercialAiReportSubmissionResponse,
} from '@/types/ai-report'

export type CommercialComparisonQuery = {
  leftCommercialCode: string
  rightCommercialCode: string
  serviceCode: string
  periodCode?: string
}

/**
 * 쿼리 문자열을 만든다.
 *
 * 세 코드는 백엔드가 `@NotBlank` 로 막는다(비면 400 + 필드 코드). 여기서 미리
 * 걸러 내지 않는 이유는, 화면이 조건을 다 못 갖춘 상태에서는 애초에 호출하지
 * 않기 때문이다 — 방어를 두 겹으로 두면 어느 쪽이 진짜 규칙인지 흐려진다.
 */
export const buildCommercialComparisonParams = ({
  leftCommercialCode,
  rightCommercialCode,
  serviceCode,
  periodCode = ANALYSIS_PERIOD_CODE,
}: CommercialComparisonQuery): URLSearchParams =>
  new URLSearchParams({
    leftCommercialCode,
    rightCommercialCode,
    serviceCode,
    periodCode,
  })

export const fetchCommercialComparison = async (
  query: CommercialComparisonQuery,
  signal?: AbortSignal,
) => {
  const response = await apiClient.get<CommercialComparisonResponse>(
    `/commercials/compare?${buildCommercialComparisonParams(query)}`,
    { signal },
  )
  return response.data
}

/**
 * 상권 비교 AI 인사이트 제출. **비동기다** — 잡 id 를 받아
 * `fetchAiReportJob` / SSE 로 이어 간다(`use-ai-report.ts` 와 같은 흐름).
 *
 * 로그인이 필요하다(`bearerAuth`). 비교 조회 자체는 인증이 필요 없으므로,
 * 표는 비로그인에게도 보여 주고 이 버튼만 로그인으로 유도한다.
 */
export const submitCommercialComparisonAiReport = async ({
  leftCommercialCode,
  rightCommercialCode,
  serviceCode,
  periodCode = ANALYSIS_PERIOD_CODE,
}: CommercialComparisonAiQuery): Promise<AiReportSubmission> => {
  const params = new URLSearchParams({
    leftCommercialCode,
    rightCommercialCode,
    serviceCode,
    periodCode,
  })
  const response = await apiClient.post<CommercialAiReportSubmissionResponse>(
    `/ai-reports/commercials/comparisons?${params}`,
  )
  return response.data.dataBody
}
