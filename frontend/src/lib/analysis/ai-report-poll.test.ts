import { describe, expect, it } from 'vitest'

import {
  AI_REPORT_POLL_INTERVAL_MS,
  AI_REPORT_POLL_TIMEOUT_MS,
  decideNextPoll,
  jobIdFromSubmission,
  reportFromJob,
  reportFromSubmission,
} from '@/lib/analysis/ai-report-poll'
import type {
  AiReportJob,
  AiReportSubmission,
  CommercialAiReport,
  Meta,
} from '@/types/ai-report'

const meta = <C extends string>(code: C): Meta<C> => ({
  code,
  name: code,
  description: code,
})
const cReport = { summary: 'ok' } as CommercialAiReport

const submission = (over: Partial<AiReportSubmission>): AiReportSubmission => ({
  submissionStatus: meta('ACCEPTED'),
  jobType: meta('COMMERCIAL'),
  jobId: 'j1',
  commercialReport: null,
  districtReport: null,
  administrationReport: null,
  ...over,
})

const job = (over: Partial<AiReportJob>): AiReportJob => ({
  jobId: 'j1',
  jobType: meta('COMMERCIAL'),
  status: meta('PENDING'),
  progressMessages: null,
  commercialReport: null,
  districtReport: null,
  administrationReport: null,
  errorCode: null,
  errorMessage: null,
  ...over,
})

describe('submission helpers', () => {
  it('CACHED면 레벨별 리포트를, ACCEPTED면 jobId를 뽑는다', () => {
    expect(
      reportFromSubmission(
        submission({
          submissionStatus: meta('CACHED'),
          jobId: null,
          commercialReport: cReport,
        }),
        'commercial',
      ),
    ).toBe(cReport)
    expect(jobIdFromSubmission(submission({}))).toBe('j1')
    expect(
      jobIdFromSubmission(
        submission({ submissionStatus: meta('CACHED'), jobId: null }),
      ),
    ).toBeNull()
  })
})

describe('reportFromJob', () => {
  it('레벨에 맞는 필드를 선택한다', () => {
    const region = { summary: 'r' } as never
    expect(reportFromJob(job({ districtReport: region }), 'district')).toBe(
      region,
    )
    expect(
      reportFromJob(job({ commercialReport: cReport }), 'commercial'),
    ).toBe(cReport)
  })
})

describe('decideNextPoll', () => {
  it('COMPLETED → ready', () => {
    expect(decideNextPoll(job({ status: meta('COMPLETED') }), 1000)).toEqual({
      kind: 'ready',
    })
  })
  it('FAILED → errorMessage/errorCode 사용', () => {
    expect(
      decideNextPoll(
        job({
          status: meta('FAILED'),
          errorMessage: '실패함',
          errorCode: 'AI_002',
        }),
        1000,
      ),
    ).toEqual({ kind: 'error', message: '실패함', errorCode: 'AI_002' })
  })
  it('진행 중+타임아웃 전 → poll', () => {
    expect(decideNextPoll(job({ status: meta('RUNNING') }), 1000)).toEqual({
      kind: 'poll',
      intervalMs: AI_REPORT_POLL_INTERVAL_MS,
    })
  })
  it('타임아웃 초과 → error', () => {
    expect(
      decideNextPoll(
        job({ status: meta('RUNNING') }),
        AI_REPORT_POLL_TIMEOUT_MS,
      ).kind,
    ).toBe('error')
  })
  it('job 없음+타임아웃 전 → poll', () => {
    expect(decideNextPoll(undefined, 0)).toEqual({
      kind: 'poll',
      intervalMs: AI_REPORT_POLL_INTERVAL_MS,
    })
  })
})
