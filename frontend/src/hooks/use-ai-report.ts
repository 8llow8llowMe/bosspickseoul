'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from '@tanstack/react-query'

import {
  submitAdministrationAiReport,
  submitCommercialAiReport,
  submitDistrictAiReport,
  fetchAiReportJob,
} from '@/lib/api/ai-report'
import {
  toCommercialReportView,
  toRegionReportView,
  isCommercialReportEmpty,
  isRegionReportEmpty,
  type CommercialReportView,
  type RegionReportView,
} from '@/lib/analysis/ai-report-presentation'
import {
  AI_REPORT_POLL_TIMEOUT_MS,
  decideNextPoll,
  jobIdFromSubmission,
  reportFromJob,
  reportFromSubmission,
} from '@/lib/analysis/ai-report-poll'
import type {
  AiReportJob,
  AiReportLevel,
  AiReportSubmission,
  CommercialAiReport,
  RegionAiReport,
} from '@/types/ai-report'

export type AiReportStage = { name: string; description: string }
export type AiReportErrorKind =
  | 'unauth'
  | 'not-found'
  | 'unavailable'
  | 'timeout'
  | 'generic'
export type AiReportState =
  | { status: 'idle' }
  | { status: 'loading'; stage: AiReportStage | null; progressMessages: string[] }
  | { status: 'ready-commercial'; view: CommercialReportView }
  | { status: 'ready-region'; view: RegionReportView }
  | { status: 'empty' }
  | {
      status: 'error'
      message: string
      errorKind: AiReportErrorKind
      canRetry: boolean
    }

type UseAiReportArgs = {
  level: AiReportLevel | null
  code: string | null
  serviceCode: string | null
  active: boolean
  enabled: boolean
}

const submitFor = (
  level: AiReportLevel,
  code: string,
  serviceCode: string | null,
): Promise<AiReportSubmission> => {
  if (level === 'district') return submitDistrictAiReport(code)
  if (level === 'administration') return submitAdministrationAiReport(code)
  return submitCommercialAiReport(code, serviceCode!)
}

export const classifyError = (errorCode: string | null): AiReportErrorKind => {
  if (errorCode?.startsWith('SECURITY_')) return 'unauth'
  if (errorCode === 'AI_005') return 'not-found'
  if (errorCode === 'AI_002') return 'unavailable'
  if (errorCode === 'AI_009' || errorCode === 'TIMEOUT') return 'timeout'
  return 'generic'
}

export const useAiReport = ({
  level,
  code,
  serviceCode,
  active,
  enabled,
}: UseAiReportArgs): { state: AiReportState; retry: () => void } => {
  const queryClient = useQueryClient()
  const canCommercial = level === 'commercial' ? Boolean(serviceCode) : true
  const on = enabled && active && Boolean(level && code) && canCommercial

  const submitQuery = useQuery({
    queryKey: ['ai-report', 'submit', level, code, serviceCode],
    queryFn: () => submitFor(level!, code!, serviceCode),
    enabled: on,
    retry: 0,
    staleTime: 5 * 60 * 1000,
  })

  const cachedReport = submitQuery.data
    ? reportFromSubmission(submitQuery.data, level!)
    : null
  const jobId = submitQuery.data ? jobIdFromSubmission(submitQuery.data) : null

  // 타임아웃: 렌더 중 Date.now()를 읽지 않고 (jobId, attempt)별 타이머가 마감 시각에
  // 한 번 상태를 뒤집는다. attempt는 retry마다 증가하는 nonce.
  const [attempt, setAttempt] = useState(0)
  const [timedOutKey, setTimedOutKey] = useState<string | null>(null)
  const currentKey = jobId !== null ? `${jobId}:${attempt}` : null
  useEffect(() => {
    if (!jobId) return
    const key = `${jobId}:${attempt}`
    const timer = setTimeout(
      () => setTimedOutKey(key),
      AI_REPORT_POLL_TIMEOUT_MS,
    )
    return () => clearTimeout(timer)
  }, [jobId, attempt])
  const pollTimedOut = currentKey !== null && timedOutKey === currentKey
  const pollElapsedMs = pollTimedOut ? AI_REPORT_POLL_TIMEOUT_MS : 0

  const jobQuery = useQuery({
    queryKey: ['ai-report', 'job', jobId],
    queryFn: () => fetchAiReportJob(jobId!),
    enabled: on && Boolean(jobId) && !cachedReport,
    retry: 0,
    refetchInterval: query => {
      const decision = decideNextPoll(query.state.data, pollElapsedMs)
      return decision.kind === 'poll' ? decision.intervalMs : false
    },
    refetchIntervalInBackground: false,
  })

  const retry = useCallback(() => {
    setAttempt(a => a + 1)
    void queryClient.invalidateQueries({
      queryKey: ['ai-report', 'submit', level, code, serviceCode],
    })
    if (jobId) {
      void queryClient.invalidateQueries({
        queryKey: ['ai-report', 'job', jobId],
      })
    }
  }, [queryClient, level, code, serviceCode, jobId])

  const state = deriveState({
    on,
    level,
    submitQuery,
    jobQuery,
    cachedReport,
    jobId,
    pollElapsedMs,
  })

  return { state, retry }
}

const buildReady = (
  level: AiReportLevel,
  report: CommercialAiReport | RegionAiReport,
): AiReportState => {
  if (level === 'commercial') {
    const view = toCommercialReportView(report as CommercialAiReport)
    return isCommercialReportEmpty(view)
      ? { status: 'empty' }
      : { status: 'ready-commercial', view }
  }
  const view = toRegionReportView(report as RegionAiReport)
  return isRegionReportEmpty(view)
    ? { status: 'empty' }
    : { status: 'ready-region', view }
}

const loadingFromJob = (job: AiReportJob | undefined): AiReportState => ({
  status: 'loading',
  stage: job ? { name: job.status.name, description: job.status.description } : null,
  progressMessages: job?.progressMessages ?? [],
})

const deriveState = (a: {
  on: boolean
  level: AiReportLevel | null
  submitQuery: UseQueryResult<AiReportSubmission>
  jobQuery: UseQueryResult<AiReportJob>
  cachedReport: CommercialAiReport | RegionAiReport | null
  jobId: string | null
  pollElapsedMs: number
}): AiReportState => {
  if (!a.on || !a.level) return { status: 'idle' }

  if (a.submitQuery.isError) {
    return {
      status: 'error',
      message: 'AI 리포트 요청에 실패했습니다.',
      errorKind: 'generic',
      canRetry: true,
    }
  }
  if (a.cachedReport) return buildReady(a.level, a.cachedReport)
  if (a.submitQuery.isPending) {
    return { status: 'loading', stage: null, progressMessages: [] }
  }
  if (!a.jobId) return { status: 'loading', stage: null, progressMessages: [] }

  const decision = decideNextPoll(a.jobQuery.data, a.pollElapsedMs)
  if (decision.kind === 'error') {
    return {
      status: 'error',
      message: decision.message,
      errorKind: classifyError(decision.errorCode),
      canRetry: true,
    }
  }
  if (decision.kind === 'ready') {
    const report = reportFromJob(a.jobQuery.data!, a.level)
    return report
      ? buildReady(a.level, report)
      : {
          status: 'error',
          message: '리포트를 불러오지 못했습니다.',
          errorKind: 'generic',
          canRetry: true,
        }
  }
  return loadingFromJob(a.jobQuery.data)
}
