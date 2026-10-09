import { Suspense } from 'react'
import type { Metadata } from 'next'
import CommunityNotificationsPage from '@/components/community/community-notifications-page'
import { createPageMetadata } from '@/lib/metadata'

export const metadata: Metadata = createPageMetadata({
  title: '알림',
  description: '내 글에 달린 댓글과 내 댓글에 달린 답글을 모아 봅니다.',
  path: '/community/notifications',
  index: false,
})

/* 「안 읽은 것만」을 주소(`?unread=1`)에서 읽어 useSearchParams 를 Suspense 로 감싼다. */
export default function Page() {
  return (
    <Suspense fallback={null}>
      <CommunityNotificationsPage />
    </Suspense>
  )
}
