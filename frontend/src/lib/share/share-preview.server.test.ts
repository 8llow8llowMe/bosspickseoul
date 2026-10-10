import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  fetchSharePreviewNames,
  resolveShareLinkOnServer,
  type SharePreviewFetcher,
} from './share-preview.server'

const ok = (dataBody: unknown) => ({
  ok: true,
  json: async () => ({
    dataHeader: { success: true, resultCode: null, resultMessage: null },
    dataBody,
  }),
})

const fail = () => ({ ok: false, json: async () => ({}) })

describe('share preview server fetch', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv, BACKEND_API_URL: 'http://backend:8080/' }
    delete process.env.NEXT_PUBLIC_API_URL
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('백엔드 주소가 없으면 부르지 않고 실패로 돌려준다', async () => {
    delete process.env.BACKEND_API_URL
    const fetcher = vi.fn()

    await expect(
      resolveShareLinkOnServer('abc', {
        fetcher: fetcher as SharePreviewFetcher,
      }),
    ).resolves.toEqual({ ok: false })
    expect(fetcher).not.toHaveBeenCalled()
  })

  const resolveBody = (expiresAt: string) => ({
    shareType: { code: 'COMMERCIAL_ANALYSIS', name: '상권 분석' },
    payload: { commercialCode: '3110562' },
    createdAt: '2026-10-01T00:00:00',
    expiresAt,
  })
  // 2026-10-10 09:00 KST
  const NOW = Date.parse('2026-10-10T09:00:00+09:00')

  it('공개 해석 API 를 revalidate 캐시로 부르고 shareType 코드와 payload 를 꺼낸다', async () => {
    const fetcher = vi.fn<SharePreviewFetcher>(async () =>
      ok(resolveBody('2027-01-08T08:44:12.723600429')),
    )

    await expect(
      resolveShareLinkOnServer('7GFPfbs3', { fetcher, now: NOW }),
    ).resolves.toEqual({
      ok: true,
      shareType: 'COMMERCIAL_ANALYSIS',
      payload: { commercialCode: '3110562' },
    })
    const [url, init] = fetcher.mock.calls[0]
    expect(url).toBe('http://backend:8080/api/v1/share-links/7GFPfbs3')
    expect(init.next).toEqual({ revalidate: 3600 })
    // 인증 헤더를 싣지 않는다 — 수신자는 비로그인이다.
    expect(init.headers).toEqual({ Accept: 'application/json' })
  })

  it.each([
    ['경로 조각', '..'],
    ['슬래시', 'a/b'],
    ['공백', 'a b'],
    ['17자 이상', 'A'.repeat(17)],
    ['아주 긴 문자열', 'A'.repeat(5000)],
    ['빈 문자열', ''],
  ])('형식이 아닌 코드(%s)는 백엔드를 부르지 않는다', async (_label, code) => {
    const fetcher = vi.fn<SharePreviewFetcher>()

    await expect(resolveShareLinkOnServer(code, { fetcher })).resolves.toEqual({
      ok: false,
    })
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('캐시된 성공 응답이라도 expiresAt 이 지났으면 실패다', async () => {
    const fetcher = vi.fn<SharePreviewFetcher>(async () =>
      ok(resolveBody('2026-10-10T08:59:59.999999999')),
    )

    await expect(
      resolveShareLinkOnServer('7GFPfbs3', { fetcher, now: NOW }),
    ).resolves.toEqual({ ok: false })
  })

  it('만료 경계 직전은 성공이다 (오프셋 없는 값은 KST 로 읽는다)', async () => {
    const fetcher = vi.fn<SharePreviewFetcher>(async () =>
      ok(resolveBody('2026-10-10T09:00:01')),
    )

    await expect(
      resolveShareLinkOnServer('7GFPfbs3', { fetcher, now: NOW }),
    ).resolves.toMatchObject({ ok: true })
  })

  it('시간 제한을 신호로 넘긴다', async () => {
    const fetcher = vi.fn<SharePreviewFetcher>(async () => fail())

    await resolveShareLinkOnServer('7GFPfbs3', { fetcher, timeoutMs: 1500 })

    expect(fetcher.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal)
  })

  it.each([
    ['만료·미존재(4xx)', async () => fail()],
    [
      'success:false',
      async () => ({
        ok: true,
        json: async () => ({ dataHeader: { success: false }, dataBody: null }),
      }),
    ],
    [
      '통신 실패',
      async () => {
        throw new TypeError('fetch failed')
      },
    ],
  ])('%s 는 실패로 돌려준다', async (_label, impl) => {
    await expect(
      resolveShareLinkOnServer('abc', {
        fetcher: impl as SharePreviewFetcher,
      }),
    ).resolves.toEqual({ ok: false })
  })

  it('비교는 상권 두 개의 이름을 모은다', async () => {
    const fetcher = vi.fn<SharePreviewFetcher>(async url =>
      ok({
        commercialCode: url.includes('/A/') ? 'A' : 'B',
        commercialName: url.includes('/A/') ? '홍대입구역' : '상수역',
        districtCode: '11440',
        districtName: '마포구',
        administrationCode: '11440660',
        administrationName: '서교동',
      }),
    )

    await expect(
      fetchSharePreviewNames(
        {
          ok: true,
          shareType: 'COMMERCIAL_COMPARISON',
          payload: { commercialCodes: ['A', 'B'] },
        },
        fetcher,
      ),
    ).resolves.toEqual({
      districtName: '마포구',
      administrationName: '서교동',
      commercialNames: ['홍대입구역', '상수역'],
    })
    expect(fetcher.mock.calls.map(([url]) => url)).toEqual([
      'http://backend:8080/api/v1/regions/commercials/A/administration',
      'http://backend:8080/api/v1/regions/commercials/B/administration',
    ])
  })

  it('행정동 탐색은 행정동 목록에서 이름을 찾는다', async () => {
    const fetcher = vi.fn<SharePreviewFetcher>(async () =>
      ok([
        { administrationCode: '11440650', administrationName: '합정동' },
        { administrationCode: '11440660', administrationName: '서교동' },
      ]),
    )

    const names = await fetchSharePreviewNames(
      {
        ok: true,
        shareType: 'ADMINISTRATION_ANALYSIS',
        payload: { districtCode: '11440', administrationCode: '11440660' },
      },
      fetcher,
    )

    expect(names.administrationName).toBe('서교동')
    expect(fetcher.mock.calls[0][0]).toBe(
      'http://backend:8080/api/v1/regions/districts/11440/administrations',
    )
  })

  it('이름 조회가 실패하면 null 로 남긴다', async () => {
    const names = await fetchSharePreviewNames(
      {
        ok: true,
        shareType: 'COMMERCIAL_ANALYSIS',
        payload: { commercialCode: 'A' },
      },
      async () => fail(),
    )

    expect(names.commercialNames).toEqual([null])
  })

  it('해석에 실패했으면 이름을 조회하지 않는다', async () => {
    const fetcher = vi.fn()

    await fetchSharePreviewNames(
      { ok: false },
      fetcher as unknown as SharePreviewFetcher,
    )
    expect(fetcher).not.toHaveBeenCalled()
  })
})
