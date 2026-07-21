'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import AuthShell, {
  AuthForm,
  Field,
  FieldLabel,
  FooterLink,
  FooterRow,
  HelperText,
  Notice,
  PrimaryButton,
  TextInput,
} from '@/components/auth/auth-shell'
import GuestOnly from '@/components/auth/guest-only'
import type { ApiResponse } from '@/types/api'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// 백엔드 비밀번호 제약과 정확히 동일해야 한다(register.md D4-1, D6):
// 공백 없이 영문자+숫자+특수문자 포함 8~20자.
const PASSWORD_PATTERN = new RegExp(
  String.raw`^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*()\-_=+\[\]{};:'",.<>/?\\|])\S{8,20}$`,
)

const NAME_MAX_LENGTH = 10
const NICKNAME_MAX_LENGTH = 10

type RegisterFormState = {
  email: string
  password: string
  name: string
  nickname: string
}

const INITIAL_FORM: RegisterFormState = {
  email: '',
  password: '',
  name: '',
  nickname: '',
}

export default function RegisterForm() {
  const router = useRouter()
  const [form, setForm] = useState<RegisterFormState>(INITIAL_FORM)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange =
    (key: keyof RegisterFormState) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setForm(current => ({ ...current, [key]: event.target.value }))
    }

  const validate = (): string | null => {
    const email = form.email.trim()
    if (!EMAIL_PATTERN.test(email)) {
      return '올바른 이메일 형식을 입력해주세요.'
    }
    if (!PASSWORD_PATTERN.test(form.password)) {
      return '비밀번호는 공백 없이 영문, 숫자, 특수문자를 포함한 8~20자여야 합니다.'
    }
    const name = form.name.trim()
    if (!name || name.length > NAME_MAX_LENGTH) {
      return `이름을 ${NAME_MAX_LENGTH}자 이내로 입력해주세요.`
    }
    const nickname = form.nickname.trim()
    if (!nickname || nickname.length > NICKNAME_MAX_LENGTH) {
      return `닉네임을 ${NICKNAME_MAX_LENGTH}자 이내로 입력해주세요.`
    }
    return null
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/bff/members/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email.trim(),
          password: form.password,
          name: form.name.trim(),
          nickname: form.nickname.trim(),
        }),
      })
      const data = (await res
        .json()
        .catch(() => null)) as ApiResponse<unknown> | null

      if (res.ok && data?.dataHeader?.success) {
        router.replace('/login')
        return
      }

      const message = data?.dataHeader?.resultMessage
      setError(
        typeof message === 'string' && message
          ? message
          : '가입에 실패했습니다. 입력 정보를 확인한 뒤 다시 시도해주세요.',
      )
    } catch {
      setError('네트워크 연결을 확인한 뒤 다시 시도해주세요.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <GuestOnly>
      <AuthShell
        eyebrow="Join"
        title="NowDoBoss 계정을 시작합니다."
        description="이메일과 비밀번호로 가입하고 로그인해 서비스를 이용할 수 있습니다."
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
              autoComplete="new-password"
              placeholder="비밀번호를 입력하세요."
              value={form.password}
              onChange={handleChange('password')}
            />
            <HelperText>
              공백 없이 영문, 숫자, 특수문자를 포함한 8~20자.
            </HelperText>
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
              onChange={handleChange('name')}
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
              onChange={handleChange('nickname')}
            />
          </Field>

          <PrimaryButton type="submit" disabled={isSubmitting}>
            {isSubmitting ? '가입 처리 중...' : '회원가입'}
          </PrimaryButton>
        </AuthForm>

        <FooterRow>
          <span>이미 계정이 있나요?</span>
          <FooterLink href="/login">로그인</FooterLink>
        </FooterRow>
      </AuthShell>
    </GuestOnly>
  )
}
