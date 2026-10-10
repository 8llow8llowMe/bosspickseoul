import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import type { SocialSignupReason } from '@/lib/auth/signup-consent'

/** `GuestOnly` 가 화면을 그리도록 세션 상태를 갈아끼운다(`auth-form-validation.test.ts` 와 같다). */
vi.mock('@/stores/auth-store', () => ({
  useAuthStore: (
    selector: (state: { hasHydrated: boolean; isLoggedIn: boolean }) => unknown,
  ) => selector({ hasHydrated: true, isLoggedIn: false }),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: () => undefined, replace: () => undefined }),
}))

const { default: SocialSignupConsentPage } =
  await import('./social-signup-consent-page')

const render = (reason: SocialSignupReason) =>
  renderToStaticMarkup(
    createElement(SocialSignupConsentPage, { reason, returnTo: '/' }),
  )

describe('SocialSignupConsentPage (TC-CON-004)', () => {
  it('제목·eyebrow 와 동의 fieldset, 카카오 버튼을 그린다', () => {
    const markup = render('terms')

    expect(markup).toContain('카카오로 가입')
    expect(markup).toContain('약관에 동의하면 가입이 끝납니다.')
    expect(markup).toContain(
      '필수 항목에 동의한 뒤 「카카오로 시작하기」를 누르면 가입이 끝나요.',
    )
    expect(markup).toContain('<fieldset')
    expect(markup).toContain('카카오로 시작하기')
  })

  it('reason=terms 면 처음 오신 안내를 보여 주고 체크박스를 강조하지 않는다', () => {
    const markup = render('terms')

    expect(markup).toContain(
      '카카오 계정으로 처음 오셨어요. 아래 필수 항목에 동의해 주세요.',
    )
    expect(markup).not.toContain('aria-invalid')
    expect(markup).not.toContain('만 14세 이상만 가입할 수 있어요')
    expect(markup).not.toContain('role="alert"')
  })

  it('reason=age 면 왜 왔는지만 info 로 말하고, 빨간 표시는 만 14세 인라인 오류 하나다', () => {
    const markup = render('age')

    expect(markup).toContain(
      '카카오 가입을 마치려면 만 14세 이상인지 확인해 주세요.',
    )
    expect(markup).not.toContain('카카오 계정으로 처음 오셨어요')
    // 같은 문장이 상단 Notice 와 인라인 오류에 두 번 나오지 않는다.
    expect(markup.match(/만 14세 이상만 가입할 수 있어요\./g)).toHaveLength(1)
    expect(markup).not.toContain('role="alert"')
    const age = markup.match(
      /<input[^>]*id="social-signup-consent-ageOver14Confirmed"[^>]*>/,
    )?.[0]
    expect(age).toContain('aria-invalid="true"')
    expect(markup.match(/aria-invalid="true"/g)).toHaveLength(1)
  })

  it('「또는」 구분선 없이 카카오 버튼만 둔다', () => {
    expect(render('terms')).not.toContain('또는')
  })

  it('이메일 가입과 로그인으로 가는 길을 남긴다', () => {
    const markup = render('terms')

    expect(markup).toContain('href="/register">이메일로 가입하기</a>')
    expect(markup).toContain('href="/login">로그인으로 돌아가기</a>')
    // 두 링크 사이 구분자는 보조기술에 읽히지 않는다.
    expect(markup).toMatch(
      /이메일로 가입하기<\/a><span aria-hidden="true">·<\/span><a [^>]*href="\/login"/,
    )
  })
})
