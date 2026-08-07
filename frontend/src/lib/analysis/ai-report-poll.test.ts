import { describe, expect, it } from 'vitest'

import {
  AI_REPORT_POLL_INTERVAL_MS,
  AI_REPORT_POLL_TIMEOUT_MS,
  decideNextPoll,
  isPollableJobStatus,
  jobIdFromSubmission,
  reportFromSubmission,
} from '@/lib/analysis/ai-report-poll'
import type { AiReportJob, CommercialAiReport } from '@/types/ai-report'

const report = { summary: 'ok' } as CommercialAiReport
const job = (over: Partial<AiReportJob>): AiReportJob => ({
  jobId: 'j1', jobType: 'COMMERCIAL', status: 'PENDING',
  commercialReport: null, errorCode: null, errorMessage: null, ...over,
})

describe('submission helpers', () => {
  it('CACHED면 리포트를, ACCEPTED면 jobId를 뽑는다', () => {
    expect(reportFromSubmission({ submissionStatus: 'CACHED', jobType: 'COMMERCIAL', jobId: null, commercialReport: report })).toBe(report)
    expect(reportFromSubmission({ submissionStatus: 'ACCEPTED', jobType: 'COMMERCIAL', jobId: 'j1', commercialReport: null })).toBeNull()
    expect(jobIdFromSubmission({ submissionStatus: 'ACCEPTED', jobType: 'COMMERCIAL', jobId: 'j1', commercialReport: null })).toBe('j1')
    expect(jobIdFromSubmission({ submissionStatus: 'CACHED', jobType: 'COMMERCIAL', jobId: null, commercialReport: report })).toBeNull()
  })
})

describe('isPollableJobStatus', () => {
  it('PENDING/RUNNING만 폴링 대상', () => {
    expect(isPollableJobStatus('PENDING')).toBe(true)
    expect(isPollableJobStatus('RUNNING')).toBe(true)
    expect(isPollableJobStatus('COMPLETED')).toBe(false)
    expect(isPollableJobStatus('FAILED')).toBe(false)
  })
})

describe('decideNextPoll', () => {
  it('COMPLETED+리포트 → ready', () => {
    expect(decideNextPoll(job({ status: 'COMPLETED', commercialReport: report }), 1000)).toEqual({ kind: 'ready', report })
  })
  it('COMPLETED인데 리포트 없음 → error', () => {
    expect(decideNextPoll(job({ status: 'COMPLETED' }), 1000).kind).toBe('error')
  })
  it('FAILED → errorMessage 사용', () => {
    expect(decideNextPoll(job({ status: 'FAILED', errorMessage: '실패함' }), 1000)).toEqual({ kind: 'error', message: '실패함' })
  })
  it('진행 중이고 타임아웃 전 → poll(간격)', () => {
    expect(decideNextPoll(job({ status: 'RUNNING' }), 1000)).toEqual({ kind: 'poll', intervalMs: AI_REPORT_POLL_INTERVAL_MS })
  })
  it('타임아웃 초과 → error', () => {
    expect(decideNextPoll(job({ status: 'RUNNING' }), AI_REPORT_POLL_TIMEOUT_MS).kind).toBe('error')
  })
  it('job 아직 없음(undefined)+타임아웃 전 → poll', () => {
    expect(decideNextPoll(undefined, 0)).toEqual({ kind: 'poll', intervalMs: AI_REPORT_POLL_INTERVAL_MS })
  })
})
