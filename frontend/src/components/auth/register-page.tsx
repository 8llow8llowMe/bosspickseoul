'use client'

import Image from 'next/image'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import AuthShell, {
  Divider,
  FooterLink,
  FooterRow,
  Notice,
  PrimaryButton,
  SocialButton,
  SocialButtonRow,
} from '@/components/auth/auth-shell'
import GuestOnly from '@/components/auth/guest-only'
import { getApiMessage, isApiSuccess } from '@/lib/api/response'
import { getSocialAuthUrl } from '@/lib/api/user'

const socialProviders = [
  { key: 'google', label: 'Google', icon: '/images/GoogleBtnSmall.png' },
  { key: 'naver', label: 'Naver', icon: '/images/NaverBtnSmall.png' },
  { key: 'kakao', label: 'Kakao', icon: '/images/KakaoBtnSmall.png' },
] as const

export default function RegisterPage() {
  const router = useRouter()
  const [message, setMessage] = useState<string | null>(null)

  const socialMutation = useMutation({
    mutationFn: getSocialAuthUrl,
    onSuccess: response => {
      if (!isApiSuccess(response) || !response.dataBody) {
        setMessage(
          getApiMessage(
            response,
            '소셜 회원가입 연결 주소를 불러오지 못했습니다.',
          ),
        )
        return
      }

      window.location.assign(response.dataBody)
    },
    onError: () => {
      setMessage('소셜 회원가입 창을 다시 열어주세요.')
    },
  })

  return (
    <GuestOnly>
      <AuthShell
        eyebrow="Join"
        title="NowDoBoss 계정을 시작합니다."
        description="소셜 계정 또는 일반 회원가입으로 빠르게 시작할 수 있습니다."
      >
        {message ? <Notice $tone="error">{message}</Notice> : null}

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

        <Divider>또는</Divider>

        <PrimaryButton
          type="button"
          onClick={() => router.push('/register/general')}
        >
          이메일로 회원가입
        </PrimaryButton>

        <FooterRow>
          <span>이미 계정이 있나요?</span>
          <FooterLink href="/login">로그인</FooterLink>
        </FooterRow>
      </AuthShell>
    </GuestOnly>
  )
}
