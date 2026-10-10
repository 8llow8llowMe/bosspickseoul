import { expect, test, type BrowserContext, type Route } from '@playwright/test'

/**
 * 가입 → 로그인 흐름(#576) · 카카오 맨 위(#577) · 세션 확인을 기다리지 않는 폼과 헤더 자리(#579).
 *
 * **실제 백엔드에 가입 요청을 보내지 않는다.** 브라우저가 내보내는 `/api/bff/*`·`/api/auth/me` 를
 * context 에서 모두 가로챈다(`e2e/fixtures/community.ts` 와 같은 방식). 가로채지 못한 BFF 호출은
 * 501 로 막고 `unhandled` 에 남겨 테스트 끝에 비었는지 본다 — 새 호출이 생겨 dev 백엔드로
 * 새는 일이 없게 한다. 세션 쿠키는 두지 않는다(비로그인 방문자).
 */

type AuthApi = {
  unhandled: string[]
  signupBodies: unknown[]
  loginBodies: unknown[]
  /** `/api/auth/me` 응답을 붙잡아 두었다가 `releaseMe()` 로 푼다. */
  releaseMe: () => void
}

const ok = { dataHeader: { success: true }, dataBody: null }

const json = (route: Route, status: number, body: unknown) =>
  route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  })

const routeAuthApi = async (
  context: BrowserContext,
  { holdMe = false } = {},
): Promise<AuthApi> => {
  let release: () => void = () => undefined
  const meGate = holdMe
    ? new Promise<void>(resolve => {
        release = resolve
      })
    : Promise.resolve()
  const api: AuthApi = {
    unhandled: [],
    signupBodies: [],
    loginBodies: [],
    releaseMe: () => release(),
  }

  /*
    로그인도 브라우저에서 가로챈다 — 실제 BFF(`/api/auth/login`)는 백엔드에 POST 를 보내기 때문이다.
    성공하면 그 뒤 `/api/auth/me` 가 회원으로 답한다. 세션 쿠키는 두지 않는다(화면 상태만 흉내).
  */
  let loggedIn = false
  await context.route('**/api/auth/login', async route => {
    api.loginBodies.push(route.request().postDataJSON())
    loggedIn = true
    await json(route, 200, { memberId: '9001' })
  })

  await context.route('**/api/auth/me', async route => {
    await meGate
    await json(
      route,
      200,
      loggedIn
        ? {
            authenticated: true,
            member: {
              memberId: '9001',
              email: 'owner@bosspick.test',
              name: '홍길동',
              nickname: '길동짱',
              profileImageUrl: '',
              role: { code: 'USER', name: '일반 회원', description: '' },
              provider: null,
              hasPassword: true,
            },
          }
        : { authenticated: false },
    )
  })

  await context.route('**/api/bff/**', async route => {
    const request = route.request()
    const { pathname, search } = new URL(request.url())
    const method = request.method()

    if (method === 'POST' && pathname === '/api/bff/auth/email/send-code') {
      await json(route, 200, ok)
      return
    }
    if (method === 'POST' && pathname === '/api/bff/auth/email/verify-code') {
      await json(route, 200, ok)
      return
    }
    if (method === 'POST' && pathname === '/api/bff/members/signup') {
      api.signupBodies.push(request.postDataJSON())
      await json(route, 200, ok)
      return
    }

    api.unhandled.push(`${method} ${pathname}${search}`)
    await json(route, 501, {
      dataHeader: { success: false, resultMessage: 'e2e 고정 응답 없음' },
      dataBody: null,
    })
  })

  return api
}

test.describe('가입 → 로그인 (#576)', () => {
  test('가입을 마치면 안내와 함께 로그인으로 잇고, 이메일을 채우고, 원래 화면을 기억한다', async ({
    page,
    context,
  }) => {
    const api = await routeAuthApi(context)

    await page.goto('/register?redirect=%2Fanalysis')
    await page
      .getByRole('textbox', { name: '이메일' })
      .fill('owner@bosspick.test')
    await page.getByRole('button', { name: '인증코드 발송' }).click()
    await page.getByRole('textbox', { name: '인증코드' }).fill('123456')
    await page.getByRole('button', { name: '인증 확인' }).click()
    await page.locator('input[name="password"]').fill('Passw0rd!')
    await page.getByRole('textbox', { name: '이름' }).fill('홍길동')
    await page.getByRole('textbox', { name: '닉네임' }).fill('길동짱')
    await page.locator('#register-consent-all').check()
    await page.getByRole('button', { name: '회원가입', exact: true }).click()

    await expect(page).toHaveURL(/\/login\?signup=1&redirect=%2Fanalysis$/)
    // 이메일은 URL 에 싣지 않는다.
    expect(page.url()).not.toContain('owner')
    await expect(
      page.getByText('가입을 마쳤어요. 방금 만든 비밀번호로 로그인해 주세요.'),
    ).toBeVisible()
    await expect(page.getByRole('textbox', { name: '이메일' })).toHaveValue(
      'owner@bosspick.test',
    )
    await expect(page.locator('input[name="password"]')).toBeFocused()
    await expect(
      page.getByRole('link', { name: '회원가입', exact: true }),
    ).toHaveAttribute('href', '/register?redirect=%2Fanalysis')

    expect(api.signupBodies).toHaveLength(1)
    expect(api.unhandled, '고정 응답이 없는 BFF 호출').toEqual([])

    // 이어서 로그인하면 원래 가려던 화면으로 간다 — GuestOnly 의 「로그인했으니 홈으로」가 덮지 않는다.
    await page.locator('input[name="password"]').fill('Passw0rd!')
    await page.getByRole('button', { name: '로그인', exact: true }).click()

    await expect(page).toHaveURL(/\/analysis$/)
    // 홈으로 한 번 더 튕기지 않는지, 이동이 가라앉을 때까지 잠깐 더 본다.
    await page.waitForTimeout(500)
    expect(new URL(page.url()).pathname).toBe('/analysis')
    expect(api.loginBodies).toEqual([
      { email: 'owner@bosspick.test', password: 'Passw0rd!' },
    ])
  })
})

