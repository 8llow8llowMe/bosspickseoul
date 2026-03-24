'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import AuthShell, {
  FooterLink,
  FooterRow,
  Notice,
} from '@/components/auth/auth-shell'
import { getApiMessage, isApiSuccess } from '@/lib/api/response'
import { socialLoginUser } from '@/lib/api/user'
import { useAuthStore } from '@/stores/auth-store'

type SocialLoadingPageProps = {
  provider: string
}

export default function SocialLoadingPage({
  provider,
}: SocialLoadingPageProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const setSession = useAuthStore(state => state.setSession)
  const code = searchParams.get('code')

  const query = useQuery({
    queryKey: ['socialLoginUser', provider, code],
    queryFn: () => socialLoginUser(provider, code as string),
    enabled: Boolean(provider && code),
    retry: false,
  })

  useEffect(() => {
    if (!query.data) {
      return
    }

    if (isApiSuccess(query.data) && query.data.dataBody?.memberInfo) {
      setSession(query.data.dataBody.memberInfo)
      router.replace('/')
    }
  }, [query.data, router, setSession])

  const renderMessage = () => {
    if (!code) {
      return (
        <Notice $tone="error">
          소셜 로그인 인증 코드가 없습니다. 다시 로그인 페이지에서 시도해주세요.
        </Notice>
      )
    }

    if (query.isPending) {
      return <Notice $tone="info">소셜 로그인 결과를 확인하고 있습니다.</Notice>
    }

    if (query.data && !isApiSuccess(query.data)) {
      return (
        <Notice $tone="error">
          {getApiMessage(
            query.data,
            '이미 가입된 이메일이거나 소셜 로그인 처리에 실패했습니다.',
          )}
        </Notice>
      )
    }

    if (query.isError) {
      return (
        <Notice $tone="error">소셜 로그인 처리 중 문제가 발생했습니다.</Notice>
      )
    }

    return (
      <Notice $tone="success">로그인 완료 후 메인 화면으로 이동합니다.</Notice>
    )
  }

  return (
    <AuthShell
      eyebrow="OAuth"
      title={`${provider.toUpperCase()} 인증을 확인하는 중입니다.`}
      description="브라우저가 리디렉션된 뒤 세션을 동기화하는 단계입니다."
    >
      {renderMessage()}
      <FooterRow>
        <span>문제가 계속되면</span>
        <FooterLink href="/login">로그인 페이지로 돌아가기</FooterLink>
      </FooterRow>
    </AuthShell>
  )
}
