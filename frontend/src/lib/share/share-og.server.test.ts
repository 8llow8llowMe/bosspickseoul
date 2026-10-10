import { createElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { SharePreviewFetcher } from './share-preview.server'
import {
  loadShareOgCard,
  loadShareOgFonts,
  SHARE_OG_FETCH_BUDGET_MS,
} from './share-og.server'

const ok = (dataBody: unknown) => ({
  ok: true,
  json: async () => ({
    dataHeader: { success: true, resultCode: null, resultMessage: null },
    dataBody,
  }),
})

const RESOLVED = {
  shareType: { code: 'COMMERCIAL_ANALYSIS', name: '상권 분석' },
  payload: {
    administrationCode: '11110515',
    commercialCode: '3110008',
    districtCode: '11110',
    periodCode: '20252',
    serviceCode: 'CS100010',
  },
  expiresAt: '2099-01-01T00:00:00',
}

const BENCHMARK = {
  commercialName: '배화여자대학교(박노수미술관)',
  districtName: '종로구',
  administrationName: '청운효자동',
  salesPerStore: {
    serviceName: '커피-음료',
    commercial: {
      monthlySalesAmount: 2352271044,
      storeCount: 45,
      monthlySalesPerStore: 52272690,
    },
  },
}

const routeFetcher = (
  routes: Record<string, () => unknown>,
): SharePreviewFetcher =>
  vi.fn<SharePreviewFetcher>(async input => {
    const path = new URL(input).pathname
    const handler = Object.entries(routes).find(([key]) =>
      path.endsWith(key),
    )?.[1]
    if (!handler) return { ok: false, json: async () => ({}) }
    return handler() as Awaited<ReturnType<SharePreviewFetcher>>
  })

describe('loadShareOgCard', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv, BACKEND_API_URL: 'http://backend:8080' }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('해석 후 지표를 하루 캐시로 한 번 불러 카드를 만든다', async () => {
    const fetcher = routeFetcher({
      '/share-links/7GFPfbs3': () => ok(RESOLVED),
      '/commercials/3110008/benchmarks': () => ok(BENCHMARK),
    })

    const card = await loadShareOgCard('7GFPfbs3', { fetcher })

    expect(card).toMatchObject({
      title: '배화여자대학교(박노수미술관)',
      metrics: [
        { label: '점포당 월 매출', value: '약 5227만원' },
        { label: '같은 업종 점포', value: '45개' },
      ],
    })
    expect(fetcher).toHaveBeenCalledTimes(2)
    expect(fetcher).toHaveBeenCalledWith(
      'http://backend:8080/api/v1/commercials/3110008/benchmarks?serviceCode=CS100010&periodCode=20252',
      expect.objectContaining({ next: { revalidate: 86400 } }),
    )
  })

  it('해석에 실패하면 지표를 부르지 않고 null 이다', async () => {
    const fetcher = routeFetcher({})

    await expect(loadShareOgCard('7GFPfbs3', { fetcher })).resolves.toBeNull()
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('지표 조회가 실패하거나 던져도 null 이다 — 이미지 라우트가 500 을 내지 않는다', async () => {
    await expect(
      loadShareOgCard('7GFPfbs3', {
        fetcher: routeFetcher({ '/share-links/7GFPfbs3': () => ok(RESOLVED) }),
      }),
    ).resolves.toBeNull()

    await expect(
      loadShareOgCard('7GFPfbs3', {
        fetcher: routeFetcher({
          '/share-links/7GFPfbs3': () => ok(RESOLVED),
          '/commercials/3110008/benchmarks': () => {
            throw new Error('ECONNRESET')
          },
        }),
      }),
    ).resolves.toBeNull()
  })

  it('해석이 전체 예산(4초)을 다 쓰면 지표를 부르지 않고 null 이다', async () => {
    let clock = 0
    const fetcher = routeFetcher({
      '/share-links/7GFPfbs3': () => {
        clock = SHARE_OG_FETCH_BUDGET_MS
        return ok(RESOLVED)
      },
      '/commercials/3110008/benchmarks': () => ok(BENCHMARK),
    })

    await expect(
      loadShareOgCard('7GFPfbs3', { fetcher, now: () => clock }),
    ).resolves.toBeNull()
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('형식이 틀린 공유 코드는 부르지도 않는다', async () => {
    const fetcher = routeFetcher({})

    await expect(loadShareOgCard('../../x', { fetcher })).resolves.toBeNull()
    expect(fetcher).not.toHaveBeenCalled()
  })
})

describe('OG 폰트', () => {
  it('정적 WOFF1 두 벌을 읽는다 — satori 는 WOFF2·가변 폰트를 읽지 못한다', async () => {
    const fonts = await loadShareOgFonts()

    expect(fonts.map(font => [font.name, font.weight])).toEqual([
      ['BPS Sans', 400],
      ['BPS Sans', 700],
    ])
    for (const font of fonts) {
      // WOFF1 시그니처 `wOFF`. WOFF2(`wOF2`)면 satori 가 못 읽는다.
      expect(new DataView(font.data).getUint32(0)).toBe(0x774f4646)
    }
  })

  it('카드를 실제 PNG 로 그린다(satori + resvg)', async () => {
    const [{ ImageResponse }, { ShareOgCardImage }] = await Promise.all([
      import('next/og'),
      import('@/lib/og/share-og-card'),
    ])
    const fonts = await loadShareOgFonts()

    const response = new ImageResponse(
      createElement(ShareOgCardImage, {
        card: {
          kind: '상권분석',
          period: '2025년 2분기',
          title: '배화여자대학교(박노수미술관)',
          subtitle: '종로구 청운효자동 · 커피-음료',
          metrics: [
            { label: '점포당 월 매출', value: '약 5227만원' },
            { label: '같은 업종 점포', value: '45개' },
          ],
        },
      }),
      { width: 1200, height: 630, fonts },
    )
    const png = new Uint8Array(await response.arrayBuffer())

    expect(Array.from(png.slice(0, 4))).toEqual([0x89, 0x50, 0x4e, 0x47])
    // IHDR 너비·높이
    const view = new DataView(png.buffer)
    expect([view.getUint32(16), view.getUint32(20)]).toEqual([1200, 630])
  }, 20_000)
})
