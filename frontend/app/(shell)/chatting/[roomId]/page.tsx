import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import ChattingUnavailablePage from '@/components/chatting/chatting-unavailable-page'
import { createPageMetadata } from '@/lib/metadata'

type PageProps = {
  params: Promise<{
    roomId: string
  }>
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { roomId } = await params

  return createPageMetadata({
    title: `채팅방 ${roomId} 준비 중`,
    description: '실시간 채팅 V2 API 계약 준비 상태를 안내합니다.',
    path: `/chatting/${roomId}`,
    index: false,
  })
}

export default async function Page({ params }: PageProps) {
  const { roomId } = await params
  const resolvedRoomId = Number(roomId)

  if (!Number.isFinite(resolvedRoomId) || resolvedRoomId <= 0) {
    notFound()
  }

  return <ChattingUnavailablePage variant="room" roomId={resolvedRoomId} />
}
