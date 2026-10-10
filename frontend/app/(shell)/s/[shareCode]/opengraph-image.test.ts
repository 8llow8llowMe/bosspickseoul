import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  SHARE_OG_CARD_CACHE_CONTROL,
  SHARE_OG_FALLBACK_CACHE_CONTROL,
} from '@/lib/share/share-og'

/*
  `/s/{shareCode}/opengraph-image` 연결부. 어떤 실패에도 200 PNG 를 내고 캐시 헤더가 카드·폴백으로 갈리는지 본다.
  조회·폰트는 `share-og.server` 를 통째로 바꾼다 — 그 자체는 share-og.server.test.ts 몫이다.
*/

const server = vi.hoisted(() => ({
  loadShareOgCard: vi.fn(),
  loadShareOgFonts: vi.fn(),
}))

vi.mock('@/lib/share/share-og.server', () => server)

const { default: ShareOpengraphImage } = await import('./opengraph-image')

const props = { params: Promise.resolve({ shareCode: '7GFPfbs3' }) }

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47]

const readPng = async (response: Response) =>
  Array.from(new Uint8Array(await response.arrayBuffer()).slice(0, 4))

beforeEach(() => {
  server.loadShareOgCard.mockReset()
  server.loadShareOgFonts.mockReset()
})

describe('/s/[shareCode]/opengraph-image', () => {
  it('폰트를 못 읽으면 조회 없이 기본 이미지(200 PNG, 폴백 캐시)다', async () => {
    server.loadShareOgFonts.mockRejectedValue(new Error('ENOENT'))

    const response = await ShareOpengraphImage(props)

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('image/png')
    expect(response.headers.get('cache-control')).toBe(
      SHARE_OG_FALLBACK_CACHE_CONTROL,
    )
    expect(await readPng(response)).toEqual(PNG_SIGNATURE)
    expect(server.loadShareOgCard).not.toHaveBeenCalled()
  })

  it('카드를 못 만들면 기본 이미지(200 PNG, 폴백 캐시)다', async () => {
    server.loadShareOgFonts.mockResolvedValue([])
    server.loadShareOgCard.mockResolvedValue(null)

    const response = await ShareOpengraphImage(props)

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('image/png')
    expect(response.headers.get('cache-control')).toBe(
      SHARE_OG_FALLBACK_CACHE_CONTROL,
    )
    expect(await readPng(response)).toEqual(PNG_SIGNATURE)
    expect(server.loadShareOgCard).toHaveBeenCalledWith('7GFPfbs3')
  })

  it('카드는 길게 캐시한다', async () => {
    const { loadShareOgFonts } = await vi.importActual<
      typeof import('@/lib/share/share-og.server')
    >('@/lib/share/share-og.server')
    server.loadShareOgFonts.mockImplementation(loadShareOgFonts)
    server.loadShareOgCard.mockResolvedValue({
      kind: '상권분석',
      period: '2025년 2분기',
      title: '배화여자대학교(박노수미술관)',
      subtitle: '종로구 청운효자동 · 커피-음료',
      metrics: [{ label: '점포당 월 매출', value: '약 5227만원' }],
    })

    const response = await ShareOpengraphImage(props)

    expect(response.headers.get('cache-control')).toBe(
      SHARE_OG_CARD_CACHE_CONTROL,
    )
    expect(await readPng(response)).toEqual(PNG_SIGNATURE)
  }, 20_000)
})
