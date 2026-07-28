import type { Metadata } from 'next'
import ProfileChangePasswordPage from '@/components/profile/profile-change-password-page'
import { createPageMetadata } from '@/lib/metadata'

export const metadata: Metadata = createPageMetadata({
  title: '비밀번호 변경',
  description: '비밀번호 변경 V2 API 준비 상태를 안내합니다.',
  path: '/profile/settings/change-password',
  index: false,
})

export default function Page() {
  return <ProfileChangePasswordPage />
}
