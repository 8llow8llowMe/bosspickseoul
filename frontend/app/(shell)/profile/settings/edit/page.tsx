import type { Metadata } from 'next'
import ProfileEditPage from '@/components/profile/profile-edit-page'
import { createPageMetadata } from '@/lib/metadata'

export const metadata: Metadata = createPageMetadata({
  title: '회원 정보',
  description: '계정 정보를 확인하고 프로필을 수정합니다.',
  path: '/profile/settings/edit',
  index: false,
})

export default function Page() {
  return <ProfileEditPage />
}
