import { beforeEach, describe, expect, it, vi } from 'vitest'

const getMock = vi.hoisted(() => vi.fn())

vi.mock('@/lib/api/client', () => ({
  apiClient: { get: getMock },
}))

import {
  ANALYSIS_PERIOD_CATALOG_PATH,
  fetchAnalysisPeriods,
} from '@/lib/api/analysis-period'
import {
  analysisPeriodCatalogRetry,
  analysisPeriodCatalogRetryDelay,
} from '@/hooks/use-analysis-period-catalog'

describe('fetchAnalysisPeriods', () => {
  beforeEach(() => getMock.mockReset())

  it('BFF 의 /commercials/periods 를 부르고 응답 본문을 그대로 낸다', async () => {
    const body = {
      dataHeader: { success: true, resultCode: null, resultMessage: null },
      dataBody: { defaultPeriodCode: '20261' },
    }
    getMock.mockResolvedValue({ data: body })

    await expect(fetchAnalysisPeriods()).resolves.toBe(body)
    expect(ANALYSIS_PERIOD_CATALOG_PATH).toBe('/commercials/periods')
    expect(getMock).toHaveBeenCalledWith('/commercials/periods')
  })
})

/* 기동 직후 503(ANALYSIS_PERIOD_001)은 수 초 안에 풀린다 — 1s·2s·4s 로 세 번 더 묻는다(D5-3). */
describe('카탈로그 재시도', () => {
  const unavailable = {
    isAxiosError: true,
    response: { status: 503, data: null },
  }
  const badRequest = {
    isAxiosError: true,
    response: { status: 400, data: null },
  }

  it('503 은 세 번까지 다시 묻는다', () => {
    expect(analysisPeriodCatalogRetry(0, unavailable)).toBe(true)
    expect(analysisPeriodCatalogRetry(2, unavailable)).toBe(true)
    expect(analysisPeriodCatalogRetry(3, unavailable)).toBe(false)
  })

  it('4xx 는 다시 묻지 않는다', () => {
    expect(analysisPeriodCatalogRetry(0, badRequest)).toBe(false)
  })

  it('간격은 1s · 2s · 4s', () => {
    expect([0, 1, 2].map(analysisPeriodCatalogRetryDelay)).toEqual([
      1000, 2000, 4000,
    ])
  })
})
