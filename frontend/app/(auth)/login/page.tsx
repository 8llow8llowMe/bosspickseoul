import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { Suspense } from 'react'
import LoginForm from '@/components/auth/login-form'
import { SESSION_COOKIE } from '@/lib/auth/session-constants'
import { createPageMetadata } from '@/lib/metadata'

export const metadata: Metadata = createPageMetadata({
  title: '로그인',
  description:
    'BossPickSeoul 계정으로 로그인해 북마크와 개인화된 기능을 이어서 사용합니다.',
  path: '/login',
  index: false,
})

export default async function Page() {
  // 세션 쿠키가 없으면 로그인 상태일 수 없다. 세션 확인(`/api/auth/me`)을 기다리지 않고
  // 폼을 바로 그린다(#579). 쿠키 값은 읽지 않고 있는지만 본다.
  const assumeGuest = !(await cookies()).has(SESSION_COOKIE)

  return (
    <Suspense fallback={null}>
      <LoginForm assumeGuest={assumeGuest} />
    </Suspense>
  )
}
