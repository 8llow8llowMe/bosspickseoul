import { describe, expect, it, vi } from 'vitest'

import {
  buildJobStreamUrl,
  parseSseBuffer,
  subscribeJobStream,
} from '@/lib/analysis/ai-report-sse'
import type { AiReportJob } from '@/types/ai-report'

describe('buildJobStreamUrl', () => {
  it('전용 스트리밍 라우트 경로를 만든다', () => {
    expect(buildJobStreamUrl('job-1')).toBe('/api/ai-reports/jobs/job-1/stream')
  })
})

describe('parseSseBuffer', () => {
  it('완성된 프레임을 파싱하고 미완성 rest를 남긴다', () => {
    const { events, rest } = parseSseBuffer(
      'event: job-update\ndata: {"a":1}\n\nevent: job-upda',
    )
    expect(events).toEqual([{ event: 'job-update', data: '{"a":1}' }])
    expect(rest).toBe('event: job-upda')
  })
  it('하트비트 코멘트(:)와 여러 data 줄을 처리한다', () => {
    const { events } = parseSseBuffer(': ping\n\ndata: line1\ndata: line2\n\n')
    expect(events).toEqual([{ event: 'message', data: 'line1\nline2' }])
  })
})

describe('subscribeJobStream', () => {
  it('job-update 이벤트마다 onEvent, 스트림 종료 시 onDone', async () => {
    const chunks = [
      'event: job-update\ndata: {"jobId":"j1","status":{"code":"RUNNING","name":"생성 중","description":"d"},"jobType":{"code":"DISTRICT","name":"","description":""},"progressMessages":["x"],"commercialReport":null,"districtReport":null,"administrationReport":null,"errorCode":null,"errorMessage":null}\n\n',
    ]
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        const enc = new TextEncoder()
        chunks.forEach(c => controller.enqueue(enc.encode(c)))
        controller.close()
      },
    })
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(body, {
          status: 200,
          headers: { 'Content-Type': 'text/event-stream' },
        }),
      ),
    )
    const events: AiReportJob[] = []
    let done = false
    await subscribeJobStream(
      'j1',
      {
        onEvent: j => events.push(j),
        onError: () => {},
        onDone: () => (done = true),
      },
      new AbortController().signal,
    )
    expect(events).toHaveLength(1)
    expect(events[0].status.code).toBe('RUNNING')
    expect(done).toBe(true)
    vi.unstubAllGlobals()
  })

  it('비-2xx 응답이면 onError로 폴백 신호', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('nope', { status: 404 })),
    )
    let errored = false
    await subscribeJobStream(
      'j1',
      { onEvent: () => {}, onError: () => (errored = true), onDone: () => {} },
      new AbortController().signal,
    )
    expect(errored).toBe(true)
    vi.unstubAllGlobals()
  })
})
