import type { Metadata } from 'next'
import ProfileWithdrawPage from '@/components/profile/profile-withdraw-page'
import { createPageMetadata } from '@/lib/metadata'

export const metadata: Metadata = createPageMetadata({
  title: '회원 탈퇴',
  description:
    'NowDoBoss 계정 삭제와 세션 정리를 수행하는 개인 정보 설정 화면입니다.',
  path: '/profile/settings/withdraw',
  index: false,
})

export default function Page() {
  return <ProfileWithdrawPage />
}
