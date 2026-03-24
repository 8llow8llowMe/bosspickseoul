import type { Metadata } from 'next'
import ProfileShell from '@/components/profile/profile-shell'
import RequireAuth from '@/components/auth/require-auth'
import { createPageMetadata } from '@/lib/metadata'

export const metadata: Metadata = createPageMetadata({
  title: '프로필',
  description: 'NowDoBoss 사용자 프로필과 북마크, 설정 영역입니다.',
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
