import type {
  AiReportJob,
  AiReportJobStatus,
  AiReportSubmission,
  CommercialAiReport,
} from '@/types/ai-report'

export const AI_REPORT_POLL_INTERVAL_MS = 2000
export const AI_REPORT_POLL_TIMEOUT_MS = 90000

export const isPollableJobStatus = (status: AiReportJobStatus): boolean =>
  status === 'PENDING' || status === 'RUNNING'

export const reportFromSubmission = (
  submission: AiReportSubmission,
): CommercialAiReport | null =>
  submission.submissionStatus === 'CACHED' ? submission.commercialReport : null

export const jobIdFromSubmission = (
  submission: AiReportSubmission,
): string | null =>
  submission.submissionStatus === 'ACCEPTED' ? submission.jobId : null

export type PollDecision =
  | { kind: 'poll'; intervalMs: number }
  | { kind: 'ready'; report: CommercialAiReport }
  | { kind: 'error'; message: string }

export const decideNextPoll = (
  job: AiReportJob | undefined,
  elapsedMs: number,
): PollDecision => {
  if (job?.status === 'COMPLETED') {
    return job.commercialReport
      ? { kind: 'ready', report: job.commercialReport }
      : { kind: 'error', message: '리포트를 불러오지 못했습니다.' }
  }
  if (job?.status === 'FAILED') {
    return {
      kind: 'error',
      message: job.errorMessage?.trim() || 'AI 리포트 생성에 실패했습니다.',
    }
  }
  if (elapsedMs >= AI_REPORT_POLL_TIMEOUT_MS) {
    return { kind: 'error', message: '시간이 초과되었습니다. 다시 시도해 주세요.' }
  }
  return { kind: 'poll', intervalMs: AI_REPORT_POLL_INTERVAL_MS }
}
