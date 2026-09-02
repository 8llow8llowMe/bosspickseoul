import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  CommunityPostImageError,
  uploadCommunityPostImages,
} from '@/lib/api/community-post-images'

const fetchMock = vi.fn()

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const response = (body: unknown, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: () => Promise.resolve(body),
})

const success = (dataBody: unknown) => ({
  dataHeader: { success: true, resultCode: null, resultMessage: null },
  dataBody,
})

const file = (name: string) => new File(['x'], name, { type: 'image/png' })

describe('uploadCommunityPostImages', () => {
  it('BFF 경로로 multipart 를 보내고 키를 돌려준다', async () => {
    fetchMock.mockResolvedValue(
      response(
        success([
          { imageKey: 'community/posts/1/2026/09/a.png', imageUrl: 'u/a' },
        ]),
      ),
    )

    const result = await uploadCommunityPostImages([file('a.png')])

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/bff/community/posts/images',
      expect.objectContaining({ method: 'POST' }),
    )
    expect(result[0].imageKey).toBe('community/posts/1/2026/09/a.png')
  })

  /*
   * 배열 파트는 **같은 이름을 반복**해 담는다(`imageFiles`). `imageFiles[0]` 처럼
   * 인덱스를 붙이면 스프링이 배열로 못 읽는다.
   */
  it('여러 장을 같은 필드명으로 반복해 담는다', async () => {
    fetchMock.mockResolvedValue(response(success([])))

    await uploadCommunityPostImages([file('a.png'), file('b.png')])

    const body = (fetchMock.mock.calls[0][1] as RequestInit).body as FormData
    expect(body.getAll('imageFiles')).toHaveLength(2)
    expect(body.getAll('imageFiles[0]')).toHaveLength(0)
  })

  /* Content-Type 을 직접 지정하면 boundary 가 빠져 서버가 본문을 못 읽는다. */
  it('Content-Type 을 직접 지정하지 않는다', async () => {
    fetchMock.mockResolvedValue(response(success([])))

    await uploadCommunityPostImages([file('a.png')])

    expect((fetchMock.mock.calls[0][1] as RequestInit).headers).toBeUndefined()
  })

  it('올릴 것이 없으면 네트워크를 타지 않는다', async () => {
    const result = await uploadCommunityPostImages([])

    expect(result).toEqual([])
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('실패하면 오류코드를 살려서 던진다', async () => {
    fetchMock.mockResolvedValue(
      response(
        {
          dataHeader: {
            success: false,
            resultCode: 'STORAGE_007',
            resultMessage: '이미지는 최대 5장까지 첨부할 수 있습니다.',
          },
          dataBody: null,
        },
        400,
      ),
    )

    await expect(
      uploadCommunityPostImages([file('a.png')]),
    ).rejects.toMatchObject({
      name: 'CommunityPostImageError',
      code: 'STORAGE_007',
    })
  })

  /* 이 저장소의 백엔드는 200 에 success:false 를 실어 보내기도 한다. */
  it('200 이면서 success 가 false 여도 실패로 다룬다', async () => {
    fetchMock.mockResolvedValue(
      response({
        dataHeader: {
          success: false,
          resultCode: 'STORAGE_004',
          resultMessage: '업로드에 실패했습니다.',
        },
        dataBody: null,
      }),
    )

    await expect(
      uploadCommunityPostImages([file('a.png')]),
    ).rejects.toBeInstanceOf(CommunityPostImageError)
  })
})
