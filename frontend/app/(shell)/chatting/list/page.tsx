import type { Metadata } from 'next'
import ChattingListPage from '@/components/chatting/chatting-list-page'
import { createPageMetadata } from '@/lib/metadata'

export const metadata: Metadata = createPageMetadata({
  title: '채팅 목록',
  description: '실시간 창업 커뮤니티 채팅방 목록입니다.',
  path: '/chatting/list',
  index: false,
})

export default function Page() {
  return <ChattingListPage />
}
