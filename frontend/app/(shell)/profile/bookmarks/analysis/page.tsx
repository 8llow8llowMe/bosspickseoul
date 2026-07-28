import type { Metadata } from 'next'
import ProfileAnalysisBookmarksPage from '@/components/profile/profile-analysis-bookmarks-page'
import { createPageMetadata } from '@/lib/metadata'

export const metadata: Metadata = createPageMetadata({
  title: '지역 북마크',
  description: '저장한 자치구와 행정동을 확인합니다.',
  path: '/profile/bookmarks/analysis',
  index: false,
})

export default function Page() {
  return <ProfileAnalysisBookmarksPage />
}
