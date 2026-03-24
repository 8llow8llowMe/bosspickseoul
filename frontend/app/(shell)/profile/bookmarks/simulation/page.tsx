import type { Metadata } from 'next'
import ProfileSimulationBookmarksPage from '@/components/profile/profile-simulation-bookmarks-page'
import { createPageMetadata } from '@/lib/metadata'

export const metadata: Metadata = createPageMetadata({
  title: '시뮬레이션 북마크',
  description: '저장된 창업 시뮬레이션 결과를 확인하는 개인 프로필 영역입니다.',
  path: '/profile/bookmarks/simulation',
  index: false,
})

export default function Page() {
  return <ProfileSimulationBookmarksPage />
}
