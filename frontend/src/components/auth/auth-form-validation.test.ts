import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

/**
 * 세션 상태를 목으로 갈아끼운다 — `GuestOnly` 가 `hasHydrated` 를 보고 폼 대신
 * 대기 화면을 그리기 때문이다. zustand 는 서버 렌더에서 `getServerSnapshot` 으로
 * 생성 시점 초기 상태를 읽으므로 `setState` 로는 바꿀 수 없다
 * (simulation-save-button.test.ts 와 같은 방식).
 */
const authState = vi.hoisted(() => ({
  current: { hasHydrated: true, isLoggedIn: false },
}))

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: (selector: (state: typeof authState.current) => unknown) =>
    selector(authState.current),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: () => undefined, replace: () => undefined }),
  useSearchParams: () => new URLSearchParams(),
}))

const { default: LoginForm } = await import('./login-form')
const { default: RegisterForm } = await import('./register-form')

/**
 * `type="email"` 이 켜져 있으면 브라우저가 **자체 말풍선을 띄우며 제출을 가로챈다.**
 * 그러면 EMAIL_PATTERN 검사도, DESIGN.md §Error (inline field) 규격의 인라인 에러도
 * 아예 도달하지 못한다 — 실제로 그 상태였다. `noValidate` 가 빠지면 조용히 그리로
 * 되돌아가므로 여기서 못박는다.
 */
describe('auth 폼은 브라우저 기본 검증을 끈다', () => {
  it.each([
    ['로그인', LoginForm],
    ['회원가입', RegisterForm],
  ])('%s 폼에 noValidate 가 있다', (_label, Component) => {
    const markup = renderToStaticMarkup(createElement(Component))
    const form = markup.match(/<form[^>]*>/)

    expect(form).not.toBeNull()
    // SSR 마크업은 `noValidate=""` 로 나온다. HTML 속성명은 대소문자를 가리지 않아
    // 브라우저는 그대로 인식한다(실측: `form.noValidate === true`).
    expect(form?.[0].toLowerCase()).toContain('novalidate')
  })

  it('그래도 type="email" 은 유지한다 — 모바일 키보드 힌트다', () => {
    const markup = renderToStaticMarkup(createElement(LoginForm))

    expect(markup).toContain('type="email"')
  })
})
