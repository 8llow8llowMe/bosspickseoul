import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '@/lib/api/client'
import { getMemberInfoData } from './profile'

describe('profile API', () => {
  afterEach(() => vi.restoreAllMocks())

  it('passes the query AbortSignal to the member info request', async () => {
    const response = {
      dataHeader: {
        success: true,
        resultCode: null,
        resultMessage: null,
      },
      dataBody: null,
    }
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue({ data: response })
    const signal = new AbortController().signal

    await getMemberInfoData(signal)

    expect(get).toHaveBeenCalledWith('/members/me', { signal })
  })

  it('uses the same member endpoint without an AbortSignal', async () => {
    const response = {
      dataHeader: {
        success: true,
        resultCode: null,
        resultMessage: null,
      },
      dataBody: null,
    }
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue({ data: response })

    await getMemberInfoData()

    expect(get).toHaveBeenCalledWith('/members/me')
  })
})
