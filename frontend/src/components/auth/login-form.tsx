'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import styled from 'styled-components'
import AuthShell, {
  AuthForm,
  Field,
  FieldLabel,
  FooterLink,
  FooterRow,
  FieldError,
  Notice,
  PrimaryButton,
  TextInput,
} from '@/components/auth/auth-shell'
import GuestOnly from '@/components/auth/guest-only'
import { EMAIL_PATTERN } from '@/components/auth/register-machine'
import SocialLogin from '@/components/auth/social-login'
import { safeReturnPath } from '@/lib/auth/return-path'
import { useAuthStore } from '@/stores/auth-store'

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

type LoginFormError = {
  field: 'email' | 'password' | 'general'
  message: string
} | null

export default function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [form, setForm] = useState({ email: '', password: '' })
  // 어느 칸을 고쳐야 하는지 아는 실패는 그 칸에 붙인다(DESIGN.md §Error (inline field)).
  // 자격증명 불일치는 이메일·비밀번호 중 어느 쪽인지 서버가 알려주지 않으므로 배너로 둔다.
  const [error, setError] = useState<LoginFormError>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const isSocialError = searchParams.get('error') === 'social'
  /*
   * 재설정 화면이 성공 후 `?reset=1` 로 보낸다. 재설정은 전 기기 세션을 무효화하므로
   * 사용자는 갑자기 로그인 화면에 서게 된다 — 아무 말도 없으면 실패한 것처럼 읽힌다.
   */
  const isPasswordReset = searchParams.get('reset') === '1'
  // 이메일 로그인과 카카오 로그인이 **같은 판정**을 쓴다 (`@/lib/auth/return-path`).
  // 한쪽만 느슨하면 그쪽이 오픈 리다이렉트 구멍이 된다.
  const returnTo = safeReturnPath(searchParams.get('redirect'))

  const handleChange =
    (key: 'email' | 'password') =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setForm(current => ({ ...current, [key]: event.target.value }))
    }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    const email = form.email.trim()
    if (!EMAIL_PATTERN.test(email)) {
      setError({
        field: 'email',
        message: '올바른 이메일 형식을 입력해주세요.',
      })
      return
    }
    if (!form.password) {
      setError({ field: 'password', message: '비밀번호를 입력해주세요.' })
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: form.password }),
      })

      if (res.ok) {
        await useAuthStore.getState().hydrate()
        router.replace(returnTo)
        return
      }

      const data = (await res.json()) as { message?: string }
      setError({
        field: 'general',
        message: data.message ?? '이메일 또는 비밀번호를 다시 확인해주세요.',
      })
    } catch {
      setError({
        field: 'general',
        message: '네트워크 연결을 확인한 뒤 다시 시도해주세요.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <GuestOnly>
      <AuthShell
        eyebrow="로그인"
        title="다시 돌아오신 것을 환영합니다."
        description="로그인 후 분석, 추천, 커뮤니티, 채팅 기능을 이어서 사용할 수 있습니다."
      >
        {/* 브라우저 기본 검증을 끈다. type="email" 이 켜져 있으면 크롬이 자체
            말풍선을 띄우며 제출을 가로채, 아래 EMAIL_PATTERN 검사와 DESIGN.md
            §Error (inline field) 규격의 인라인 에러가 아예 도달하지 못한다.
            type="email" 자체는 모바일 키보드 힌트 때문에 유지한다.
            (community-editor-form 도 같은 이유로 noValidate 다) */}
        <AuthForm noValidate onSubmit={handleSubmit}>
          {isPasswordReset ? (
            <Notice $tone="success">
              비밀번호를 재설정했어요. 새 비밀번호로 로그인해 주세요.
            </Notice>
          ) : null}
          {isSocialError ? (
            <Notice $tone="error">
              소셜 로그인에 실패했습니다. 다시 시도해 주세요.
            </Notice>
          ) : null}
          {error?.field === 'general' ? (
            <Notice $tone="error">{error.message}</Notice>
          ) : null}
          <Field>
            <FieldLabel>이메일</FieldLabel>
            <TextInput
              type="email"
              name="email"
              autoComplete="email"
              placeholder="name@example.com"
              value={form.email}
              onChange={handleChange('email')}
              aria-invalid={error?.field === 'email' || undefined}
              aria-describedby={
                error?.field === 'email' ? 'login-email-error' : undefined
              }
            />
            {error?.field === 'email' ? (
              <FieldError id="login-email-error">{error.message}</FieldError>
            ) : null}
          </Field>
          <Field>
            <FieldLabel>비밀번호</FieldLabel>
            <PasswordFieldWrapper>
              <PasswordInput
                type={showPassword ? 'text' : 'password'}
                name="password"
                autoComplete="current-password"
                placeholder="비밀번호를 입력하세요."
                value={form.password}
                onChange={handleChange('password')}
                aria-invalid={error?.field === 'password' || undefined}
                aria-describedby={
                  error?.field === 'password'
                    ? 'login-password-error'
                    : undefined
                }
              />
              <PasswordToggle
                type="button"
                onClick={() => setShowPassword(current => !current)}
                aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 표시'}
              >
                {showPassword ? '숨기기' : '표시'}
              </PasswordToggle>
            </PasswordFieldWrapper>
            {error?.field === 'password' ? (
              <FieldError id="login-password-error">{error.message}</FieldError>
            ) : null}
          </Field>
          <PrimaryButton type="submit" disabled={isSubmitting}>
            {isSubmitting ? '로그인 중...' : '로그인'}
          </PrimaryButton>
        </AuthForm>

        <SocialLogin returnTo={returnTo} />

        <FooterRow>
          <span>비밀번호를 잊으셨나요?</span>
          <FooterLink href="/password-reset">비밀번호 재설정</FooterLink>
        </FooterRow>

        <FooterRow>
          <span>계정이 아직 없나요?</span>
          <FooterLink href="/register">회원가입</FooterLink>
        </FooterRow>
      </AuthShell>
    </GuestOnly>
  )
}
