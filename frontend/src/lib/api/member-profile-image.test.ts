import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  ProfileImageError,
  removeProfileImage,
  uploadProfileImage,
} from '@/lib/api/member-profile-image'

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

const success = (dataBody: unknown = null) => ({
  dataHeader: { success: true, resultCode: null, resultMessage: null },
  dataBody,
})

const failure = (resultCode: string, resultMessage: string) => ({
  dataHeader: { success: false, resultCode, resultMessage },
  dataBody: null,
})

const file = () => new File(['fake-bytes'], 'avatar.png', { type: 'image/png' })

describe('uploadProfileImage', () => {
  /**
   * **BFF 를 거친다.** A1·A2 가 전용 라우트였던 이유는 서버 세션을 파괴해야 해서였고,
   * 이미지 변경은 토큰을 건드리지 않는다 — BFF 를 거치면 선재발급·401 재시도를 얻는다.
   */
  it('BFF 경로로 multipart 를 보낸다', async () => {
    fetchMock.mockResolvedValue(
      response(
        success({
          profileImageKey: 'members/profiles/1/2026/09/uuid.png',
          profileImageUrl: 'https://minio.test/uuid.png',
        }),
      ),
    )

    const result = await uploadProfileImage(file())

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/bff/members/me/profile-image',
      expect.objectContaining({ method: 'POST' }),
    )
    expect(result?.profileImageUrl).toBe('https://minio.test/uuid.png')
  })

  /*
   * `Content-Type` 을 직접 지정하면 boundary 가 빠져 백엔드가 본문을 못 읽는다.
   * `FormData` 를 그대로 넘겨 브라우저가 헤더를 만들게 둬야 한다.
   */
  it('Content-Type 을 직접 지정하지 않고 FormData 를 그대로 넘긴다', async () => {
    fetchMock.mockResolvedValue(response(success(null)))

    await uploadProfileImage(file())

    const init = fetchMock.mock.calls[0][1] as RequestInit
    expect(init.headers).toBeUndefined()
    expect(init.body).toBeInstanceOf(FormData)
    expect((init.body as FormData).get('imageFile')).toBeInstanceOf(File)
  })

  it('실패하면 오류코드를 살려서 던진다', async () => {
    fetchMock.mockResolvedValue(
      response(failure('STORAGE_003', '이미지 파일이 아닙니다.'), 400),
    )

    await expect(uploadProfileImage(file())).rejects.toMatchObject({
      name: 'ProfileImageError',
      code: 'STORAGE_003',
      message: '이미지 파일이 아닙니다.',
    })
  })

  /* 이 저장소의 백엔드는 200 에 success:false 를 실어 보내기도 한다. */
  it('200 이면서 success 가 false 여도 실패로 다룬다', async () => {
    fetchMock.mockResolvedValue(
      response(failure('STORAGE_004', '업로드에 실패했습니다.')),
    )

    await expect(uploadProfileImage(file())).rejects.toBeInstanceOf(
      ProfileImageError,
    )
  })

  it('본문을 못 읽어도 기본 문구로 실패시킨다', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error('not json')),
    })

    await expect(uploadProfileImage(file())).rejects.toMatchObject({
      code: null,
      message: expect.stringContaining('올리지 못했어요'),
    })
  })
})

describe('removeProfileImage', () => {
  it('같은 경로로 DELETE 를 보낸다', async () => {
    fetchMock.mockResolvedValue(response(success(null)))

    await removeProfileImage()

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/bff/members/me/profile-image',
      expect.objectContaining({ method: 'DELETE' }),
    )
  })

  it('실패하면 오류코드를 살려서 던진다', async () => {
    fetchMock.mockResolvedValue(
      response(failure('STORAGE_004', '삭제에 실패했습니다.'), 500),
    )

    await expect(removeProfileImage()).rejects.toMatchObject({
      code: 'STORAGE_004',
    })
  })
})
