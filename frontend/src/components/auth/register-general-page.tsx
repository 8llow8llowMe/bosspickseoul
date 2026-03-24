'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import AuthShell, {
  AuthForm,
  Field,
  FieldLabel,
  FooterLink,
  FooterRow,
  HelperText,
  InlineField,
  Notice,
  PrimaryButton,
  SecondaryButton,
  TextInput,
} from '@/components/auth/auth-shell'
import GuestOnly from '@/components/auth/guest-only'
import { getApiMessage, isApiSuccess } from '@/lib/api/response'
import {
  registerUser,
  sendEmailVerificationCode,
  verifyEmailVerificationCode,
} from '@/lib/api/user'

const passwordRule = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,16}$/

export default function RegisterGeneralPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    name: '',
    nickname: '',
    email: '',
    emailCode: '',
    password: '',
    confirmPassword: '',
  })
  const [emailSent, setEmailSent] = useState(false)
  const [emailVerified, setEmailVerified] = useState(false)
  const [message, setMessage] = useState<{
    tone: 'error' | 'success' | 'info'
    text: string
  } | null>(null)

  const sendCodeMutation = useMutation({
    mutationFn: sendEmailVerificationCode,
    onSuccess: response => {
      if (!isApiSuccess(response)) {
        setMessage({
          tone: 'error',
          text: getApiMessage(response, '이메일 인증 코드를 보낼 수 없습니다.'),
        })
        return
      }

      setEmailSent(true)
      setEmailVerified(false)
      setMessage({
        tone: 'success',
        text: '인증 코드를 이메일로 전송했습니다.',
      })
    },
    onError: () => {
      setMessage({
        tone: 'error',
        text: '올바른 이메일 형식을 입력한 뒤 다시 시도해주세요.',
      })
    },
  })

  const verifyCodeMutation = useMutation({
    mutationFn: verifyEmailVerificationCode,
    onSuccess: response => {
      if (!isApiSuccess(response)) {
        setMessage({
          tone: 'error',
          text: getApiMessage(response, '인증 코드를 다시 확인해주세요.'),
        })
        return
      }

      setEmailVerified(true)
      setMessage({
        tone: 'success',
        text: '이메일 인증이 완료되었습니다.',
      })
    },
    onError: () => {
      setMessage({
        tone: 'error',
        text: '인증 코드 확인 중 문제가 발생했습니다.',
      })
    },
  })

  const registerMutation = useMutation({
    mutationFn: registerUser,
    onSuccess: response => {
      if (!isApiSuccess(response)) {
        setMessage({
          tone: 'error',
          text: getApiMessage(response, '회원가입을 완료하지 못했습니다.'),
        })
        return
      }

      router.push('/login')
    },
    onError: () => {
      setMessage({
        tone: 'error',
        text: '회원가입 요청 중 문제가 발생했습니다.',
      })
    },
  })

  const handleChange =
    (key: keyof typeof form) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setForm(current => ({
        ...current,
        [key]: event.target.value,
      }))
    }

  const handleSendEmailCode = () => {
    setMessage(null)
    sendCodeMutation.mutate(form.email)
  }

  const handleVerifyEmailCode = () => {
    setMessage(null)
    verifyCodeMutation.mutate({
      memberEmail: form.email,
      emailCode: form.emailCode,
    })
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setMessage(null)

    if (!emailSent || !emailVerified) {
      setMessage({
        tone: 'error',
        text: '이메일 인증을 완료한 뒤 회원가입을 진행해주세요.',
      })
      return
    }

    if (!passwordRule.test(form.password)) {
      setMessage({
        tone: 'error',
        text: '비밀번호는 영문, 숫자, 특수문자를 포함한 8~16자여야 합니다.',
      })
      return
    }

    if (form.password !== form.confirmPassword) {
      setMessage({
        tone: 'error',
        text: '비밀번호 확인 값이 일치하지 않습니다.',
      })
      return
    }

    registerMutation.mutate({
      name: form.name,
      nickname: form.nickname,
      email: form.email,
      password: form.password,
      profileImage: null,
    })
  }

  return (
    <GuestOnly>
      <AuthShell
        eyebrow="Register"
        title="이메일 기반 회원가입"
        description="레거시 서비스와 동일하게 이메일 인증을 선행하고, 이후 닉네임과 비밀번호를 등록합니다."
      >
        <AuthForm onSubmit={handleSubmit}>
          {message ? (
            <Notice $tone={message.tone}>{message.text}</Notice>
          ) : null}

          <Field>
            <FieldLabel>이름</FieldLabel>
            <TextInput
              type="text"
              placeholder="실명을 입력하세요."
              value={form.name}
              onChange={handleChange('name')}
            />
          </Field>

          <Field>
            <FieldLabel>닉네임</FieldLabel>
            <TextInput
              type="text"
              placeholder="서비스에서 사용할 닉네임"
              value={form.nickname}
              onChange={handleChange('nickname')}
            />
          </Field>

          <Field>
            <FieldLabel>이메일</FieldLabel>
            <InlineField>
              <TextInput
                type="email"
                placeholder="name@example.com"
                value={form.email}
                onChange={handleChange('email')}
              />
              <SecondaryButton
                type="button"
                onClick={handleSendEmailCode}
                disabled={sendCodeMutation.isPending || !form.email}
              >
                {sendCodeMutation.isPending
                  ? '전송 중...'
                  : emailSent
                    ? '재전송'
                    : '인증 코드 전송'}
              </SecondaryButton>
            </InlineField>
          </Field>

          {emailSent ? (
            <Field>
              <FieldLabel>인증 코드</FieldLabel>
              <InlineField>
                <TextInput
                  type="text"
                  placeholder="이메일로 받은 코드를 입력하세요."
                  value={form.emailCode}
                  onChange={handleChange('emailCode')}
                />
                <SecondaryButton
                  type="button"
                  onClick={handleVerifyEmailCode}
                  disabled={verifyCodeMutation.isPending || !form.emailCode}
                >
                  {verifyCodeMutation.isPending
                    ? '확인 중...'
                    : emailVerified
                      ? '인증 완료'
                      : '코드 확인'}
                </SecondaryButton>
              </InlineField>
            </Field>
          ) : null}

          <Field>
            <FieldLabel>비밀번호</FieldLabel>
            <TextInput
              type="password"
              autoComplete="new-password"
              placeholder="비밀번호"
              value={form.password}
              onChange={handleChange('password')}
            />
            <HelperText>
              영문, 숫자, 특수문자를 포함한 8~16자를 권장합니다.
            </HelperText>
          </Field>

          <Field>
            <FieldLabel>비밀번호 확인</FieldLabel>
            <TextInput
              type="password"
              autoComplete="new-password"
              placeholder="비밀번호 확인"
              value={form.confirmPassword}
              onChange={handleChange('confirmPassword')}
            />
          </Field>

          <PrimaryButton type="submit" disabled={registerMutation.isPending}>
            {registerMutation.isPending ? '가입 처리 중...' : '회원가입 완료'}
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
