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
import { submitCommercialComparisonAiReport } from '@/lib/api/commercial-comparison'
import { subscribeJobStream } from '@/lib/analysis/ai-report-sse'
import {
  toCommercialReportView,
  toComparisonReportView,
  toRegionReportView,
  isCommercialReportEmpty,
  isComparisonReportEmpty,
  isRegionReportEmpty,
  type CommercialReportView,
  type ComparisonReportView,
  type RegionReportView,
} from '@/lib/analysis/ai-report-presentation'
import {
  AI_REPORT_POLL_TIMEOUT_MS,
  decideNextPoll,
  jobIdFromSubmission,
  reportFromJob,
  reportFromSubmission,
  type AnyAiReport,
} from '@/lib/analysis/ai-report-poll'
import type {
  AiReportJob,
  AiReportLevel,
  AiReportSubmission,
  CommercialAiReport,
  CommercialComparisonAiReport,
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
  | {
      status: 'loading'
      stage: AiReportStage | null
      progressMessages: string[]
    }
  | { status: 'ready-commercial'; view: CommercialReportView }
  | { status: 'ready-comparison'; view: ComparisonReportView }
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
  /**
   * 비교(`level === 'comparison'`) 전용 **우측** 상권 코드. 그때 `code` 는 좌측이다.
   * 다른 대상은 코드가 하나뿐이라 쓰지 않는다.
   */
  rightCode?: string | null
}

const submitFor = (
  level: AiReportLevel,
  code: string,
  serviceCode: string | null,
  rightCode: string | null,
): Promise<AiReportSubmission> => {
  if (level === 'district') return submitDistrictAiReport(code)
  if (level === 'administration') return submitAdministrationAiReport(code)
  if (level === 'comparison') {
    return submitCommercialComparisonAiReport({
      leftCommercialCode: code,
      rightCommercialCode: rightCode!,
      serviceCode: serviceCode!,
    })
  }
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
  rightCode = null,
}: UseAiReportArgs): { state: AiReportState; retry: () => void } => {
  const queryClient = useQueryClient()
  const canCommercial = level === 'commercial' ? Boolean(serviceCode) : true
  // 비교는 **양쪽 코드와 업종이 다 있어야** 요청이 성립한다.
  const canCompare =
    level === 'comparison' ? Boolean(serviceCode && rightCode) : true
  const on =
    enabled && active && Boolean(level && code) && canCommercial && canCompare

  const submitQuery = useQuery({
    queryKey: ['ai-report', 'submit', level, code, rightCode, serviceCode],
    queryFn: () => submitFor(level!, code!, serviceCode, rightCode),
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

  // SSE 우선 구독 상태. jobId/attempt가 바뀌면 초기화한다.
  // (렌더 중 상태 조정 패턴: effect가 아니라 렌더 도중 key 변화를 감지해 직접
  // setState한다 — react-hooks/set-state-in-effect 회피 + 리렌더 1회로 처리)
  const [sseJob, setSseJob] = useState<AiReportJob | null>(null)
  const [pollingFallback, setPollingFallback] = useState(false)
  const [resetKey, setResetKey] = useState(currentKey)
  if (resetKey !== currentKey) {
    setResetKey(currentKey)
    setSseJob(null)
    setPollingFallback(false)
  }

  // SSE로 job 스냅샷을 받는다. 종결(COMPLETED/FAILED) 없이 스트림이
  // 닫히거나 에러가 나면 폴링으로 폴백한다. jobId/level 변경·언마운트 시 정리.
  // attempt를 deps에 포함: 재시도 시 서버가 동일 jobId를 그대로 돌려줘도
  // (idempotent) 재구독이 강제되어야 한다. 그렇지 않으면 렌더 중 리셋으로
  // pollingFallback이 false로 꺾이는데 SSE는 재구독되지 않아 두 전송 모두
  // 멈춘 채로 loading에 고립된다.
  useEffect(() => {
    if (!on || !jobId || cachedReport) return
    const controller = new AbortController()
    let terminal = false
    void subscribeJobStream(
      jobId,
      {
        onEvent: job => {
          setSseJob(job)
          if (job.status.code === 'COMPLETED' || job.status.code === 'FAILED') {
            terminal = true
          }
        },
        onDone: () => {
          if (!terminal) setPollingFallback(true)
        },
        onError: () => setPollingFallback(true),
      },
      controller.signal,
    )
    return () => controller.abort()
  }, [on, jobId, cachedReport, attempt])

  const jobQuery = useQuery({
    queryKey: ['ai-report', 'job', jobId],
    queryFn: () => fetchAiReportJob(jobId!),
    enabled: on && Boolean(jobId) && !cachedReport && pollingFallback,
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
      queryKey: ['ai-report', 'submit', level, code, rightCode, serviceCode],
    })
    if (jobId) {
      void queryClient.invalidateQueries({
        queryKey: ['ai-report', 'job', jobId],
      })
    }
  }, [queryClient, level, code, rightCode, serviceCode, jobId])

  const state = deriveState({
    on,
    level,
    submitQuery,
    jobQuery,
    sseJob,
    pollingFallback,
    cachedReport,
    jobId,
    pollElapsedMs,
  })

  return { state, retry }
}

