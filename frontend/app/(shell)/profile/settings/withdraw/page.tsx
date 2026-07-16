import type { Metadata } from 'next'
import ProfileWithdrawPage from '@/components/profile/profile-withdraw-page'
import { createPageMetadata } from '@/lib/metadata'

export const metadata: Metadata = createPageMetadata({
  title: '회원 탈퇴',
  description: '계정 이용을 종료하고 회원 탈퇴를 진행합니다.',
  path: '/profile/settings/withdraw',
  index: false,
})

export default function Page() {
  return <ProfileWithdrawPage />
}
