'use client'

import styled from 'styled-components'
import { useQuery } from '@tanstack/react-query'
import { fetchSharedSimulationPayload } from '@/lib/api/share'
import { createSimulationReport } from '@/lib/api/simulation'
import { getApiMessage, isApiSuccess } from '@/lib/api/response'
import SimulationReportView from './simulation-report-view'

const EmptyState = styled.div`
  width: min(720px, calc(100% - 48px));
  margin: 72px auto;
  padding: 32px 24px;
  border: 1px dashed var(--color-border-300);
  border-radius: var(--radius-card);
  background: white;
  color: var(--color-text-500);
  line-height: 1.8;
`

type SharedSimulationReportPageProps = {
  token: string
}

export default function SharedSimulationReportPage({
  token,
}: SharedSimulationReportPageProps) {
  const payloadQuery = useQuery({
    queryKey: ['sharedSimulationPayload', token],
    queryFn: () => fetchSharedSimulationPayload(token),
  })

  const request =
    payloadQuery.data && isApiSuccess(payloadQuery.data)
      ? payloadQuery.data.dataBody.input
      : null

  const reportQuery = useQuery({
    queryKey: ['sharedSimulationReport', token, request],
    queryFn: () => createSimulationReport(request!),
    enabled: Boolean(request),
  })

  if (payloadQuery.isPending) {
    return <EmptyState>공유된 시뮬레이션 정보를 불러오는 중입니다.</EmptyState>
  }

  if (!payloadQuery.data || !isApiSuccess(payloadQuery.data) || !request) {
    return (
      <EmptyState>
        {getApiMessage(payloadQuery.data, '공유 링크를 확인해주세요.')}
      </EmptyState>
    )
  }

  if (reportQuery.isPending) {
    return <EmptyState>공유된 창업 비용 리포트를 계산하는 중입니다.</EmptyState>
  }

  if (!reportQuery.data || !isApiSuccess(reportQuery.data)) {
    return (
      <EmptyState>
        {getApiMessage(
          reportQuery.data,
          '공유된 리포트를 생성하지 못했습니다.',
        )}
      </EmptyState>
    )
  }

  return (
    <SimulationReportView
      eyebrow="Shared Report"
      title={`${request.gugun} ${request.serviceCodeName} 공유 리포트`}
      description="카카오 공유 링크를 통해 전달된 시뮬레이션 입력값으로 다시 계산한 창업 비용 리포트입니다."
      request={request}
      report={reportQuery.data.dataBody}
      backHref="/analysis/simulation"
    />
  )
}
