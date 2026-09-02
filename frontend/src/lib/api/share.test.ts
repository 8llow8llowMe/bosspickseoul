import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '@/lib/api/client'
import { createShareLink, createShareUrl, resolveShareLink } from './share'
import { classifyShareLinkError } from './share-errors'

afterEach(() => vi.restoreAllMocks())

const axiosError = (
  status: number,
  resultCode: string | null,
  resultMessage: string | null,
) =>
  Object.assign(new Error('Request failed'), {
    isAxiosError: true,
    response: {
      status,
      data: {
        dataHeader: { success: false, resultCode, resultMessage },
        dataBody: null,
      },
    },
  })

const created = (shareCode: string) => ({
  data: {
    dataHeader: { success: true, resultCode: null, resultMessage: null },
    dataBody: { shareCode },
  },
})

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

describe('동시 생성 409 (SHARE_LINK_007)', () => {
  const request = {
    shareType: 'COMMERCIAL_ANALYSIS' as const,
    payload: { commercialCode: '3110008' },
  }

  it('409 면 한 번 더 불러 이긴 쪽이 만든 기존 링크를 받는다', async () => {
    const post = vi
      .spyOn(apiClient, 'post')
      .mockRejectedValueOnce(
        axiosError(409, 'SHARE_LINK_007', '같은 화면이 동시에 공유되었습니다.'),
      )
      .mockResolvedValueOnce(created('winner01'))

    const result = await createShareLink(request)

    expect(post).toHaveBeenCalledTimes(2)
    expect(result.dataBody?.shareCode).toBe('winner01')
  })

  it('재시도는 한 번뿐이다 — 두 번째도 409 면 호출자에게 던진다', async () => {
    const conflict = axiosError(409, 'SHARE_LINK_007', '동시 공유')
    const post = vi.spyOn(apiClient, 'post').mockRejectedValue(conflict)

    await expect(createShareLink(request)).rejects.toBe(conflict)
    expect(post).toHaveBeenCalledTimes(2)
  })

  it('409 가 아닌 실패는 재시도하지 않는다', async () => {
    const tooLarge = axiosError(
      400,
      'SHARE_LINK_005',
      '공유 데이터가 허용 크기를 초과했습니다.',
    )
    const post = vi.spyOn(apiClient, 'post').mockRejectedValue(tooLarge)

    await expect(createShareLink(request)).rejects.toBe(tooLarge)
    expect(post).toHaveBeenCalledTimes(1)
  })
})

describe('공유 실패 분류는 보관함 문구를 빌려 쓰지 않는다', () => {
  it('409 에 "이미 보관함에 저장된 화면" 을 붙이지 않고 서버 문구를 쓴다', () => {
    const failure = classifyShareLinkError(
      axiosError(409, 'SHARE_LINK_007', '같은 화면이 동시에 공유되었습니다.'),
    )

    expect(failure.message).toBe('같은 화면이 동시에 공유되었습니다.')
    expect(failure.message).not.toContain('보관함')
    expect(failure.retryable).toBe(false)
  })

  it('5xx 는 재시도 가능으로 본다', () => {
    expect(classifyShareLinkError(axiosError(500, null, null)).retryable).toBe(
      true,
    )
  })

  it('화면이 직접 던진 Error 는 그 문구를 그대로 쓴다', () => {
    const failure = classifyShareLinkError(
      new Error('공유 링크를 발급하지 못했어요.'),
    )

    expect(failure.message).toBe('공유 링크를 발급하지 못했어요.')
    expect(failure.retryable).toBe(false)
  })
})
