import type {
  AiReportJob,
  AiReportLevel,
  AiReportSubmission,
  CommercialAiReport,
  CommercialComparisonAiReport,
  RegionAiReport,
} from '@/types/ai-report'

/** 어떤 대상이든 완료 시 채워지는 리포트 하나. */
export type AnyAiReport =
  | CommercialAiReport
  | CommercialComparisonAiReport
  | RegionAiReport

export const AI_REPORT_POLL_INTERVAL_MS = 3000
export const AI_REPORT_POLL_TIMEOUT_MS = 90000

type WithReports = Pick<
  AiReportJob,
  | 'commercialReport'
  | 'commercialComparisonReport'
  | 'districtReport'
  | 'administrationReport'
>

const pickReport = (
  x: WithReports,
  level: AiReportLevel,
): AnyAiReport | null => {
  if (level === 'commercial') return x.commercialReport
  if (level === 'comparison') return x.commercialComparisonReport
  if (level === 'district') return x.districtReport
  return x.administrationReport
}

export const reportFromSubmission = (
  submission: AiReportSubmission,
  level: AiReportLevel,
): AnyAiReport | null =>
  submission.submissionStatus.code === 'CACHED'
    ? pickReport(submission, level)
    : null

export const jobIdFromSubmission = (
  submission: AiReportSubmission,
): string | null =>
  submission.submissionStatus.code === 'ACCEPTED' ? submission.jobId : null

export const reportFromJob = (
  job: AiReportJob,
  level: AiReportLevel,
): AnyAiReport | null => pickReport(job, level)

export type PollDecision =
  | { kind: 'poll'; intervalMs: number }
  | { kind: 'ready' }
  | { kind: 'error'; message: string; errorCode: string | null }

export const decideNextPoll = (
  job: AiReportJob | undefined,
  elapsedMs: number,
): PollDecision => {
  const code = job?.status.code
  if (code === 'COMPLETED') return { kind: 'ready' }
  if (code === 'FAILED') {
    return {
      kind: 'error',
      message: job!.errorMessage?.trim() || 'AI 리포트 생성에 실패했습니다.',
      errorCode: job!.errorCode,
    }
  }
  if (elapsedMs >= AI_REPORT_POLL_TIMEOUT_MS) {
    return {
      kind: 'error',
      message: '시간이 초과되었습니다. 다시 시도해 주세요.',
      errorCode: 'TIMEOUT',
    }
  }
  return { kind: 'poll', intervalMs: AI_REPORT_POLL_INTERVAL_MS }
}
