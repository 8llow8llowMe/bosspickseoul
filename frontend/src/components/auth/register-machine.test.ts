import { describe, it, expect } from 'vitest'
import {
  INITIAL_REGISTER_STATE,
  onCodeSent,
  onVerified,
  onEmailChanged,
  canSubmit,
  PASSWORD_RULES,
  REGISTER_FIELD_MESSAGES,
  registerFieldErrors,
} from './register-machine'
import {
  PASSWORD_RULES as CANONICAL_PASSWORD_RULES,
  PASSWORD_RULE_TEXT,
} from '@/lib/auth/password-rules'
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

describe('register-machine — 이메일을 고치면 진행을 되돌린다(#578)', () => {
  it('코드를 보낸 뒤 이메일을 고치면 발송 단계로 돌아간다', () => {
    const sent = onCodeSent(INITIAL_REGISTER_STATE)

    expect(onEmailChanged(sent, 'other@b.com')).toEqual(INITIAL_REGISTER_STATE)
  })

  it('발송 전에는 그대로 둔다', () => {
    expect(onEmailChanged(INITIAL_REGISTER_STATE, 'a@b')).toBe(
      INITIAL_REGISTER_STATE,
    )
  })
})

describe('register-machine — 비밀번호 체크리스트는 정본을 다시 내보내기만 한다', () => {
  it('정본(`@/lib/auth/password-rules`)과 같은 객체다', () => {
    expect(PASSWORD_RULES).toBe(CANONICAL_PASSWORD_RULES)
    expect(REGISTER_FIELD_MESSAGES.password).toBe(PASSWORD_RULE_TEXT)
  })
})

describe('register-machine — 가입을 막는 칸(#578)', () => {
  it('맞는 입력이면 오류가 없다', () => {
    expect(registerFieldErrors(validForm)).toEqual({})
  })

  it('막힌 칸마다 이유를 화면 순서대로 담는다', () => {
    const errors = registerFieldErrors({
      ...validForm,
      password: 'weak',
      nickname: '   ',
    })

    expect(Object.keys(errors)).toEqual(['password', 'nickname'])
    expect(errors.password).toBe(REGISTER_FIELD_MESSAGES.password)
    expect(errors.nickname).toBe(REGISTER_FIELD_MESSAGES.nickname)
  })

  it('칸 판정은 canSubmit 과 같다(인증·동의가 갖춰졌을 때)', () => {
    const verified = onVerified(INITIAL_REGISTER_STATE, 'a@b.com')
    for (const form of [
      validForm,
      { ...validForm, password: 'weak' },
      { ...validForm, name: '' },
      { ...validForm, nickname: 'a'.repeat(11) },
    ]) {
      expect(Object.keys(registerFieldErrors(form)).length === 0).toBe(
        canSubmit(verified, form, agreed),
      )
    }
  })
})
