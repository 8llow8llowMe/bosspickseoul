import type { Metadata } from 'next'
import LoginPage from '@/components/auth/login-page'
import { createPageMetadata } from '@/lib/metadata'

export const metadata: Metadata = createPageMetadata({
  title: '로그인',
  description:
    'NowDoBoss 계정으로 로그인해 북마크와 개인화된 기능을 이어서 사용합니다.',
  path: '/login',
  index: false,
})

export default function Page() {
  return <LoginPage />
}
