'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'
import styled from 'styled-components'
import AuthShell, {
  AuthForm,
  Field,
  FieldLabel,
  FooterLink,
  FooterRow,
  HelperText,
  FieldError,
  Notice,
  PrimaryButton,
  SecondaryButton,
  TextInput,
} from '@/components/auth/auth-shell'
import GuestOnly from '@/components/auth/guest-only'
import SignupConsentFieldset, {
  useSignupConsentFocus,
} from '@/components/auth/signup-consent-fieldset'
import SocialLogin from '@/components/auth/social-login'
import {
  EMAIL_CODE_COOLDOWN,
  classifyAuthError,
  getAuthErrorMessage,
  isEmailCodeInvalidated,
  type AuthErrorField,
} from '@/lib/api/auth-errors'
import {
  EMAIL_PATTERN,
  INITIAL_REGISTER_STATE,
  NAME_MAX_LENGTH,
  NICKNAME_MAX_LENGTH,
  PASSWORD_PATTERN,
  canSubmit,
  onCodeSent,
  onEmailChanged,
  onVerified,
  type RegisterForm as RegisterFormValues,
} from '@/components/auth/register-machine'
import { RESEND_COOLDOWN_SECONDS } from '@/lib/auth/verification-cooldown'
import {
  EMPTY_SIGNUP_CONSENT,
  SOCIAL_SIGNUP_CONSENT_REQUIRED_MESSAGE,
  isSignupConsentComplete,
  signupConsentErrorKeys,
  type SignupConsent,
  type SignupConsentKey,
} from '@/lib/auth/signup-consent'
import { normalizeApiResponseFailure } from '@/lib/api/api-error'
import type { ApiResponse } from '@/types/api'
import { touchHitArea } from '@/styles/touch-target'

const INITIAL_FORM: RegisterFormValues = {
  email: '',
  password: '',
  name: '',
  nickname: '',
}

type FormError = {
  field: AuthErrorField
  message: string
} | null

const PasswordFieldWrapper = styled.div`
  position: relative;
`

const PasswordInput = styled(TextInput)`
  padding-right: 64px;
`

const PasswordToggle = styled.button`
  position: absolute;
  top: 50%;
  right: 14px;
  transform: translateY(-50%);
  border: none;
  background: none;
  color: var(--color-text-500);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;

  svg {
    width: 20px;
    height: 20px;
  }
  /* 보이는 아이콘은 그대로, 모바일 히트 영역만 44px. 이미 absolute 라 position 은 건드리지 않는다. */
  ${touchHitArea({ keepPosition: true })}
`

const ResendRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
`

const ResendButton = styled.button`
  border: none;
  background: none;
  padding: 0;
  color: var(--color-text-primary-on-light);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;

  &:disabled {
    color: var(--color-text-500);
    cursor: not-allowed;
  }
