import type { Metadata } from 'next'
import ProfileWithdrawPage from '@/components/profile/profile-withdraw-page'
import { createPageMetadata } from '@/lib/metadata'

export const metadata: Metadata = createPageMetadata({
  title: '회원 탈퇴',
  description: '회원 탈퇴 V2 API와 데이터 삭제 정책 준비 상태를 안내합니다.',
  path: '/profile/settings/withdraw',
  index: false,
})

export default function Page() {
  return <ProfileWithdrawPage />
}
