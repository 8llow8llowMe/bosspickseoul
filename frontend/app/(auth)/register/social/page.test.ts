import { isValidElement } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

/** `redirect()` 는 실제로 throw 해 렌더를 끊는다. 같은 방식으로 흉내 낸다. */
const redirect = vi.hoisted(() =>
  vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT ${path}`)
  }),
)
vi.mock('next/navigation', () => ({ redirect }))

const { default: Page } = await import('./page')

const visit = (query: Record<string, string>) =>
  Page({ searchParams: Promise.resolve(query) })

beforeEach(() => {
  redirect.mockClear()
})

describe('/register/social 라우트', () => {
  it('provider 가 화이트리스트 밖이면 /register 로 보낸다', async () => {
    await expect(visit({ provider: 'evil', reason: 'terms' })).rejects.toThrow(
      'NEXT_REDIRECT /register',
    )
    expect(redirect).toHaveBeenCalledWith('/register')
  })

  it('reason·redirect 를 걸러 화면에 넘긴다', async () => {
    const element = await visit({
      provider: 'kakao',
      reason: 'age',
      redirect: '//evil.example',
    })

    expect(redirect).not.toHaveBeenCalled()
    expect(isValidElement(element)).toBe(true)
    expect(element.props).toEqual({ reason: 'age', returnTo: '/' })
  })
})
