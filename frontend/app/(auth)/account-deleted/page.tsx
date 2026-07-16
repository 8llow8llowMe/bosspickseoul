import type { Metadata } from 'next'
import AccountDeletedPage from '@/components/auth/account-deleted-page'
import { createPageMetadata } from '@/lib/metadata'

export const metadata: Metadata = createPageMetadata({
  title: '회원 탈퇴 완료',
  description: 'NowDoBoss 계정 탈퇴가 완료된 뒤 표시되는 안내 화면입니다.',
  path: '/account-deleted',
  index: false,
})

export default function Page() {
  return <AccountDeletedPage />
}
