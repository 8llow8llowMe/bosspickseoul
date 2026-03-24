import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import ChattingDetailPage from '@/components/chatting/chatting-detail-page'
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
    title: `채팅방 ${roomId}`,
    description: 'NowDoBoss 실시간 채팅방 상세 화면입니다.',
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

  return <ChattingDetailPage roomId={resolvedRoomId} />
}
