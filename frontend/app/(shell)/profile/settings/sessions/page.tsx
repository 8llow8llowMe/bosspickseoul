import type { Metadata } from 'next'
import ProfileSessionsPage from '@/components/profile/profile-sessions-page'
import { createPageMetadata } from '@/lib/metadata'

export const metadata: Metadata = createPageMetadata({
  title: '로그인 기기',
  description: '이 계정으로 로그인한 기기를 확인하고 해제합니다.',
  path: '/profile/settings/sessions',
  index: false,
})

export default function Page() {
  return <ProfileSessionsPage />
}
