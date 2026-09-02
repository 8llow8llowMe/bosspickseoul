import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

/**
 * `GuestOnly` 가 `hasHydrated` 를 보고 폼 대신 대기 화면을 그리므로 세션 상태를
 * 목으로 갈아끼운다 (`auth-form-validation.test.ts` 와 같은 방식).
 */
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

const { default: PasswordResetForm, CODE_MAY_NOT_ARRIVE_NOTICE } =
  await import('./password-reset-form')
const { default: LoginForm } = await import('./login-form')

const render = () => renderToStaticMarkup(createElement(PasswordResetForm))

describe('PasswordResetForm — 첫 단계', () => {
  it('이메일을 받아 코드를 보내는 단계로 시작한다', () => {
    const markup = render()

    expect(markup).toContain('가입한 이메일')
    expect(markup).toContain('인증코드 받기')
    // 아직 코드를 안 보냈으므로 코드 입력란은 없다.
    expect(markup).not.toContain('메일로 받은 인증코드')
  })

  /**
   * ⚠️ **A5 에서 가장 중요한 문구다.**
   *
   * 백엔드는 계정 존재 여부를 숨기려고 **어떤 이메일에도 성공으로 응답**하고, 미가입
   * 이메일과 소셜 전용 계정에는 코드가 아니라 **안내 메일**을 보낸다
   * (`PasswordResetProcessorTest`: `notRegisteredMails` / `socialOnlyMails`).
   *
   * 화면이 "메일을 보냈어요" 만 적으면 그 두 경우의 사용자는 **오지 않을 코드**를
   * 기다리며 재전송만 반복한다. 어느 경우인지 말하면 계정 존재 여부가 새므로, 대신
   * "코드가 아니라 안내 메일이 갈 수도 있다"는 일반적 사실을 적는다.
   */
  it('코드가 오지 않을 수 있다는 사실을 미리 적는다', () => {
    const markup = render()

    expect(markup).toContain(CODE_MAY_NOT_ARRIVE_NOTICE)
    expect(CODE_MAY_NOT_ARRIVE_NOTICE).toContain('소셜')
    expect(CODE_MAY_NOT_ARRIVE_NOTICE).toContain('안내 메일')
  })

  /*
   * 계정 존재 여부를 화면이 단정하면 백엔드가 숨긴 것을 프런트가 흘리는 꼴이 된다.
   * 이 화면은 어떤 경우에도 "가입되지 않은 이메일입니다" 라고 말하지 않는다.
   */
  it('계정이 없다고 단정하지 않는다', () => {
    const markup = render()

    expect(markup).not.toContain('가입되지 않은 이메일입니다')
    expect(markup).not.toContain('존재하지 않는 계정')
  })

  it('로그인으로 돌아갈 길을 남긴다', () => {
    expect(render()).toContain('/login')
  })
})

describe('LoginForm — 재설정 진입점과 복귀', () => {
  /* 들어갈 길이 없으면 화면을 만들어도 아무도 도달하지 못한다. */
  it('로그인 화면이 재설정으로 가는 링크를 준다', () => {
    searchParamsBox.current = new URLSearchParams()
    const markup = renderToStaticMarkup(createElement(LoginForm))

    expect(markup).toContain('/password-reset')
    expect(markup).toContain('비밀번호를 잊으셨나요?')
  })

  /**
   * 재설정은 **전 기기 세션을 무효화한다**(`PasswordResetProcessor` 가
   * `deleteAllSessions` 를 부른다). 그래서 사용자는 갑자기 로그인 화면에 서게 되는데,
   * 아무 말도 없으면 재설정이 실패한 것처럼 읽힌다.
   */
  it('재설정 직후 로그인 화면이 결과를 알려 준다', () => {
    searchParamsBox.current = new URLSearchParams('reset=1')
    const markup = renderToStaticMarkup(createElement(LoginForm))

    expect(markup).toContain('비밀번호를 재설정했어요')
  })

  it('평소 로그인 화면에는 그 안내가 없다', () => {
    searchParamsBox.current = new URLSearchParams()
    const markup = renderToStaticMarkup(createElement(LoginForm))

    expect(markup).not.toContain('비밀번호를 재설정했어요')
  })
})
