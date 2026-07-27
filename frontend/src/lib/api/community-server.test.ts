import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { fetchCommunityPostForMetadata } from './community-server'

describe('community server metadata API', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
    delete process.env.BACKEND_API_URL
    delete process.env.NEXT_PUBLIC_API_URL
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('does not call a relative or localhost fallback when backend URL is not configured', async () => {
    const fetcher = vi.fn()

    await expect(fetchCommunityPostForMetadata(7, fetcher)).resolves.toBeNull()
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('calls the canonical Swagger post endpoint with an absolute configured backend URL', async () => {
    process.env.BACKEND_API_URL = 'http://backend:8080/'
    const detail = {
      postId: 7,
      memberId: 9001,
      targetType: null,
      targetCode: null,
      targetName: null,
      title: '서버 메타데이터',
      content: '본문',
      likeCount: 0,
      commentCount: 0,
      viewCount: 0,
      createdAt: '2026-07-27T00:00:00.000Z',
      updatedAt: '2026-07-27T00:00:00.000Z',
    }
    const fetcher = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        dataHeader: {
          success: true,
          resultCode: null,
          resultMessage: null,
        },
        dataBody: detail,
      }),
    }))

    await expect(fetchCommunityPostForMetadata(7, fetcher)).resolves.toEqual(
      detail,
    )
    expect(fetcher).toHaveBeenCalledWith(
      'http://backend:8080/api/v1/community/posts/7',
      expect.objectContaining({
        method: 'GET',
        headers: { Accept: 'application/json' },
      }),
    )
  })

  it('returns null for unsuccessful HTTP or API envelopes', async () => {
    process.env.NEXT_PUBLIC_API_URL = 'https://api.example.com'
    const httpFailure = vi.fn(async () => ({
      ok: false,
      json: async () => ({}),
    }))
    const envelopeFailure = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        dataHeader: { success: false },
        dataBody: null,
      }),
    }))

    await expect(
      fetchCommunityPostForMetadata(1, httpFailure),
    ).resolves.toBeNull()
    await expect(
      fetchCommunityPostForMetadata(1, envelopeFailure),
    ).resolves.toBeNull()
  })
})
