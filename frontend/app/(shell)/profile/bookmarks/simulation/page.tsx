import type { Metadata } from 'next'
import ProfileSimulationBookmarksPage from '@/components/profile/profile-simulation-bookmarks-page'
import { createPageMetadata } from '@/lib/metadata'

export const metadata: Metadata = createPageMetadata({
  title: '시뮬레이션 북마크',
  description:
    '저장한 창업 시뮬레이션 결과를 다시 확인하고 비교할 수 있습니다.',
  path: '/profile/bookmarks/simulation',
  index: false,
})

export default function Page() {
  return <ProfileSimulationBookmarksPage />
}
