// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
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
      commercialComparisonReport: null,
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
        commercialComparisonReport: null,
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
      commercialComparisonReport: null,
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
      commercialComparisonReport: null,
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

  it('SSE가 RUNNING 스냅샷을 먼저 준 뒤 끊겨도 폴링의 COMPLETED가 stale sseJob에 가려지지 않는다', async () => {
    vi.spyOn(api, 'submitDistrictAiReport').mockResolvedValue({
      submissionStatus: meta('ACCEPTED'),
      jobType: meta('DISTRICT'),
      jobId: 'j4',
      commercialReport: null,
      commercialComparisonReport: null,
      districtReport: null,
      administrationReport: null,
    } as AiReportSubmission)
    vi.spyOn(sse, 'subscribeJobStream').mockImplementation(async (_id, cb) => {
      // 구독 즉시 비종결 스냅샷 1회 수신 (백엔드 계약: 구독 시 즉시 상태 전송) → 이후 드롭.
      cb.onEvent({
        jobId: 'j4',
        jobType: meta('DISTRICT'),
        status: meta('RUNNING'),
        progressMessages: ['분석 중'],
        commercialReport: null,
        commercialComparisonReport: null,
        districtReport: null,
        administrationReport: null,
        errorCode: null,
        errorMessage: null,
      } as AiReportJob)
      cb.onError(new Error('drop'))
    })
    const pollSpy = vi.spyOn(api, 'fetchAiReportJob').mockResolvedValue({
      jobId: 'j4',
      jobType: meta('DISTRICT'),
      status: meta('COMPLETED'),
      progressMessages: null,
      commercialReport: null,
      commercialComparisonReport: null,
      districtReport: { summary: '폴링완료요약' } as never,
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
    // stale RUNNING sseJob에 가려 loading에 고립되거나 스푸리어스 타임아웃
    // 에러가 나지 않고, 폴링이 가져온 COMPLETED로 ready-region에 도달해야 한다.
    await waitFor(
      () => expect(result.current.state.status).toBe('ready-region'),
      { timeout: 3000 },
    )
  })

  it('동일 jobId(idempotent)로 재시도해도 SSE가 재구독되어 종결 상태에 도달한다', async () => {
    vi.spyOn(api, 'submitDistrictAiReport').mockResolvedValue({
      submissionStatus: meta('ACCEPTED'),
      jobType: meta('DISTRICT'),
      jobId: 'j3',
      commercialReport: null,
      commercialComparisonReport: null,
      districtReport: null,
      administrationReport: null,
    } as AiReportSubmission)
    const subscribeSpy = vi.spyOn(sse, 'subscribeJobStream')
    // 1차 구독: 종결 없이 onError만 호출 → pollingFallback=true로 전환.
    subscribeSpy.mockImplementationOnce(async (_id, cb) => {
      cb.onError(new Error('drop'))
    })
    // 2차 구독(재시도 후): COMPLETED로 종결.
    subscribeSpy.mockImplementationOnce(async (_id, cb) => {
      cb.onEvent({
        jobId: 'j3',
        jobType: meta('DISTRICT'),
        status: meta('COMPLETED'),
        progressMessages: null,
        commercialReport: null,
        commercialComparisonReport: null,
        districtReport: { summary: '재시도요약' } as never,
        administrationReport: null,
        errorCode: null,
        errorMessage: null,
      } as AiReportJob)
      cb.onDone()
    })
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
    await waitFor(() => expect(subscribeSpy).toHaveBeenCalledTimes(1))

    act(() => {
      result.current.retry()
    })

    // jobId는 동일(idempotent)하지만 attempt가 바뀌었으므로 SSE가 재구독돼야 한다.
    await waitFor(() => expect(subscribeSpy).toHaveBeenCalledTimes(2))
    expect(subscribeSpy.mock.calls[1][0]).toBe('j3')
    // 재구독 후 loading에 고립되지 않고 종결 상태(ready-region)에 도달해야 한다.
    await waitFor(() =>
      expect(result.current.state.status).toBe('ready-region'),
    )
  })
})
