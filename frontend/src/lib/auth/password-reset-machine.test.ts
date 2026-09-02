import { describe, expect, it } from 'vitest'

import { PASSWORD_PATTERN } from '@/lib/auth/password-rules'
import {
  canSubmitReset,
  describeResetPasswordIssue,
  isResetCodeInvalidated,
  isValidResetEmail,
} from '@/lib/auth/password-reset-machine'

describe('isResetCodeInvalidated', () => {
  /**
   * 두 코드 모두 **백엔드에 코드가 남아 있지 않다**는 뜻이다
   * (`PasswordResetProcessor`: 만료 AUTH_005, 5회 실패 시 삭제 후 AUTH_017).
   * 그러면 화면은 입력값을 비우고 재전송을 **즉시** 열어 줘야 한다 — 안 그러면
   * "다시 요청해 주세요" 를 읽은 채 재전송이 잠긴 막다른 골목이 된다.
   */
  it.each(['AUTH_005', 'AUTH_017'])('%s 는 코드가 죽었다는 뜻이다', code => {
    expect(isResetCodeInvalidated(code)).toBe(true)
  })

  /* 단순 불일치(AUTH_004)는 코드가 아직 살아 있다 — 재전송을 열면 안 된다. */
  it('AUTH_004(불일치)는 아직 코드가 살아 있다', () => {
    expect(isResetCodeInvalidated('AUTH_004')).toBe(false)
  })

  it('쿨다운·IP 상한은 코드와 무관하다', () => {
    expect(isResetCodeInvalidated('AUTH_003')).toBe(false)
    expect(isResetCodeInvalidated('AUTH_016')).toBe(false)
    expect(isResetCodeInvalidated(null)).toBe(false)
    expect(isResetCodeInvalidated(undefined)).toBe(false)
  })

  /* 회원가입의 시도초과는 AUTH_018 이다. 재설정(AUTH_017)과 헷갈리면 안 된다. */
  it('회원가입용 AUTH_018 을 재설정 코드로 오인하지 않는다', () => {
    expect(isResetCodeInvalidated('AUTH_018')).toBe(false)
  })
})

describe('isValidResetEmail', () => {
  it('앞뒤 공백은 눈감아 준다', () => {
    expect(isValidResetEmail('  owner@example.com ')).toBe(true)
  })

  it('형식이 아니면 보내지 않는다', () => {
    expect(isValidResetEmail('owner')).toBe(false)
    expect(isValidResetEmail('')).toBe(false)
  })
})

describe('비밀번호 규칙은 A2 와 같은 정본을 쓴다', () => {
  it('재설정도 같은 상수로 검사한다', () => {
    expect(PASSWORD_PATTERN.test('newPassword1!')).toBe(true)
    expect(canSubmitReset('CODE1234', 'newPassword1!', 'newPassword1!')).toBe(
      true,
    )
  })

  it('코드가 비면 제출할 수 없다', () => {
    expect(canSubmitReset('   ', 'newPassword1!', 'newPassword1!')).toBe(false)
  })

  it('확인이 다르면 제출할 수 없다', () => {
    expect(canSubmitReset('CODE1234', 'newPassword1!', 'newPassword2!')).toBe(
      false,
    )
  })

  it('규칙을 어기면 제출할 수 없다', () => {
    expect(canSubmitReset('CODE1234', 'short', 'short')).toBe(false)
  })
})

describe('describeResetPasswordIssue', () => {
  it('아직 아무것도 입력하지 않았으면 나무라지 않는다', () => {
    expect(describeResetPasswordIssue('', '')).toBeNull()
  })

  it('확인 불일치를 짚어 준다', () => {
    expect(describeResetPasswordIssue('newPassword1!', 'newPassword2!')).toBe(
      '새 비밀번호가 서로 달라요.',
    )
  })

  it('둘 다 맞으면 할 말이 없다', () => {
    expect(
      describeResetPasswordIssue('newPassword1!', 'newPassword1!'),
    ).toBeNull()
  })
})
