import { isValidElement, type ReactElement } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

/*
  `/s/{shareCode}` 의 연결부(UA → 해석 → 분기 → redirect / 클라이언트 화면, 메타)를 고정한다.
  네트워크는 `share-preview.server` 를 통째로 바꾼다 — 조회 자체는 share-preview.server.test.ts 몫이다.
*/

const userAgentBox = vi.hoisted(() => ({ current: '' as string | null }))
const redirectMock = vi.hoisted(() =>
  vi.fn((href: string) => {
    throw Object.assign(new Error('NEXT_REDIRECT'), { href })
  }),
)
const server = vi.hoisted(() => ({
  loadShareResolution: vi.fn(),
  loadShareNames: vi.fn(),
}))

vi.mock('next/headers', () => ({
  headers: async () =>
    new Headers(
      userAgentBox.current ? { 'user-agent': userAgentBox.current } : {},
    ),
}))
vi.mock('next/navigation', () => ({ redirect: redirectMock }))
vi.mock('@/lib/share/share-preview.server', () => server)
vi.mock('@/components/share/share-entry-page', () => ({
  default: function ShareEntryPage() {
    return null
  },
}))

const { default: Page, generateMetadata } = await import('./page')

const CHROME =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36'
const KAKAO = 'kakaotalk-scrap/1.0; +https://devtalk.kakao.com/'

const RESOLVED = {
  ok: true,
  shareType: 'COMMERCIAL_ANALYSIS',
  payload: {
    districtCode: '11110',
    administrationCode: '11110515',
    commercialCode: '3110008',
    serviceCode: 'CS100010',
    periodCode: '20252',
  },
}
const NAMES = {
  districtName: '종로구',
  administrationName: '청운효자동',
  commercialNames: ['배화여자대학교(박노수미술관)'],
}

const props = { params: Promise.resolve({ shareCode: '7GFPfbs3' }) }

beforeEach(() => {
  redirectMock.mockClear()
  server.loadShareResolution.mockReset()
  server.loadShareNames.mockReset()
  server.loadShareResolution.mockResolvedValue(RESOLVED)
  server.loadShareNames.mockResolvedValue(NAMES)
})

describe('/s/[shareCode] page', () => {
  it('사람은 해석만 기다려 원래 화면으로 보낸다 (1.5초 상한)', async () => {
    userAgentBox.current = CHROME

    await expect(Page(props)).rejects.toThrow('NEXT_REDIRECT')
    expect(redirectMock).toHaveBeenCalledWith(
      '/analysis/result?districtCode=11110&administrationCode=11110515&commercialCode=3110008&serviceCode=CS100010&periodCode=20252',
    )
    expect(server.loadShareResolution).toHaveBeenCalledWith('7GFPfbs3', 1500)
    expect(server.loadShareNames).not.toHaveBeenCalled()
  })

  it('미리보기 봇은 보내지 않고 클라이언트 화면을 그린다 (3초 상한)', async () => {
    userAgentBox.current = KAKAO

    const element = await Page(props)

    expect(redirectMock).not.toHaveBeenCalled()
    expect(isValidElement(element)).toBe(true)
    expect(server.loadShareResolution).toHaveBeenCalledWith('7GFPfbs3', 3000)
  })

  it('해석에 실패하면 사람도 클라이언트 화면이 이어받는다', async () => {
    userAgentBox.current = CHROME
    server.loadShareResolution.mockResolvedValue({ ok: false })

    const element = (await Page(props)) as ReactElement

    expect(redirectMock).not.toHaveBeenCalled()
    expect(isValidElement(element)).toBe(true)
  })
})

describe('/s/[shareCode] generateMetadata', () => {
  it('봇에게는 상권·업종·분기 제목을 준다', async () => {
    userAgentBox.current = KAKAO

    const metadata = await generateMetadata(props)

    expect(metadata.title).toBe(
      '배화여자대학교(박노수미술관) · 커피-음료 상권분석 (2025년 2분기)',
    )
    expect(metadata.openGraph?.title).toBe(
      '배화여자대학교(박노수미술관) · 커피-음료 상권분석 (2025년 2분기) | BossPickSeoul',
    )
    expect(metadata.robots).toMatchObject({ index: false })
  })

  it('307 을 받을 사람에게는 이름을 조회하지 않는다', async () => {
    userAgentBox.current = CHROME

    const metadata = await generateMetadata(props)

    expect(server.loadShareNames).not.toHaveBeenCalled()
    expect(metadata.title).toBe('공유된 분석 화면')
  })

  it('해석 실패·만료면 고정 문구다', async () => {
    userAgentBox.current = KAKAO
    server.loadShareResolution.mockResolvedValue({ ok: false })

    const metadata = await generateMetadata(props)

    expect(metadata.title).toBe('공유된 분석 화면')
    expect(metadata.description).toBe('공유받은 상권 분석 화면을 엽니다.')
    expect(server.loadShareNames).not.toHaveBeenCalled()
  })
})
