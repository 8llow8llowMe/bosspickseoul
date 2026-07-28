import type { Metadata } from 'next'
import ProfileSimulationBookmarksPage from '@/components/profile/profile-simulation-bookmarks-page'
import { createPageMetadata } from '@/lib/metadata'

export const metadata: Metadata = createPageMetadata({
  title: '시뮬레이션 북마크',
  description: '창업 시뮬레이션 저장 목록의 V2 API 준비 상태를 안내합니다.',
  path: '/profile/bookmarks/simulation',
  index: false,
})

export default function Page() {
  return <ProfileSimulationBookmarksPage />
}
