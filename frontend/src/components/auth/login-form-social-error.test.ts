import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { socialLoginErrorMessage } from '@/lib/auth/social-errors'

/** `GuestOnly` 가 폼을 그리도록 세션 상태를 갈아끼운다(`auth-form-validation.test.ts` 와 같다). */
const authState = vi.hoisted(() => ({
  current: { hasHydrated: true, isLoggedIn: false },
}))

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: (selector: (state: typeof authState.current) => unknown) =>
    selector(authState.current),
}))

const searchParamsBox = vi.hoisted(() => ({ current: new URLSearchParams() }))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: () => undefined, replace: () => undefined }),
  useSearchParams: () => searchParamsBox.current,
}))

const { default: LoginForm } = await import('./login-form')

const renderWithError = (error: string | null) => {
  searchParamsBox.current = new URLSearchParams(
    error === null ? '' : `error=${error}`,
  )
  return renderToStaticMarkup(createElement(LoginForm))
}

beforeEach(() => {
  searchParamsBox.current = new URLSearchParams()
})

describe('LoginForm — 소셜 콜백 실패 안내 (#527)', () => {
  it('social_state 는 만료·다른 브라우저 안내를 보여 준다', () => {
    const markup = renderWithError('social_state')

    expect(markup).toContain(String(socialLoginErrorMessage('social_state')))
    expect(markup).toContain('다른 브라우저에서 시작됐어요')
    expect(markup).not.toContain('href="/register">회원가입하기')
  })

  it('social_signup 은 회원가입 화면 링크를 함께 보여 준다', () => {
    const markup = renderWithError('social_signup')

    expect(markup).toContain('카카오 계정으로 처음 오셨어요.')
    expect(markup).toContain('href="/register">회원가입하기</a>')
  })

  it('social 은 기존 실패 문구를 그대로 쓴다', () => {
    expect(renderWithError('social')).toContain(
      '소셜 로그인에 실패했습니다. 다시 시도해 주세요.',
    )
  })

  it('모르는 error 값은 아무 안내도 그리지 않는다', () => {
    const markup = renderWithError('evil')

    expect(markup).not.toContain('소셜 로그인에 실패했습니다')
    expect(markup).not.toContain('카카오 계정으로 처음 오셨어요')
  })
})

describe('LoginForm — 설명 문구', () => {
  it('로그인 없이 쓰는 기능과 로그인이 필요한 기능을 사실대로 말한다', () => {
    const markup = renderWithError(null)

    expect(markup).toContain('분석과 추천은 로그인 없이 쓸 수 있습니다.')
    expect(markup).toContain(
      'AI 리포트, 북마크, 분석 화면 보관함, 시뮬레이션 저장, 커뮤니티 글쓰기와 댓글도 이용할 수 있습니다.',
    )
    expect(markup).not.toContain('채팅')
  })
})
