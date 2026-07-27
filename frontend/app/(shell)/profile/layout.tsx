import type { Metadata } from 'next'
import ProfileShell from '@/components/profile/profile-shell'
import RequireAuth from '@/components/auth/require-auth'
import { createPageMetadata } from '@/lib/metadata'

export const metadata: Metadata = createPageMetadata({
  title: '프로필',
  description: '저장한 지역·상권과 현재 계정 정보를 확인합니다.',
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
