import { describe, it, expect } from 'vitest'
import {
  INITIAL_REGISTER_STATE,
  onCodeSent,
  onVerified,
  onEmailChanged,
  canSubmit,
} from './register-machine'
import {
  EMPTY_SIGNUP_CONSENT,
  SIGNUP_CONSENT_KEYS,
  setAllSignupConsent,
} from '@/lib/auth/signup-consent'

const validForm = {
  email: 'a@b.com',
  password: 'Passw0rd!',
  name: '홍길동',
  nickname: '길동짱',
}

const agreed = setAllSignupConsent(true)

describe('register-machine', () => {
  it('starts at email-entry with no verified email', () => {
    expect(INITIAL_REGISTER_STATE).toEqual({
      step: 'email-entry',
      verifiedEmail: null,
    })
  })

  it('onCodeSent moves to code-sent', () => {
    expect(onCodeSent(INITIAL_REGISTER_STATE).step).toBe('code-sent')
  })

  it('onVerified records the verified email', () => {
    const s = onVerified(onCodeSent(INITIAL_REGISTER_STATE), 'a@b.com')
    expect(s).toEqual({ step: 'verified', verifiedEmail: 'a@b.com' })
  })

  it('onEmailChanged resets when email differs from verified', () => {
    const verified = onVerified(INITIAL_REGISTER_STATE, 'a@b.com')
    expect(onEmailChanged(verified, 'other@b.com')).toEqual(
      INITIAL_REGISTER_STATE,
    )
  })

  it('onEmailChanged keeps state when email unchanged', () => {
    const verified = onVerified(INITIAL_REGISTER_STATE, 'a@b.com')
    expect(onEmailChanged(verified, 'a@b.com')).toEqual(verified)
  })

  it('canSubmit only when verified, email matches, and form valid', () => {
    const verified = onVerified(INITIAL_REGISTER_STATE, 'a@b.com')
    expect(canSubmit(verified, validForm, agreed)).toBe(true)
    expect(canSubmit(INITIAL_REGISTER_STATE, validForm, agreed)).toBe(false)
    expect(
      canSubmit(verified, { ...validForm, email: 'x@y.com' }, agreed),
    ).toBe(false)
    expect(
      canSubmit(verified, { ...validForm, password: 'weak' }, agreed),
    ).toBe(false)
    expect(canSubmit(verified, { ...validForm, name: '' }, agreed)).toBe(false)
  })

  it('TC-CON-002 인증·입력이 모두 맞아도 동의가 하나라도 빠지면 제출할 수 없다', () => {
    const verified = onVerified(INITIAL_REGISTER_STATE, 'a@b.com')

    expect(canSubmit(verified, validForm, EMPTY_SIGNUP_CONSENT)).toBe(false)
    for (const key of SIGNUP_CONSENT_KEYS) {
      expect(canSubmit(verified, validForm, { ...agreed, [key]: false })).toBe(
        false,
      )
    }
  })
})