`

const parseJsonResponse = async (
  res: Response,
): Promise<ApiResponse<unknown> | null> =>
  (await res.json().catch(() => null)) as ApiResponse<unknown> | null

const NETWORK_ERROR_MESSAGE = '네트워크 연결을 확인한 뒤 다시 시도해주세요.'

const CONSENT_ID_PREFIX = 'register-consent'

export default function RegisterForm() {
  const router = useRouter()
  const [state, setState] = useState(INITIAL_REGISTER_STATE)
  const [form, setForm] = useState<RegisterFormValues>(INITIAL_FORM)
  const [code, setCode] = useState('')
  const [error, setError] = useState<FormError>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [isSendingCode, setIsSendingCode] = useState(false)
  const [isVerifyingCode, setIsVerifyingCode] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  // 이메일 가입과 아래 카카오 가입이 같은 동의를 쓴다(#495).
  const [consent, setConsent] = useState<SignupConsent>(EMPTY_SIGNUP_CONSENT)
  const [consentInvalid, setConsentInvalid] = useState<SignupConsentKey[]>([])
  const [socialConsentNotice, setSocialConsentNotice] = useState(false)

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setInterval(() => {
      setCooldown(current => (current <= 1 ? 0 : current - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [cooldown])

  const handleEmailChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const next = event.target.value
    setForm(current => ({ ...current, email: next }))
    setState(current => onEmailChanged(current, next))
  }

  const handleFieldChange =
    (key: 'password' | 'name' | 'nickname') =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setForm(current => ({ ...current, [key]: event.target.value }))
    }

  const handleConsentChange = (next: SignupConsent) => {
    setConsent(next)
    // 켠 항목의 강조는 바로 걷는다. 아직 꺼진 항목은 남긴다.
    setConsentInvalid(current => current.filter(key => !next[key]))
    if (isSignupConsentComplete(next)) setSocialConsentNotice(false)
  }

  const focusConsent = useSignupConsentFocus(CONSENT_ID_PREFIX)

  /** 강조하고, 강조가 그려진 뒤 첫 항목으로 포커스를 옮긴다. */
  const markConsentInvalid = (keys: SignupConsentKey[]) => {
    setConsentInvalid(keys)
    focusConsent(keys[0])
  }

  const handleSocialConsentIncomplete = (missing: SignupConsentKey[]) => {
    setSocialConsentNotice(true)
    markConsentInvalid(missing)
  }

  const handleSendCode = async () => {
    const email = form.email.trim()
    if (!EMAIL_PATTERN.test(email)) {
      setError({
        field: 'email',
        message: '올바른 이메일 형식을 입력해주세요.',
      })
      return
    }

    setError(null)
    setIsSendingCode(true)
    try {
      const res = await fetch('/api/bff/auth/email/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await parseJsonResponse(res)

      if (res.ok && data?.dataHeader?.success) {
        // 전송에 사용한 값으로 정규화해 이후 verifiedEmail 비교가 어긋나지 않도록 한다.
        setForm(current => ({ ...current, email }))
        setState(onCodeSent)
        setCooldown(RESEND_COOLDOWN_SECONDS)
        return
      }

      const resultCode = data?.dataHeader?.resultCode
      // 서버가 아직 쿨다운이라고 답했다면 화면 카운트다운이 실제와 어긋난 것이다
      // (다른 탭에서 보냈거나, 무효화 처리로 우리가 쿨다운을 열어 준 뒤일 수 있다).
      // 남은 시간을 알 수 없으므로 한 주기를 통째로 다시 잠근다 — 과대추정이 안전하다.
      if (resultCode === EMAIL_CODE_COOLDOWN) {
        setCooldown(RESEND_COOLDOWN_SECONDS)
      }
      setError({
        field: classifyAuthError(resultCode),
        message: getAuthErrorMessage(data, '인증코드 발송에 실패했습니다.'),
      })
    } catch {
      setError({ field: 'general', message: NETWORK_ERROR_MESSAGE })
    } finally {
      setIsSendingCode(false)
    }
  }

  const handleVerifyCode = async () => {
    const email = form.email.trim()
    const trimmedCode = code.trim()
    if (!trimmedCode) {
      setError({ field: 'code', message: '인증코드를 입력해주세요.' })
      return
    }

    setError(null)
    setIsVerifyingCode(true)
    try {
      const res = await fetch('/api/bff/auth/email/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: trimmedCode }),
      })
      const data = await parseJsonResponse(res)

      if (res.ok && data?.dataHeader?.success) {
        // form.email과 동일한 값을 verifiedEmail로 저장해 canSubmit의 동등 비교가 성립하게 한다.
        setForm(current => ({ ...current, email }))
        setState(current => onVerified(current, email))
        return
      }

      const resultCode = data?.dataHeader?.resultCode
      // 코드가 무효화됐으면(만료 AUTH_005 / 시도초과 AUTH_018) 백엔드에 코드가 남아 있지 않다.
      // 죽은 값을 입력란에 남겨 두고 재전송까지 잠가 두면 안내만 하고 길은 막는 꼴이 된다.
      if (isEmailCodeInvalidated(resultCode)) {
        setCode('')
        setCooldown(0)
      }
      setError({
        field: classifyAuthError(resultCode),
        message: getAuthErrorMessage(data, '인증코드 확인에 실패했습니다.'),
      })
    } catch {
      setError({ field: 'general', message: NETWORK_ERROR_MESSAGE })
    } finally {
      setIsVerifyingCode(false)
    }
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canSubmit(state, form, consent) || isSubmitting) return

    setError(null)
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/bff/members/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          name: form.name.trim(),
          nickname: form.nickname.trim(),
          // 세 값을 각각 보낸다. 문서 판(version)은 서버가 정하므로 보내지 않는다(계약 §0).
          termsAgreed: consent.termsAgreed,
          privacyAgreed: consent.privacyAgreed,
          ageOver14Confirmed: consent.ageOver14Confirmed,
        }),
      })
      const data = await parseJsonResponse(res)

      if (res.ok && data?.dataHeader?.success) {
        router.replace('/login')
        return
      }

      // 동의로 거절되면 그 체크박스를 강조한다. 이메일 인증은 소비되지 않았으므로
      // (계약 §0-1) 인증 상태는 건드리지 않는다 — 체크하고 다시 제출하면 된다.
      const consentKeys = signupConsentErrorKeys(
        data?.dataHeader?.resultCode,
        consent,
        normalizeApiResponseFailure(data, res.status)?.fieldErrors ?? [],
      )
      if (consentKeys.length > 0) {
        markConsentInvalid(consentKeys)
        return
      }

      setError({
        field: classifyAuthError(data?.dataHeader?.resultCode),
        message: getAuthErrorMessage(data, '가입에 실패했습니다.'),
      })
    } catch {
      setError({ field: 'general', message: NETWORK_ERROR_MESSAGE })
    } finally {
      setIsSubmitting(false)
    }
  }

  const isVerified = state.step === 'verified'
  const passwordHelperText =
    form.password.length > 0 && !PASSWORD_PATTERN.test(form.password)
      ? '공백 없이 영문, 숫자, 특수문자를 포함한 8~20자로 입력해주세요.'
      : '공백 없이 영문, 숫자, 특수문자를 포함한 8~20자.'

  return (
    <GuestOnly>
      <AuthShell
        eyebrow="회원가입"
        title="BossPickSeoul 계정을 시작합니다."
        description="이메일 인증 후 비밀번호와 프로필 정보를 입력하면 가입이 완료됩니다."
      >
        {/* 브라우저 기본 검증을 끈다. type="email" 이 켜져 있으면 크롬이 자체
            말풍선을 띄우며 제출을 가로채, 아래 EMAIL_PATTERN 검사와 DESIGN.md
            §Error (inline field) 규격의 인라인 에러가 아예 도달하지 못한다.
            type="email" 자체는 모바일 키보드 힌트 때문에 유지한다.
            (community-editor-form 도 같은 이유로 noValidate 다) */}
        <AuthForm noValidate onSubmit={handleSubmit}>
          {error?.field === 'general' ? (
            <Notice $tone="error">{error.message}</Notice>
          ) : null}

          {isVerified ? (
            <Notice $tone="success">이메일 인증 완료</Notice>
          ) : null}

          <Field>
            <FieldLabel>이메일</FieldLabel>
            <TextInput
              type="email"
              name="email"
              autoComplete="email"
              placeholder="name@example.com"
              value={form.email}
              onChange={handleEmailChange}
              readOnly={isVerified}
              aria-invalid={error?.field === 'email' || undefined}
              aria-describedby={
                error?.field === 'email' ? 'register-email-error' : undefined
              }
            />
            {error?.field === 'email' ? (
              <FieldError id="register-email-error">{error.message}</FieldError>
            ) : null}
          </Field>

          {state.step === 'email-entry' ? (
            <SecondaryButton
              type="button"
              onClick={handleSendCode}
              disabled={isSendingCode || !EMAIL_PATTERN.test(form.email.trim())}
            >
              {isSendingCode ? '발송 중...' : '인증코드 발송'}
            </SecondaryButton>
          ) : null}

          {state.step === 'code-sent' || isVerified ? (
            <Field>
              <FieldLabel>인증코드</FieldLabel>
              <TextInput
                type="text"
                name="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="인증코드를 입력하세요."
                value={code}
                onChange={event => setCode(event.target.value)}
                readOnly={isVerified}
                aria-invalid={error?.field === 'code' || undefined}
                aria-describedby={
                  error?.field === 'code' ? 'register-code-error' : undefined
                }
              />
              {error?.field === 'code' ? (
                <FieldError id="register-code-error">
                  {error.message}
                </FieldError>
              ) : null}
              {state.step === 'code-sent' ? (
                <ResendRow>
                  <HelperText>
                    인증코드가 오지 않았다면 재전송해주세요.
                  </HelperText>
                  <ResendButton
                    type="button"
                    onClick={handleSendCode}
                    disabled={cooldown > 0 || isSendingCode}
                  >
                    {cooldown > 0
                      ? `재전송 (${cooldown}초)`
                      : '인증코드 재전송'}
                  </ResendButton>
                </ResendRow>
              ) : null}
            </Field>
          ) : null}

          {state.step === 'code-sent' ? (
            <SecondaryButton
              type="button"
              onClick={handleVerifyCode}
              disabled={isVerifyingCode || !code.trim()}
            >
              {isVerifyingCode ? '확인 중...' : '인증 확인'}
            </SecondaryButton>
          ) : null}

          {isVerified ? (
            <>
              <Field>
                <FieldLabel>비밀번호</FieldLabel>
                <PasswordFieldWrapper>
                  <PasswordInput
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    autoComplete="new-password"
                    placeholder="비밀번호를 입력하세요."
                    value={form.password}
                    onChange={handleFieldChange('password')}
                  />
                  <PasswordToggle
                    type="button"
                    onClick={() => setShowPassword(current => !current)}
                    aria-label="비밀번호 표시"
                    aria-pressed={showPassword}
                  >
                    {showPassword ? (
                      <EyeOff aria-hidden />
                    ) : (
                      <Eye aria-hidden />
                    )}
                  </PasswordToggle>
                </PasswordFieldWrapper>
                <HelperText>{passwordHelperText}</HelperText>
              </Field>

              <Field>
                <FieldLabel>이름</FieldLabel>
                <TextInput
                  type="text"
                  name="name"
                  autoComplete="name"
                  maxLength={NAME_MAX_LENGTH}
                  placeholder="실명을 입력하세요."
                  value={form.name}
                  onChange={handleFieldChange('name')}
                />
              </Field>

              <Field>
                <FieldLabel>닉네임</FieldLabel>
                <TextInput
                  type="text"
                  name="nickname"
                  autoComplete="nickname"
                  maxLength={NICKNAME_MAX_LENGTH}
                  placeholder="서비스에서 사용할 닉네임"
                  value={form.nickname}
                  onChange={handleFieldChange('nickname')}
                />
              </Field>
            </>
          ) : null}

          {/* 단계와 무관하게 늘 보인다 — 아래 카카오 가입도 이 동의를 쓴다(#495). */}
          <SignupConsentFieldset
            value={consent}
            onChange={handleConsentChange}
            invalid={consentInvalid}
            idPrefix={CONSENT_ID_PREFIX}
          />

          {socialConsentNotice ? (
            <Notice $tone="error">
              {SOCIAL_SIGNUP_CONSENT_REQUIRED_MESSAGE}
            </Notice>
          ) : null}

          {isVerified ? (
            <PrimaryButton
              type="submit"
              disabled={!canSubmit(state, form, consent) || isSubmitting}
            >
              {isSubmitting ? '가입 처리 중...' : '회원가입'}
            </PrimaryButton>
          ) : null}
        </AuthForm>

        <SocialLogin
          consent={consent}
          onConsentIncomplete={handleSocialConsentIncomplete}
        />

        <FooterRow>
          <span>이미 계정이 있나요?</span>
          <FooterLink href="/login">로그인</FooterLink>
        </FooterRow>
      </AuthShell>
    </GuestOnly>
  )
}
