import { describe, expect, it } from 'vitest'
import { classifyShareEntryError } from './share-entry'

const axiosError = (status: number, resultCode: string, message: string) =>
  Object.assign(new Error('Request failed'), {
    isAxiosError: true,
    response: {
      status,
      data: {
        dataHeader: { success: false, resultCode, resultMessage: message },
        dataBody: null,
      },
    },
  })

describe('classifyShareEntryError', () => {
  it('410 만료와 404 미존재를 서로 다른 문구로 안내한다', () => {
    const expired = classifyShareEntryError(
      axiosError(410, 'SHARE_LINK_002', '만료된 공유 링크입니다.'),
    )
    const missing = classifyShareEntryError(
      axiosError(404, 'SHARE_LINK_001', '존재하지 않는 공유 링크입니다.'),
    )

    expect(expired.kind).toBe('expired')
    expect(missing.kind).toBe('not-found')
    expect(expired.title).not.toBe(missing.title)
    expect(expired.description).not.toBe(missing.description)
  })

  it('만료·미존재에는 재시도 버튼을 붙이지 않는다', () => {
    expect(
      classifyShareEntryError(axiosError(410, 'SHARE_LINK_002', '만료'))
        .retryable,
    ).toBe(false)
    expect(
      classifyShareEntryError(axiosError(404, 'SHARE_LINK_001', '없음'))
        .retryable,
    ).toBe(false)
  })

  it('404 는 서버 메시지를 그대로 노출한다', () => {
    expect(
      classifyShareEntryError(
        axiosError(404, 'SHARE_LINK_001', '존재하지 않는 공유 링크입니다.'),
      ).description,
    ).toBe('존재하지 않는 공유 링크입니다.')
  })

  it('5xx 와 무응답만 재시도 가능하다', () => {
    expect(
      classifyShareEntryError(axiosError(500, 'SERVER', '서버 오류')).retryable,
    ).toBe(true)
    expect(classifyShareEntryError({ isAxiosError: true }).retryable).toBe(true)
    expect(
      classifyShareEntryError(axiosError(400, 'SHARE_LINK_003', '잘못된 타입'))
        .retryable,
    ).toBe(false)
  })
})
