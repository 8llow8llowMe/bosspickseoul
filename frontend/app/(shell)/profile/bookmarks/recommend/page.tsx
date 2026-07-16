import type { Metadata } from 'next'
import ProfileRecommendBookmarksPage from '@/components/profile/profile-recommend-bookmarks-page'
import { createPageMetadata } from '@/lib/metadata'

export const metadata: Metadata = createPageMetadata({
  title: '추천 북마크',
  description:
    '저장한 추천 지역을 다시 확인하고 다음 분석 대상으로 이어갈 수 있습니다.',
  path: '/profile/bookmarks/recommend',
  index: false,
})

export default function Page() {
  return <ProfileRecommendBookmarksPage />
}
