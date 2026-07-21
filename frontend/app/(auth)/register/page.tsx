import type { Metadata } from 'next'
import RegisterForm from '@/components/auth/register-form'
import { createPageMetadata } from '@/lib/metadata'

export const metadata: Metadata = createPageMetadata({
  title: '회원가입',
  description: '이메일 기반 회원가입으로 NowDoBoss를 시작합니다.',
  path: '/register',
  index: false,
})

export default function Page() {
  return <RegisterForm />
}
