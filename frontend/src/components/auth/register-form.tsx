'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import styled from 'styled-components'
import AuthShell, {
  AuthForm,
  Field,
  FieldLabel,
  FooterLink,
  FooterRow,
  HelperText,
  Notice,
  PrimaryButton,
  SecondaryButton,
  TextInput,
} from '@/components/auth/auth-shell'
import GuestOnly from '@/components/auth/guest-only'
import SocialLogin from '@/components/auth/social-login'
import {
  classifyAuthError,
  getAuthErrorMessage,
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
import type { ApiResponse } from '@/types/api'

const RESEND_COOLDOWN_SECONDS = 180

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
  color: var(--color-primary-700);
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

      setError({
        field: classifyAuthError(data?.dataHeader?.resultCode),
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

      setError({
        field: classifyAuthError(data?.dataHeader?.resultCode),
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
    if (!canSubmit(state, form) || isSubmitting) return

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
        }),
      })
      const data = await parseJsonResponse(res)

      if (res.ok && data?.dataHeader?.success) {
        router.replace('/login')
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
        eyebrow="Join"
        title="BossPickSeoul 계정을 시작합니다."
        description="이메일 인증 후 비밀번호와 프로필 정보를 입력하면 가입이 완료됩니다."
      >
        <AuthForm onSubmit={handleSubmit}>
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
            />
            {error?.field === 'email' ? (
              <Notice $tone="error">{error.message}</Notice>
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
              />
              {error?.field === 'code' ? (
                <Notice $tone="error">{error.message}</Notice>
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
                    aria-label={
                      showPassword ? '비밀번호 숨기기' : '비밀번호 표시'
                    }
                  >
                    {showPassword ? '숨기기' : '표시'}
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

              <PrimaryButton
                type="submit"
                disabled={!canSubmit(state, form) || isSubmitting}
              >
                {isSubmitting ? '가입 처리 중...' : '회원가입'}
              </PrimaryButton>
            </>
          ) : null}
        </AuthForm>

        <SocialLogin />

        <FooterRow>
          <span>이미 계정이 있나요?</span>
          <FooterLink href="/login">로그인</FooterLink>
        </FooterRow>
      </AuthShell>
    </GuestOnly>
  )
}
