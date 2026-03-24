import type { Metadata } from 'next'
import RegisterPage from '@/components/auth/register-page'
import { createPageMetadata } from '@/lib/metadata'

export const metadata: Metadata = createPageMetadata({
  title: '회원가입',
  description: '소셜 또는 이메일 기반 회원가입으로 NowDoBoss를 시작합니다.',
  path: '/register',
  index: false,
})

export default function Page() {
  return <RegisterPage />
}
