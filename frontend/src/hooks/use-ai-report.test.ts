// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import * as api from '@/lib/api/ai-report'
import * as sse from '@/lib/analysis/ai-report-sse'
import { useAiReport } from '@/hooks/use-ai-report'
import type { AiReportJob, AiReportSubmission, Meta } from '@/types/ai-report'

const meta = <C extends string>(c: C): Meta<C> => ({
  code: c,
  name: c,
  description: c,
})
const wrapper = ({ children }: { children: ReactNode }) =>
  createElement(
    QueryClientProvider,
    {
      client: new QueryClient({
        defaultOptions: { queries: { retry: false } },
      }),
    },
    children,
  )

afterEach(() => vi.restoreAllMocks())

describe('useAiReport', () => {
  it('ACCEPTED → SSE COMPLETED에서 region 리포트 ready', async () => {
    vi.spyOn(api, 'submitDistrictAiReport').mockResolvedValue({
      submissionStatus: meta('ACCEPTED'),
      jobType: meta('DISTRICT'),
      jobId: 'j1',
      commercialReport: null,
      districtReport: null,
      administrationReport: null,
    } as AiReportSubmission)
    vi.spyOn(sse, 'subscribeJobStream').mockImplementation(async (_id, cb) => {
      cb.onEvent({
        jobId: 'j1',
        jobType: meta('DISTRICT'),
        status: meta('COMPLETED'),
        progressMessages: null,
        commercialReport: null,
        districtReport: { summary: '요약', marketStatus: '성장' } as never,
        administrationReport: null,
        errorCode: null,
        errorMessage: null,
      } as AiReportJob)
      cb.onDone()
    })
    const pollSpy = vi.spyOn(api, 'fetchAiReportJob')
    const { result } = renderHook(
      () =>
        useAiReport({
          level: 'district',
          code: '11680',
          serviceCode: null,
          active: true,
          enabled: true,
        }),
      { wrapper },
    )
    await waitFor(() =>
      expect(result.current.state.status).toBe('ready-region'),
    )
    // SSE가 종결 상태까지 도달했으므로 폴링(fallback 전송)은 켜지지 않아야 한다.
    expect(pollSpy).not.toHaveBeenCalled()
  })

  it('SSE onError면 폴링 폴백으로 전환된다', async () => {
    vi.spyOn(api, 'submitDistrictAiReport').mockResolvedValue({
      submissionStatus: meta('ACCEPTED'),
      jobType: meta('DISTRICT'),
      jobId: 'j2',
      commercialReport: null,
      districtReport: null,
      administrationReport: null,
    } as AiReportSubmission)
    vi.spyOn(sse, 'subscribeJobStream').mockImplementation(async (_id, cb) => {
      cb.onError(new Error('drop'))
    })
    const pollSpy = vi.spyOn(api, 'fetchAiReportJob').mockResolvedValue({
      jobId: 'j2',
      jobType: meta('DISTRICT'),
      status: meta('COMPLETED'),
      progressMessages: null,
      commercialReport: null,
      districtReport: { summary: '폴백요약' } as never,
      administrationReport: null,
      errorCode: null,
      errorMessage: null,
    } as AiReportJob)
    const { result } = renderHook(
      () =>
        useAiReport({
          level: 'district',
          code: '11680',
          serviceCode: null,
          active: true,
          enabled: true,
        }),
      { wrapper },
    )
    await waitFor(() => expect(pollSpy).toHaveBeenCalled())
    await waitFor(() =>
      expect(result.current.state.status).toBe('ready-region'),
    )
  })
})
