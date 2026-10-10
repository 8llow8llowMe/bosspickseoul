import { describe, expect, it, vi } from 'vitest'

import { deliverShareUrl } from './share-delivery'

const URL_ =
  'https://bosspickseoul.example/simulation/report?districtCode=11440'

describe('deliverShareUrl', () => {
  it('공유 시트가 있으면 시트를 먼저 쓴다', async () => {
    const share = vi.fn(async () => undefined)
    const writeText = vi.fn(async () => undefined)

    await expect(
      deliverShareUrl(
        { url: URL_, title: '창업 시뮬레이션 리포트' },
        { share, clipboard: { writeText } },
      ),
    ).resolves.toBe('shared')
    expect(share).toHaveBeenCalledWith({
      title: '창업 시뮬레이션 리포트',
      url: URL_,
    })
    expect(writeText).not.toHaveBeenCalled()
  })

  it('공유 시트가 없으면 클립보드에 복사한다', async () => {
    const writeText = vi.fn(async () => undefined)

    await expect(
      deliverShareUrl({ url: URL_ }, { clipboard: { writeText } }),
    ).resolves.toBe('copied')
    expect(writeText).toHaveBeenCalledWith(URL_)
  })

  it('사용자가 시트를 닫은 것은 실패가 아니다', async () => {
    const abort = Object.assign(new Error('closed'), { name: 'AbortError' })

    await expect(
      deliverShareUrl(
        { url: URL_ },
        {
          share: async () => {
            throw abort
          },
        },
      ),
    ).resolves.toBe('aborted')
  })

  it('복사 수단이 없거나 공유가 실패하면 던진다', async () => {
    await expect(deliverShareUrl({ url: URL_ }, {})).rejects.toThrow()
    await expect(
      deliverShareUrl(
        { url: URL_ },
        {
          share: async () => {
            throw Object.assign(new Error('bad data'), { name: 'DataError' })
          },
        },
      ),
    ).rejects.toThrow('bad data')
  })

  const notAllowed = () =>
    Object.assign(new Error('denied'), { name: 'NotAllowedError' })

  it('시트가 NotAllowedError 로 막히면 복사로 한 번 넘어간다', async () => {
    const writeText = vi.fn(async () => undefined)

    await expect(
      deliverShareUrl(
        { url: URL_ },
        {
          share: async () => {
            throw notAllowed()
          },
          clipboard: { writeText },
        },
      ),
    ).resolves.toBe('copied')
    expect(writeText).toHaveBeenCalledWith(URL_)
  })

  it('NotAllowedError 인데 복사 수단도 없으면 던진다', async () => {
    await expect(
      deliverShareUrl(
        { url: URL_ },
        {
          share: async () => {
            throw notAllowed()
          },
        },
      ),
    ).rejects.toThrow()
  })
})
