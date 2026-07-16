import { Suspense } from 'react'
import type { Metadata } from 'next'
import CommunityListPage from '@/components/community/community-list-page'
import { createPageMetadata } from '@/lib/metadata'

export const metadata: Metadata = createPageMetadata({
  title: '커뮤니티',
  description:
    '운영 경험, 상권 공유, 창업 고민을 나누는 NowDoBoss 커뮤니티입니다.',
  path: '/community/list',
  index: true,
})

export default function Page() {
  return (
    <Suspense fallback={null}>
      <CommunityListPage />
    </Suspense>
  )
}
