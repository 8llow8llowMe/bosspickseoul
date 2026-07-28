import type { Metadata } from 'next'
import ProfileEditPage from '@/components/profile/profile-edit-page'
import { createPageMetadata } from '@/lib/metadata'

export const metadata: Metadata = createPageMetadata({
  title: '회원 정보',
  description: '현재 계정 정보와 프로필 수정 API 준비 상태를 확인합니다.',
  path: '/profile/settings/edit',
  index: false,
})

export default function Page() {
  return <ProfileEditPage />
}
