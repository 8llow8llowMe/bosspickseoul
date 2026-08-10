import type { AiReportJob } from '@/types/ai-report'

export type SseEvent = { event: string; data: string }

export type JobStreamCallbacks = {
  onEvent: (job: AiReportJob) => void
  onError: (err: unknown) => void
  onDone: () => void
}

export const buildJobStreamUrl = (jobId: string): string =>
  `/api/ai-reports/jobs/${jobId}/stream`

// 완성된 프레임(빈 줄 구분)만 파싱하고, 미완성 꼬리는 rest로 돌려준다.
export const parseSseBuffer = (
  buffer: string,
): { events: SseEvent[]; rest: string } => {
  const normalized = buffer.replace(/\r\n/g, '\n')
  const parts = normalized.split('\n\n')
  const rest = parts.pop() ?? ''
  const events: SseEvent[] = []
  for (const block of parts) {
    let event = 'message'
    const dataLines: string[] = []
    for (const line of block.split('\n')) {
      if (line === '' || line.startsWith(':')) continue // 하트비트/빈 줄 무시
      if (line.startsWith('event:')) event = line.slice(6).trim()
      else if (line.startsWith('data:'))
        dataLines.push(line.slice(5).trimStart())
    }
    if (dataLines.length > 0) events.push({ event, data: dataLines.join('\n') })
  }
  return { events, rest }
}

export const subscribeJobStream = async (
  jobId: string,
  cb: JobStreamCallbacks,
  signal: AbortSignal,
): Promise<void> => {
  try {
    const res = await fetch(buildJobStreamUrl(jobId), {
      method: 'GET',
      headers: { Accept: 'text/event-stream' },
      credentials: 'same-origin',
      signal,
    })
    if (!res.ok || !res.body) {
      cb.onError(new Error(`stream ${res.status}`))
      return
    }
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    for (;;) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const { events, rest } = parseSseBuffer(buffer)
      buffer = rest
      for (const evt of events) {
        if (evt.event !== 'job-update') continue
        try {
          cb.onEvent(JSON.parse(evt.data) as AiReportJob)
        } catch (err) {
          cb.onError(err)
          return
        }
      }
    }
    cb.onDone()
  } catch (err) {
    if (signal.aborted) return // 정상 중단(언마운트/레벨 변경)
    cb.onError(err)
  }
}
