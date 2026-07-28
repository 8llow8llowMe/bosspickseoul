import type { Metadata } from 'next'
import ChattingUnavailablePage from '@/components/chatting/chatting-unavailable-page'
import { createPageMetadata } from '@/lib/metadata'

export const metadata: Metadata = createPageMetadata({
  title: '채팅 준비 중',
  description: '실시간 채팅 V2 API 계약 준비 상태를 안내합니다.',
  path: '/chatting/list',
  index: false,
})

export default function Page() {
  return <ChattingUnavailablePage variant="list" />
}
