import type { Metadata } from 'next'
import ProfileAnalysisBookmarksPage from '@/components/profile/profile-analysis-bookmarks-page'
import { createPageMetadata } from '@/lib/metadata'

export const metadata: Metadata = createPageMetadata({
  title: '분석 북마크',
  description: '저장된 상권 분석 북마크를 확인하는 개인 프로필 영역입니다.',
  path: '/profile/bookmarks/analysis',
  index: false,
})

export default function Page() {
  return <ProfileAnalysisBookmarksPage />
}
