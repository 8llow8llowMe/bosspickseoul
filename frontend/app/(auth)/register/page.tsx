import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { Suspense } from 'react'
import RegisterForm from '@/components/auth/register-form'
import { SESSION_COOKIE } from '@/lib/auth/session-constants'
import { createPageMetadata } from '@/lib/metadata'

export const metadata: Metadata = createPageMetadata({
  title: '회원가입',
  description: '이메일 인증 후 BossPickSeoul을 시작합니다.',
  path: '/register',
  index: false,
})

export default async function Page() {
  // 로그인 화면과 같다 — 세션 쿠키가 없으면 세션 확인을 기다리지 않는다(#579).
  const assumeGuest = !(await cookies()).has(SESSION_COOKIE)

  return (
    // 가입 폼이 `?redirect=` 를 읽는다(`useSearchParams`, #576).
    <Suspense fallback={null}>
      <RegisterForm assumeGuest={assumeGuest} />
    </Suspense>
  )
}
