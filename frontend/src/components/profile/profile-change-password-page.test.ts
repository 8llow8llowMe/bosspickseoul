import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import ProfileChangePasswordPage, {
  canSubmitNewPassword,
  describeNewPasswordFieldErrors,
  NEW_PASSWORD_MISMATCH_ERROR,
  NEW_PASSWORD_RULE_ERROR,
  PASSWORD_CHANGE_NOTICE,
  PASSWORD_SETUP_NOTICE,
  SOCIAL_ONLY_CONSEQUENCES,
  visibleNewPasswordFieldErrors,
} from '@/components/profile/profile-change-password-page'
import { PASSWORD_REVEAL_LABEL } from '@/components/ui/text-field'
import { PASSWORD_RULE_TEXT } from '@/lib/auth/password-rules'

type TestMemberInfo = {
  memberId: string
  provider: string | null
  hasPassword: boolean
} | null

const authBox = vi.hoisted(() => ({
  memberInfo: null as TestMemberInfo,
  hasHydrated: true,
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}))

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: (select: (state: Record<string, unknown>) => unknown) =>
    select({
      memberInfo: authBox.memberInfo,
      hasHydrated: authBox.hasHydrated,
      hydrate: () => Promise.resolve(),
      clearSession: () => {},
    }),
}))

const render = () =>
  renderToStaticMarkup(
    createElement(
      QueryClientProvider,
      { client: new QueryClient() },
      createElement(ProfileChangePasswordPage),
    ),
  )

beforeEach(() => {
  authBox.hasHydrated = true
  authBox.memberInfo = {
    memberId: 'member-1',
    provider: null,
    hasPassword: true,
  }
})

describe('describeNewPasswordFieldErrors', () => {
  /*
   * 오류를 틀린 칸에 붙인다(#583). 예전에는 규칙 문구 자리를 오류가 갈아 치워, 틀린 순간 요구사항이 사라지고
   * 어느 칸이 틀렸는지도 보이지 않았다.
   */
  it('아직 아무것도 입력하지 않았으면 나무라지 않는다', () => {
    expect(describeNewPasswordFieldErrors('', '')).toEqual({
      newPassword: null,
      confirmation: null,
    })
  })

  it('규칙을 어기면 새 비밀번호 칸에 오류를 붙인다', () => {
    expect(describeNewPasswordFieldErrors('short', '')).toEqual({
      newPassword: NEW_PASSWORD_RULE_ERROR,
      confirmation: null,
    })
  })

  it('확인이 다르면 확인 칸에 오류를 붙인다', () => {
    expect(
      describeNewPasswordFieldErrors('password123!', 'password124!'),
    ).toEqual({ newPassword: null, confirmation: NEW_PASSWORD_MISMATCH_ERROR })
  })

  it('둘 다 맞으면 할 말이 없다', () => {
    expect(
      describeNewPasswordFieldErrors('password123!', 'password123!'),
    ).toEqual({ newPassword: null, confirmation: null })
  })
})

describe('visibleNewPasswordFieldErrors', () => {
  const errors = {
    newPassword: NEW_PASSWORD_RULE_ERROR,
    confirmation: NEW_PASSWORD_MISMATCH_ERROR,
  }

  /* 첫 글자부터 빨갛게 칠하면 쓰는 중인 사람을 나무라게 된다. */
  it('칸을 떠나기 전에는 새 비밀번호 오류를 감춘다', () => {
    expect(
      visibleNewPasswordFieldErrors(errors, {
        newPasswordTouched: false,
        confirmationTouched: false,
        newPasswordLength: 12,
        confirmationLength: 3,
      }),
    ).toEqual({ newPassword: null, confirmation: null })
  })

  it('칸을 떠나면 보인다', () => {
    expect(
      visibleNewPasswordFieldErrors(errors, {
        newPasswordTouched: true,
        confirmationTouched: true,
        newPasswordLength: 12,
        confirmationLength: 3,
      }),
    ).toEqual(errors)
  })

  /* 다 쳤는데 버튼이 안 눌리면 이유가 바로 보여야 한다. */
  it('확인을 새 비밀번호만큼 다 쳤으면 칸을 떠나기 전에도 다르다고 알린다', () => {
    expect(
      visibleNewPasswordFieldErrors(errors, {
        newPasswordTouched: false,
        confirmationTouched: false,
        newPasswordLength: 12,
        confirmationLength: 12,
      }).confirmation,
    ).toBe(NEW_PASSWORD_MISMATCH_ERROR)
  })
})

describe('canSubmitNewPassword', () => {
  it('규칙을 통과하고 확인까지 같아야 제출할 수 있다', () => {
    expect(canSubmitNewPassword('password123!', 'password123!')).toBe(true)
    expect(canSubmitNewPassword('password123!', 'password124!')).toBe(false)
    expect(canSubmitNewPassword('short', 'short')).toBe(false)
    expect(canSubmitNewPassword('', '')).toBe(false)
  })
})

