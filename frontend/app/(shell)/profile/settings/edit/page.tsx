import type { Metadata } from 'next'
import ProfileEditPage from '@/components/profile/profile-edit-page'
import { createPageMetadata } from '@/lib/metadata'

export const metadata: Metadata = createPageMetadata({
  title: '회원 정보 수정',
  description: '닉네임과 프로필 이미지를 수정해 계정 정보를 관리합니다.',
  path: '/profile/settings/edit',
  index: false,
})

export default function Page() {
  return <ProfileEditPage />
}
