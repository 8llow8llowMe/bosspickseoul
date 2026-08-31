import type { Metadata } from 'next'
import ChattingUnavailablePage from '@/components/chatting/chatting-unavailable-page'
import { createPageMetadata } from '@/lib/metadata'

export const metadata: Metadata = createPageMetadata({
  title: '채팅 준비 중',
  description: '실시간 채팅을 준비하고 있습니다.',
  path: '/chatting/list',
  index: false,
})

export default function Page() {
  return <ChattingUnavailablePage variant="list" />
}