describe('ProfileChangePasswordPage — 계정 상태가 화면을 가른다', () => {
  it('일반 계정에는 변경 폼만 준다', () => {
    const markup = render()

    expect(markup).toContain('비밀번호 변경')
    expect(markup).toContain('현재 비밀번호')
    expect(markup).not.toContain('소셜 전용으로 전환')
  })

  it('소셜 연결 + 비밀번호 있음이면 전환 패널을 함께 준다', () => {
    authBox.memberInfo = {
      memberId: 'member-1',
      provider: 'KAKAO',
      hasPassword: true,
    }

    const markup = render()

    expect(markup).toContain('현재 비밀번호')
    expect(markup).toContain('소셜 전용으로 전환')
  })

  /* 비밀번호가 없는 계정에 「현재 비밀번호」를 물으면 답할 수 없는 질문이 된다. */
  it('소셜 전용이면 현재 비밀번호를 묻지 않는다', () => {
    authBox.memberInfo = {
      memberId: 'member-1',
      provider: 'KAKAO',
      hasPassword: false,
    }

    const markup = render()

    expect(markup).toContain('비밀번호 설정')
    expect(markup).not.toContain('현재 비밀번호')
    expect(markup).not.toContain('소셜 전용으로 전환')
  })

  it('있을 수 없는 조합이면 폼을 주지 않는다', () => {
    authBox.memberInfo = {
      memberId: 'member-1',
      provider: null,
      hasPassword: false,
    }

    const markup = render()

    expect(markup).toContain('계정 상태를 확인하지 못했어요')
    expect(markup).not.toContain('<form')
  })

  it('계정 정보를 아직 못 받았으면 폼 대신 안내를 보여 준다', () => {
    authBox.hasHydrated = false

    const markup = render()

    expect(markup).toContain('계정 정보를 불러오는 중이에요')
    expect(markup).not.toContain('<form')
  })
})

describe('ProfileChangePasswordPage — 결과를 먼저 알린다', () => {
  it('변경이 전 기기 재로그인을 부른다는 것을 미리 적는다', () => {
    expect(render()).toContain(PASSWORD_CHANGE_NOTICE)
    expect(PASSWORD_CHANGE_NOTICE).toContain('다시 로그인')
  })

  it('최초 설정은 세션이 유지된다는 것을 적는다', () => {
    authBox.memberInfo = {
      memberId: 'member-1',
      provider: 'KAKAO',
      hasPassword: false,
    }

    expect(render()).toContain(PASSWORD_SETUP_NOTICE)
    expect(PASSWORD_SETUP_NOTICE).toContain('유지')
  })

  /* 전환은 되돌릴 수 있지만 **지금 잃는 것**을 누르기 전에 알려야 한다. */
  it('전환 패널이 잃는 것을 먼저 나열한다', () => {
    authBox.memberInfo = {
      memberId: 'member-1',
      provider: 'KAKAO',
      hasPassword: true,
    }

    const markup = render()

    SOCIAL_ONLY_CONSEQUENCES.forEach(line => {
      expect(markup).toContain(line)
    })
    expect(SOCIAL_ONLY_CONSEQUENCES.join(' ')).toContain('로그아웃')
    expect(SOCIAL_ONLY_CONSEQUENCES.join(' ')).toContain('다시 설정')
  })
})

describe('ProfileChangePasswordPage — 처음엔 아무 버튼도 눌리지 않는다', () => {
  it('빈 폼에서는 제출 버튼이 비활성이다', () => {
    const markup = render()

    expect(markup).toMatch(/<button[^>]*disabled/)
  })

  it('규칙 문구를 늘 보여 준다', () => {
    expect(render()).toContain(PASSWORD_RULE_TEXT)
  })

  /* #583 — 가입 폼에만 있던 표시 토글을 공용 TextField 로 올려 세 칸 모두에 둔다. */
  it('비밀번호 칸마다 표시 토글이 있다', () => {
    const markup = render()

    expect(
      markup.match(new RegExp(`aria-label="${PASSWORD_REVEAL_LABEL}"`, 'g')),
    ).toHaveLength(3)
  })

  it('규칙 문구를 새 비밀번호 칸에 aria-describedby 로 잇는다', () => {
    const markup = render()
    const ruleId = new RegExp(`id="([^"]+)"[^>]*>${PASSWORD_RULE_TEXT}`).exec(
      markup,
    )?.[1]

    expect(ruleId).toBeTruthy()
    expect(markup).toContain(`aria-describedby="${ruleId}"`)
  })

  /* 전환은 체크박스를 켜야 열린다(되돌릴 수 있는 동작이라 타이핑까지는 요구하지 않는다). */
  it('전환 버튼은 체크 전에는 비활성이다', () => {
    authBox.memberInfo = {
      memberId: 'member-1',
      provider: 'KAKAO',
      hasPassword: true,
    }

    const markup = render()

    expect(markup).toContain('type="checkbox"')
    expect(markup).toMatch(/<button[^>]*disabled/)
  })
})

/* 자리표시자 시절 문구가 남아 있으면 안 된다. */
describe('ProfileChangePasswordPage — 자리표시자 흔적', () => {
  it('「준비 중」 문구가 남아 있지 않다', () => {
    expect(render()).not.toContain('준비 중')
  })
})
