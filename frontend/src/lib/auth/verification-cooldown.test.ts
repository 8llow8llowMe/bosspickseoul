import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import {
  RESEND_COOLDOWN_SECONDS,
  RESET_CODE_TTL_MINUTES,
} from '@/lib/auth/verification-cooldown'

describe('인증코드 쿨다운', () => {
  /*
   * 백엔드 `EmailVerificationProcessor` · `PasswordResetProcessor` 둘 다
   * `Duration.ofSeconds(60)` 이다. 화면이 더 길게 잠그면 백엔드는 받아 주는데
   * 사용자만 기다린다 — 전에 회원가입이 180 을 들고 있어 실제로 그랬다.
   */
  it('백엔드와 같은 60초다', () => {
    expect(RESEND_COOLDOWN_SECONDS).toBe(60)
  })

  it('코드 유효 시간은 5분이다', () => {
    expect(RESET_CODE_TTL_MINUTES).toBe(5)
  })

  /**
   * 회원가입과 재설정이 **같은 상수를 가져다 쓴다.** 값을 각자 적으면 한쪽만 고쳐지고,
   * 그 어긋남은 "버튼이 왜 아직 잠겨 있지" 로만 드러난다 — 아무도 버그로 신고하지 않는다.
   */
  it('두 화면이 상수를 재정의하지 않는다', () => {
    const read = (path: string) =>
      readFileSync(join(process.cwd(), path), 'utf8')

    const register = read('src/components/auth/register-form.tsx')
    const reset = read('src/components/auth/password-reset-form.tsx')

    expect(register).toContain("from '@/lib/auth/verification-cooldown'")
    expect(reset).toContain("from '@/lib/auth/verification-cooldown'")
    expect(register).not.toMatch(/const RESEND_COOLDOWN_SECONDS\s*=/)
    expect(reset).not.toMatch(/const RESEND_COOLDOWN_SECONDS\s*=/)
  })
})
