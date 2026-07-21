'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
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
import { useAuthStore } from '@/stores/auth-store'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// 오픈 리다이렉트 방지: 내부 경로(/로 시작, //로 시작하지 않음)만 허용한다.
const safeRedirect = (value: string | null) =>
  value && value.startsWith('/') && !value.startsWith('//') ? value : '/'

export default function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

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
        router.replace(safeRedirect(searchParams.get('redirect')))
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
        eyebrow="Account"
        title="다시 돌아오신 것을 환영합니다."
        description="로그인 후 분석, 추천, 커뮤니티, 채팅 기능을 이어서 사용할 수 있습니다."
      >
        <AuthForm onSubmit={handleSubmit}>
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
            <TextInput
              type="password"
              name="password"
              autoComplete="current-password"
              placeholder="비밀번호를 입력하세요."
              value={form.password}
              onChange={handleChange('password')}
            />
          </Field>
          <PrimaryButton type="submit" disabled={isSubmitting}>
            {isSubmitting ? '로그인 중...' : '로그인'}
          </PrimaryButton>
        </AuthForm>

        <FooterRow>
          <span>계정이 아직 없나요?</span>
          <FooterLink href="/register">회원가입</FooterLink>
        </FooterRow>
      </AuthShell>
    </GuestOnly>
  )
}
