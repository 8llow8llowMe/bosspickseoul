import { expect, test } from '@playwright/test'

/**
 * page 없이 하위 경로만 있는 기능 루트는 목록으로 보낸다(#636, next.config.ts redirects).
 * 임시 redirect(307)이고 쿼리를 유지한다. 끝 슬래시도 같은 규칙이 받는다.
 */
test.describe('기능 루트 redirect', () => {
  for (const path of ['/community']) {
    test(`${path}?region=1 — 307 · 쿼리 유지 · 목록으로`, async ({
      request,
    }) => {
      const response = await request.get(`${path}?region=1`, {
        maxRedirects: 0,
      })
      expect(response.status()).toBe(307)
      const location = new URL(response.headers()['location'], 'http://x')
      expect(location.pathname).toBe('/community/list')
      expect(location.search).toBe('?region=1')
    })
  }

  /*
    끝 슬래시는 Next 가 먼저 308 로 떼고(쿼리 유지) 위 규칙이 307 로 이어 받는다.
    page 로 열지 않는다 — 목록 화면이 그려지면 브라우저가 커뮤니티 BFF 를 불러 백엔드 없는 CI 에서
    500 이 난다. 레이아웃 슈트는 BFF 를 부르지 않는다(qa.md §2). redirect 연쇄의 최종 주소만 본다.
  */
  for (const path of ['/community/', '/community']) {
    test(`${path}?region=1 — 최종 주소가 /community/list, 쿼리 유지`, async ({
      request,
    }) => {
      const response = await request.get(`${path}?region=1`, {
        maxRedirects: 5,
      })
      const finalUrl = new URL(response.url())
      expect(finalUrl.pathname).toBe('/community/list')
      expect(finalUrl.search).toBe('?region=1')
    })
  }

  test('/chatting — 307 로 /chatting/list (비로그인은 이어서 로그인)', async ({
    request,
  }) => {
    const response = await request.get('/chatting', { maxRedirects: 0 })
    expect(response.status()).toBe(307)
    expect(new URL(response.headers()['location'], 'http://x').pathname).toBe(
      '/chatting/list',
    )
  })
})
