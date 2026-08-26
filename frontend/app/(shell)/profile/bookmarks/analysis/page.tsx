import type { Metadata } from 'next'
import ProfileAnalysisBookmarksPage from '@/components/profile/profile-analysis-bookmarks-page'
import { createPageMetadata } from '@/lib/metadata'

export const metadata: Metadata = createPageMetadata({
  title: '지역 북마크·화면 보관함',
  description:
    '저장한 자치구·행정동과, 조건까지 포함해 보관한 분석 화면을 확인합니다.',
  path: '/profile/bookmarks/analysis',
  index: false,
})

export default function Page() {
  return <ProfileAnalysisBookmarksPage />
}