test.describe('잠근 이유를 칸 옆에서 (#578)', () => {
  test('비밀번호 칸에서 곧장 「회원가입」을 한 번 누르면 막힌 칸마다 이유가 붙는다', async ({
    page,
    context,
  }) => {
    const api = await routeAuthApi(context)

    await page.goto('/register')
    await page.getByRole('textbox', { name: '이메일' }).fill('a@bosspick.test')
    await page.getByRole('button', { name: '인증코드 발송' }).click()
    await page.getByRole('textbox', { name: '인증코드' }).fill('123456')
    await page.getByRole('button', { name: '인증 확인' }).click()
    await page.locator('input[name="password"]').fill('abc1')
    // 포커스가 비밀번호 칸에 있는 채로 누른다. blur 로 오류 줄이 끼어들어 버튼이 밀리면 이 클릭이 빗나간다.
    await page.getByRole('button', { name: '회원가입', exact: true }).click()

    await expect(page.locator('#register-password-error')).toBeVisible()
    await expect(page.locator('#register-name-error')).toBeVisible()
    await expect(page.locator('#register-nickname-error')).toBeVisible()
    await expect(page.locator('input[name="password"]')).toBeFocused()
    expect(api.signupBodies).toHaveLength(0)
    expect(api.unhandled).toEqual([])
  })
})

test.describe('카카오 맨 위 (#577)', () => {
  for (const path of ['/login', '/register']) {
    test(`${path} 에서 카카오 버튼이 이메일 칸보다 위에 있고 첫 화면 안에 보인다`, async ({
      page,
      context,
    }) => {
      const api = await routeAuthApi(context)
      await page.goto(path)

      const kakao = page.getByRole('button', { name: '카카오 로그인' })
      const email = page.getByRole('textbox', { name: '이메일' })
      await expect(kakao).toBeVisible()
      const kakaoBox = await kakao.boundingBox()
      const emailBox = await email.boundingBox()
      const viewport = page.viewportSize()

      expect(kakaoBox && emailBox).toBeTruthy()
      expect(kakaoBox!.y).toBeLessThan(emailBox!.y)
      expect(kakaoBox!.y + kakaoBox!.height).toBeLessThanOrEqual(
        viewport!.height,
      )
      expect(kakaoBox!.height).toBeGreaterThanOrEqual(44)
      await expect(kakao).toHaveCSS('background-color', 'rgb(254, 229, 0)')
      expect(api.unhandled).toEqual([])
    })
  }
})

test.describe('세션 확인을 기다리지 않는다 (#579)', () => {
  test('세션 쿠키가 없으면 /api/auth/me 응답 전에도 로그인 폼이 보인다', async ({
    page,
    context,
  }) => {
    const api = await routeAuthApi(context, { holdMe: true })

    await page.goto('/login', { waitUntil: 'domcontentloaded' })

    await expect(page.getByRole('textbox', { name: '이메일' })).toBeVisible()
    await expect(page.getByText('세션 상태를 확인하는 중입니다.')).toHaveCount(
      0,
    )

    api.releaseMe()
    expect(api.unhandled).toEqual([])
  })

  test('헤더는 확인 전 로그인·회원가입을 그리지 않고, 같은 폭의 자리를 잡아 둔다', async ({
    page,
    context,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'desktop',
      '로그인·회원가입 버튼은 데스크톱 헤더에만 있다',
    )
    const api = await routeAuthApi(context, { holdMe: true })

    await page.goto('/terms', { waitUntil: 'domcontentloaded' })
    const header = page.locator('[data-site-header]')
    const pending = header.locator('[data-session-pending]')
    await expect(pending).toBeVisible()
    await expect(header.getByRole('link', { name: '로그인' })).toHaveCount(0)
    const pendingBox = await pending.boundingBox()

    api.releaseMe()

    const login = header.getByRole('link', { name: '로그인' })
    const register = header.getByRole('link', { name: '회원가입' })
    await expect(login).toBeVisible()
    await expect(pending).toHaveCount(0)
    const loginBox = await login.boundingBox()
    const registerBox = await register.boundingBox()

    // 자리와 실제 버튼 묶음의 폭·위치가 같다 — 확인이 끝나도 헤더가 흔들리지 않는다(CLS).
    const linksWidth = registerBox!.x + registerBox!.width - loginBox!.x
    expect(Math.abs(pendingBox!.width - linksWidth)).toBeLessThanOrEqual(2)
    expect(Math.abs(pendingBox!.x - loginBox!.x)).toBeLessThanOrEqual(2)
    expect(api.unhandled).toEqual([])
  })
})
