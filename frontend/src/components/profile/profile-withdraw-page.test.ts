import { createElement } from 'react'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { renderToStaticMarkup } from 'react-dom/server'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ServerStyleSheet } from 'styled-components'
import { describe, expect, it, vi } from 'vitest'

import ProfileWithdrawPage, {
  canConfirmWithdraw,
  WITHDRAW_CONSEQUENCES,
} from '@/components/profile/profile-withdraw-page'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}))

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: (
    select: (state: {
      memberInfo: { email: string } | null
      clearSession: () => void
    }) => unknown,
  ) =>
    select({
      memberInfo: { email: 'owner@example.com' },
      clearSession: () => {},
    }),
}))

const render = () =>
  renderToStaticMarkup(
    createElement(
      QueryClientProvider,
      { client: new QueryClient() },
      createElement(ProfileWithdrawPage),
    ),
  )

describe('canConfirmWithdraw', () => {
  /*
   * 백엔드는 탈퇴에 비밀번호를 요구하지 않는다(요청 본문이 없다). 오클릭 방지는
   * 전적으로 화면 몫이라, 자기 이메일을 직접 적게 한다 — 「이 이메일로 재가입 불가」
   * 라는 결과를 가장 정확히 전달하는 마찰이기도 하다.
   */
  it('이메일이 정확히 일치해야 확인할 수 있다', () => {
    expect(canConfirmWithdraw('owner@example.com', 'owner@example.com')).toBe(
      true,
    )
    expect(canConfirmWithdraw('other@example.com', 'owner@example.com')).toBe(
      false,
    )
    expect(canConfirmWithdraw('', 'owner@example.com')).toBe(false)
  })

  /* 앞뒤 공백과 대소문자로 사용자를 괴롭히지 않는다. 자동완성이 흔히 섞어 넣는다. */
  it('공백과 대소문자는 눈감아 준다', () => {
    expect(
      canConfirmWithdraw('  Owner@Example.com  ', 'owner@example.com'),
    ).toBe(true)
  })

  /* 이메일을 아직 모르면(세션 미확인) 어떤 입력도 통과시키지 않는다. */
  it('기준 이메일이 없으면 통과시키지 않는다', () => {
    expect(canConfirmWithdraw('owner@example.com', null)).toBe(false)
    expect(canConfirmWithdraw('', null)).toBe(false)
  })
})

describe('ProfileWithdrawPage', () => {
  /* 되돌릴 수 없는 결과를 **누르기 전에** 알려야 한다. */
  it('탈퇴의 결과를 먼저 알린다', () => {
    const markup = render()

    WITHDRAW_CONSEQUENCES.forEach(line => {
      expect(markup).toContain(line)
    })
  })

  it('같은 이메일로 재가입할 수 없다는 사실을 적는다', () => {
    expect(WITHDRAW_CONSEQUENCES.join(' ')).toContain('다시 가입')
  })

  it('처음에는 탈퇴 버튼이 비활성이다', () => {
    const markup = render()

    expect(markup).toContain('회원 탈퇴')
    expect(markup).toMatch(/<button[^>]*disabled/)
  })

  it('확인 입력란에 기준 이메일을 보여 준다', () => {
    const markup = render()

    expect(markup).toContain('owner@example.com')
  })

  /* 자리표시자 시절 문구가 남아 있으면 안 된다. */
  it('「준비 중」 문구가 남아 있지 않다', () => {
    expect(render()).not.toContain('준비 중')
  })
})

/* #575 · 결정 D-6 — 탈퇴 확정은 파란 보조 버튼이 아니라 danger 48px 이고, 설정 탭에서는 빠진다. */
describe('ProfileWithdrawPage — 위험 동작 표시', () => {
  it('탈퇴 확정 버튼은 danger 채움이고 높이가 48px 다', () => {
    const sheet = new ServerStyleSheet()
    try {
      const markup = renderToStaticMarkup(
        sheet.collectStyles(
          createElement(
            QueryClientProvider,
            { client: new QueryClient() },
            createElement(ProfileWithdrawPage),
          ),
        ),
      )
      const styles = sheet.getStyleTags().replace(/\s+/g, '')

      expect(markup).toMatch(/<button[^>]*type="submit"/)
      expect(styles).toContain('min-height:48px')
      expect(styles).toContain('background:var(--color-danger)')
    } finally {
      sheet.seal()
    }
  })

  it('탈퇴하지 않고 돌아갈 길을 준다', () => {
    expect(render()).toContain('href="/profile/settings/edit"')
  })

  it('설정 탭에는 회원 탈퇴가 없다', () => {
    const layout = readFileSync(
      join(process.cwd(), 'app/(shell)/profile/settings/layout.tsx'),
      'utf8',
    )

    expect(layout).not.toContain("label: '회원 탈퇴'")
    expect(layout).toContain("label: '로그인 기기'")
  })
})
