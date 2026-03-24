import type { Metadata } from 'next'
import ProfileRecommendBookmarksPage from '@/components/profile/profile-recommend-bookmarks-page'
import { createPageMetadata } from '@/lib/metadata'

export const metadata: Metadata = createPageMetadata({
  title: '추천 북마크',
  description:
    '상권추천 북마크 영역입니다. 실제 저장 연동은 다음 이관 단계에서 보강됩니다.',
  path: '/profile/bookmarks/recommend',
  index: false,
})

export default function Page() {
  return <ProfileRecommendBookmarksPage />
}