const buildReady = (
  level: AiReportLevel,
  report: AnyAiReport,
): AiReportState => {
  if (level === 'commercial') {
    const view = toCommercialReportView(report as CommercialAiReport)
    return isCommercialReportEmpty(view)
      ? { status: 'empty' }
      : { status: 'ready-commercial', view }
  }
  if (level === 'comparison') {
    const view = toComparisonReportView(report as CommercialComparisonAiReport)
    return isComparisonReportEmpty(view)
      ? { status: 'empty' }
      : { status: 'ready-comparison', view }
  }
  const view = toRegionReportView(report as RegionAiReport)
  return isRegionReportEmpty(view)
    ? { status: 'empty' }
    : { status: 'ready-region', view }
}

const loadingFromJob = (job: AiReportJob | undefined): AiReportState => ({
  status: 'loading',
  stage: job
    ? { name: job.status.name, description: job.status.description }
    : null,
  progressMessages: job?.progressMessages ?? [],
})

const deriveState = (a: {
  on: boolean
  level: AiReportLevel | null
  submitQuery: UseQueryResult<AiReportSubmission>
  jobQuery: UseQueryResult<AiReportJob>
  sseJob: AiReportJob | null
  pollingFallback: boolean
  cachedReport: AnyAiReport | null
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

  // SSE가 살아있으면 그 스냅샷을 우선. 폴백(pollingFallback)으로 넘어간
  // 뒤에는 새로 도착한 폴링 결과가 우선해야 한다 — 그렇지 않으면 SSE가 마지막에
  // 남긴 비종결(RUNNING 등) 스냅샷이 완료된 폴링 결과를 가려 loading에
  // 고립되고 90초 후 스푸리어스 타임아웃이 발생한다. 다만 폴백 전환 직후
  // 첫 폴링 응답이 오기 전까지는 sseJob으로 마지막 단계를 계속 보여준다
  // (단계 표시가 순간적으로 비지 않도록).
  const job: AiReportJob | undefined =
    (a.pollingFallback
      ? (a.jobQuery.data ?? a.sseJob)
      : (a.sseJob ?? a.jobQuery.data)) ?? undefined

  const decision = decideNextPoll(job, a.pollElapsedMs)
  if (decision.kind === 'error') {
    return {
      status: 'error',
      message: decision.message,
      errorKind: classifyError(decision.errorCode),
      canRetry: true,
    }
  }
  if (decision.kind === 'ready') {
    const report = reportFromJob(job!, a.level)
    return report
      ? buildReady(a.level, report)
      : {
          status: 'error',
          message: '리포트를 불러오지 못했습니다.',
          errorKind: 'generic',
          canRetry: true,
        }
  }
  return loadingFromJob(job ?? undefined)
}
