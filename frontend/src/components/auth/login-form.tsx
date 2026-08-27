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

export default function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const isSocialError = searchParams.get('error') === 'social'
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
      setError('올바른 이메일 형식을 입력해주세요.')
      return
    }
    if (!form.password) {
      setError('비밀번호를 입력해주세요.')
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
      setError(data.message ?? '이메일 또는 비밀번호를 다시 확인해주세요.')
    } catch {
      setError('네트워크 연결을 확인한 뒤 다시 시도해주세요.')
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
        <AuthForm onSubmit={handleSubmit}>
          {isSocialError ? (
            <Notice $tone="error">
              소셜 로그인에 실패했습니다. 다시 시도해 주세요.
            </Notice>
          ) : null}
          {error ? <Notice $tone="error">{error}</Notice> : null}
          <Field>
            <FieldLabel>이메일</FieldLabel>
            <TextInput
              type="email"
              name="email"
              autoComplete="email"
              placeholder="name@example.com"
              value={form.email}
              onChange={handleChange('email')}
            />
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
              />
              <PasswordToggle
                type="button"
                onClick={() => setShowPassword(current => !current)}
                aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 표시'}
              >
                {showPassword ? '숨기기' : '표시'}
              </PasswordToggle>
            </PasswordFieldWrapper>
          </Field>
          <PrimaryButton type="submit" disabled={isSubmitting}>
            {isSubmitting ? '로그인 중...' : '로그인'}
          </PrimaryButton>
        </AuthForm>

        <SocialLogin returnTo={returnTo} />

        <FooterRow>
          <span>계정이 아직 없나요?</span>
          <FooterLink href="/register">회원가입</FooterLink>
        </FooterRow>
      </AuthShell>
    </GuestOnly>
  )
}
