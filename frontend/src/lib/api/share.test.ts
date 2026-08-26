import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '@/lib/api/client'
import { createShareLink, createShareUrl, resolveShareLink } from './share'

afterEach(() => vi.restoreAllMocks())

describe('V2 공유 링크 API', () => {
  it('생성은 /share-links 로 shareType 과 payload 를 보낸다', async () => {
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({
      data: {
        dataHeader: { success: true, resultCode: null, resultMessage: null },
        dataBody: { shareCode: 'a1B2c3D4' },
      },
    })

    await createShareLink({
      shareType: 'COMMERCIAL_ANALYSIS',
      payload: { commercialCode: '3110008' },
    })

    expect(post).toHaveBeenCalledWith('/share-links', {
      shareType: 'COMMERCIAL_ANALYSIS',
      payload: { commercialCode: '3110008' },
    })
  })

  it('해석은 /share-links/{shareCode} 를 호출한다 (V1 /share 아님)', async () => {
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue({
      data: {
        dataHeader: { success: true, resultCode: null, resultMessage: null },
        dataBody: null,
      },
    })

    await resolveShareLink('a1B2c3D4')

    expect(get).toHaveBeenCalledWith('/share-links/a1B2c3D4')
  })

  it('공유 URL 은 /s/{shareCode} 형태다', () => {
    expect(createShareUrl('a1B2c3D4', 'https://www.bosspickseoul.com')).toBe(
      'https://www.bosspickseoul.com/s/a1B2c3D4',
    )
    expect(createShareUrl('a1B2c3D4')).toBe('/s/a1B2c3D4')
  })
})
