import type { Metadata } from 'next'
import ProfileAnalysisBookmarksPage from '@/components/profile/profile-analysis-bookmarks-page'
import { createPageMetadata } from '@/lib/metadata'

export const metadata: Metadata = createPageMetadata({
  title: '분석 북마크',
  description: '저장한 상권 분석 결과를 다시 확인하고 비교할 수 있습니다.',
  path: '/profile/bookmarks/analysis',
  index: false,
})

export default function Page() {
  return <ProfileAnalysisBookmarksPage />
}
