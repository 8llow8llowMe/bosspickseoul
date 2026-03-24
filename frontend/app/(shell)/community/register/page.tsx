import { Suspense } from 'react'
import type { Metadata } from 'next'
import CommunityRegisterPage from '@/components/community/community-register-page'
import { createPageMetadata } from '@/lib/metadata'

export const metadata: Metadata = createPageMetadata({
  title: '커뮤니티 글쓰기',
  description: '운영 경험과 상권 인사이트를 커뮤니티 게시글로 작성합니다.',
  path: '/community/register',
  index: false,
})

export default function Page() {
  return (
    <Suspense fallback={null}>
      <CommunityRegisterPage />
    </Suspense>
  )
}
