import type { Metadata } from 'next'
import ProfileRecommendBookmarksPage from '@/components/profile/profile-recommend-bookmarks-page'
import { createPageMetadata } from '@/lib/metadata'

export const metadata: Metadata = createPageMetadata({
  title: '상권 북마크',
  description: 'V2 회원 북마크에 저장한 상권을 확인합니다.',
  path: '/profile/bookmarks/recommend',
  index: false,
})

export default function Page() {
  return <ProfileRecommendBookmarksPage />
}
