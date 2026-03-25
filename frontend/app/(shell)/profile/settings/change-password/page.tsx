import type { Metadata } from 'next'
import ProfileChangePasswordPage from '@/components/profile/profile-change-password-page'
import { createPageMetadata } from '@/lib/metadata'

export const metadata: Metadata = createPageMetadata({
  title: '비밀번호 변경',
  description: '이메일 계정의 비밀번호를 변경해 로그인 정보를 관리합니다.',
  path: '/profile/settings/change-password',
  index: false,
})

export default function Page() {
  return <ProfileChangePasswordPage />
}
