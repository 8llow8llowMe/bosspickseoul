import { NextRequest } from 'next/server'
import { describe, expect, it } from 'vitest'

import { redirectRequestToPath, redirectToPath } from '@/lib/http/redirect'

const request = (url: string, headers: Record<string, string> = {}) =>
  new NextRequest(new URL(url), { headers: new Headers(headers) })

describe('redirectToPath (라우트 핸들러용)', () => {
  it('상대 경로를 Location 에 그대로 싣는다', () => {
    const res = redirectToPath('/login?error=social')

    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe('/login?error=social')
  })

  it('상태 코드를 고를 수 있다', () => {
    expect(redirectToPath('/', 302).status).toBe(302)
  })
})

describe('redirectRequestToPath (미들웨어용)', () => {
  // 회귀 가드: Next 의 미들웨어 어댑터는 응답의 Location 을
  // `new NextURL(location)` 으로 파싱해 요청 host 와 비교한다. 상대 경로는 base 가 없어
  // `TypeError: Invalid URL` 로 500 이 난다 — 보호 경로에 비로그인으로 진입하는 모든
  // 요청이 깨졌다. Location 은 반드시 절대 URL 이어야 한다.
  it('Location 이 절대 URL 이다 (base 없이 파싱된다)', () => {
    const res = redirectRequestToPath(
      request('http://localhost:5173/profile'),
      '/login?redirect=%2Fprofile',
    )
    const location = res.headers.get('location') as string

    expect(() => new URL(location)).not.toThrow()
    expect(location.startsWith('http')).toBe(true)
  })

  it('경로와 쿼리를 보존한다', () => {
    const res = redirectRequestToPath(
      request('http://localhost:5173/chatting/room?roomId=12'),
      '/login?redirect=%2Fchatting%2Froom%3FroomId%3D12',
    )
    const url = new URL(res.headers.get('location') as string)

    expect(url.pathname).toBe('/login')
    expect(url.searchParams.get('redirect')).toBe('/chatting/room?roomId=12')
  })

  it('프록시 헤더의 호스트·프로토콜을 우선한다', () => {
    // standalone 서버는 바인드 주소(0.0.0.0:3000)로 nextUrl 오리진을 만든다.
    // 그 값을 쓰면 브라우저가 도달할 수 없으므로 프록시가 알려준 공개 주소를 써야 한다.
    const res = redirectRequestToPath(
      request('http://0.0.0.0:3000/profile', {
        'x-forwarded-proto': 'https',
        'x-forwarded-host': 'bosspickseoul.com',
        host: '0.0.0.0:3000',
      }),
      '/login',
    )

    expect(res.headers.get('location')).toBe('https://bosspickseoul.com/login')
  })

  it('콤마로 이어진 프록시 헤더는 첫 값만 쓴다', () => {
    const res = redirectRequestToPath(
      request('http://0.0.0.0:3000/profile', {
        'x-forwarded-proto': 'https, http',
        'x-forwarded-host': 'bosspickseoul.com, internal',
      }),
      '/login',
    )

    expect(res.headers.get('location')).toBe('https://bosspickseoul.com/login')
  })

  it('x-forwarded-host 가 없으면 host 헤더를 쓴다', () => {
    const res = redirectRequestToPath(
      request('http://0.0.0.0:3000/profile', { host: 'dev.bosspickseoul.com' }),
      '/login',
    )

    expect(res.headers.get('location')).toBe(
      'http://dev.bosspickseoul.com/login',
    )
  })

  it('프록시 헤더가 없으면 요청 오리진으로 폴백한다 (로컬 개발)', () => {
    const res = redirectRequestToPath(
      request('http://localhost:5173/profile'),
      '/login',
    )

    expect(res.headers.get('location')).toBe('http://localhost:5173/login')
  })

  it('캐시에 실리지 않게 no-store 를 붙인다', () => {
    // x-forwarded-host 는 프록시가 덮어쓰지 않으면 위조될 수 있다. 위조된 응답이
    // 캐시되면 다른 사용자에게도 퍼진다.
    const res = redirectRequestToPath(
      request('http://localhost:5173/profile'),
      '/login',
    )

    expect(res.headers.get('cache-control')).toBe('no-store')
  })
})
