import type { Metadata } from 'next'
import ProfileShell from '@/components/profile/profile-shell'
import RequireAuth from '@/components/auth/require-auth'
import { createPageMetadata } from '@/lib/metadata'

export const metadata: Metadata = createPageMetadata({
  title: '프로필',
  description: '북마크한 분석 결과와 추천 지역, 계정 설정을 관리합니다.',
  path: '/profile/bookmarks/analysis',
  index: false,
})

type ProfileLayoutProps = {
  children: React.ReactNode
}

export default function ProfileLayout({ children }: ProfileLayoutProps) {
  return (
    <RequireAuth>
      <ProfileShell>{children}</ProfileShell>
    </RequireAuth>
  )
}
