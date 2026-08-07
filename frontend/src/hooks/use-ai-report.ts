'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from '@tanstack/react-query'

import {
  fetchAdministrationAiReport,
  fetchAiReportJob,
  fetchDistrictAiReport,
  submitCommercialAiReport,
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
  reportFromSubmission,
} from '@/lib/analysis/ai-report-poll'
import type {
  AiReportJob,
  AiReportLevel,
  AiReportSubmission,
  RegionAiReport,
} from '@/types/ai-report'

export type AiReportState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready-commercial'; view: CommercialReportView }
  | { status: 'ready-region'; view: RegionReportView }
  | { status: 'empty' }
  | { status: 'error'; message: string }

type UseAiReportArgs = {
  level: AiReportLevel | null
  code: string | null
  active: boolean
  enabled: boolean
}

export const useAiReport = ({
  level,
  code,
  active,
  enabled,
}: UseAiReportArgs): { state: AiReportState; retry: () => void } => {
  const queryClient = useQueryClient()
  const on = enabled && active && Boolean(level && code)
  const isRegion = level === 'district' || level === 'administration'
  const isCommercial = level === 'commercial'

  // 지역(자치구/행정동): 동기 GET
  const regionQuery = useQuery({
    queryKey: ['ai-report', 'region', level, code],
    queryFn: () =>
      level === 'district'
        ? fetchDistrictAiReport(code!)
        : fetchAdministrationAiReport(code!),
    enabled: on && isRegion,
    retry: 1,
    staleTime: 5 * 60 * 1000,
  })

  // 상권: POST 제출
  const submitQuery = useQuery({
    queryKey: ['ai-report', 'commercial-submit', code],
    queryFn: () => submitCommercialAiReport(code!),
    enabled: on && isCommercial,
    retry: 0,
    staleTime: 5 * 60 * 1000,
  })

  const cachedReport = submitQuery.data
    ? reportFromSubmission(submitQuery.data)
    : null
  const jobId = submitQuery.data ? jobIdFromSubmission(submitQuery.data) : null

  // 폴링 타임아웃 여부. 렌더 중에는 Date.now()/ref를 읽지 않고, (jobId, attempt) 조합별
  // 타이머(effect)가 마감 시각에 정확히 한 번 상태를 뒤집는 방식으로 추적한다. 실제
  // 타임아웃 판정 자체는 Task 3의 decideNextPoll(순수 함수)에 위임한다.
  // attempt는 retry() 호출마다 증가하는 nonce로, 백엔드가 재요청에도 동일한 jobId를
  // 반환하는 경우(PENDING/RUNNING 중 idempotent 응답) 타이머가 재무장되도록 보장하고,
  // 이전 시도에서 걸린 타임아웃이 새 시도를 오염시키지 않도록 막는다.
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
    enabled: on && isCommercial && Boolean(jobId) && !cachedReport,
    retry: 0,
    refetchInterval: query => {
      const decision = decideNextPoll(query.state.data, pollElapsedMs)
      return decision.kind === 'poll' ? decision.intervalMs : false
    },
    refetchIntervalInBackground: false,
  })

  const retry = useCallback(() => {
    setAttempt(a => a + 1)
    if (isRegion) {
      void queryClient.invalidateQueries({
        queryKey: ['ai-report', 'region', level, code],
      })
    } else if (isCommercial) {
      void queryClient.invalidateQueries({
        queryKey: ['ai-report', 'commercial-submit', code],
      })
      if (jobId) {
        void queryClient.invalidateQueries({
          queryKey: ['ai-report', 'job', jobId],
        })
      }
    }
  }, [queryClient, level, code, isRegion, isCommercial, jobId])

  const state = deriveState({
    on,
    isRegion,
    isCommercial,
    regionQuery,
    submitQuery,
    jobQuery,
    cachedReport,
    jobId,
    pollElapsedMs,
  })

  return { state, retry }
}

const deriveState = (a: {
  on: boolean
  isRegion: boolean
  isCommercial: boolean
  regionQuery: UseQueryResult<RegionAiReport>
  submitQuery: UseQueryResult<AiReportSubmission>
  jobQuery: UseQueryResult<AiReportJob>
  cachedReport: Parameters<typeof toCommercialReportView>[0] | null
  jobId: string | null
  pollElapsedMs: number
}): AiReportState => {
  if (!a.on) return { status: 'idle' }

  if (a.isRegion) {
    if (a.regionQuery.isError)
      return { status: 'error', message: '리포트를 불러오지 못했습니다.' }
    if (!a.regionQuery.data) return { status: 'loading' }
    const view = toRegionReportView(a.regionQuery.data)
    return isRegionReportEmpty(view)
      ? { status: 'empty' }
      : { status: 'ready-region', view }
  }

  if (a.isCommercial) {
    if (a.submitQuery.isError)
      return { status: 'error', message: 'AI 리포트 요청에 실패했습니다.' }
    if (a.cachedReport) {
      const view = toCommercialReportView(a.cachedReport)
      return isCommercialReportEmpty(view)
        ? { status: 'empty' }
        : { status: 'ready-commercial', view }
    }
    if (!a.jobId) return { status: 'loading' }
    const decision = decideNextPoll(a.jobQuery.data, a.pollElapsedMs)
    if (decision.kind === 'error')
      return { status: 'error', message: decision.message }
    if (decision.kind === 'ready') {
      const view = toCommercialReportView(decision.report)
      return isCommercialReportEmpty(view)
        ? { status: 'empty' }
        : { status: 'ready-commercial', view }
    }
    return { status: 'loading' }
  }

  return { status: 'idle' }
}
