'use client'

import Image from 'next/image'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import AuthShell, {
  AuthForm,
  Divider,
  Field,
  FieldLabel,
  FooterLink,
  FooterRow,
  Notice,
  PrimaryButton,
  SocialButton,
  SocialButtonRow,
  TextInput,
} from '@/components/auth/auth-shell'
import GuestOnly from '@/components/auth/guest-only'
import { getApiMessage, isApiSuccess } from '@/lib/api/response'
import { getSocialAuthUrl, loginUser } from '@/lib/api/user'
import { useAuthStore } from '@/stores/auth-store'

const socialProviders = [
  { key: 'google', label: 'Google', icon: '/images/GoogleBtnSmall.png' },
  { key: 'naver', label: 'Naver', icon: '/images/NaverBtnSmall.png' },
  { key: 'kakao', label: 'Kakao', icon: '/images/KakaoBtnSmall.png' },
] as const

export default function LoginPage() {
  const router = useRouter()
  const setSession = useAuthStore(state => state.setSession)
  const [form, setForm] = useState({
    email: '',
    password: '',
  })
  const [message, setMessage] = useState<{
    tone: 'error' | 'success' | 'info'
    text: string
  } | null>(null)

  const loginMutation = useMutation({
    mutationFn: loginUser,
    onSuccess: response => {
      if (isApiSuccess(response) && response.dataBody?.memberInfo) {
        setSession(response.dataBody.memberInfo)
        router.push('/')
        return
      }

      setMessage({
        tone: 'error',
        text: getApiMessage(
          response,
          '이메일 또는 비밀번호를 다시 확인해주세요.',
        ),
      })
    },
    onError: () => {
      setMessage({
        tone: 'error',
        text: '로그인 요청 중 문제가 발생했습니다.',
      })
    },
  })

  const socialMutation = useMutation({
    mutationFn: getSocialAuthUrl,
    onSuccess: response => {
      if (!isApiSuccess(response) || !response.dataBody) {
        setMessage({
          tone: 'error',
          text: getApiMessage(
            response,
            '소셜 로그인 연결 주소를 불러오지 못했습니다.',
          ),
        })
        return
      }

      window.location.assign(response.dataBody)
    },
    onError: () => {
      setMessage({
        tone: 'error',
        text: '소셜 로그인 연결 중 문제가 발생했습니다.',
      })
    },
  })

  const handleChange =
    (key: 'email' | 'password') =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setForm(current => ({
        ...current,
        [key]: event.target.value,
      }))
    }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setMessage(null)
    loginMutation.mutate(form)
  }

  return (
    <GuestOnly>
      <AuthShell
        eyebrow="Account"
        title="다시 돌아오신 것을 환영합니다."
        description="로그인 후 분석, 추천, 커뮤니티, 채팅 기능을 이어서 사용할 수 있습니다."
      >
        <AuthForm onSubmit={handleSubmit}>
          {message ? (
            <Notice $tone={message.tone}>{message.text}</Notice>
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
          <PrimaryButton type="submit" disabled={loginMutation.isPending}>
            {loginMutation.isPending ? '로그인 중...' : '로그인'}
          </PrimaryButton>
        </AuthForm>

        <Divider>또는</Divider>

        <SocialButtonRow>
          {socialProviders.map(provider => (
            <SocialButton
              key={provider.key}
              type="button"
              onClick={() => socialMutation.mutate(provider.key)}
            >
              <Image
                src={provider.icon}
                alt=""
                aria-hidden="true"
                width={22}
                height={22}
              />
              {provider.label}
            </SocialButton>
          ))}
        </SocialButtonRow>

        <FooterRow>
          <span>계정이 아직 없나요?</span>
          <FooterLink href="/register">회원가입</FooterLink>
        </FooterRow>
      </AuthShell>
    </GuestOnly>
  )
}
