'use client'

import { Client, type IMessage, type StompSubscription } from '@stomp/stompjs'
import { env } from '@/lib/env'
import type { ChatMessagePublishPayload } from '@/types/chatting'

type CreateChatStompClientOptions = {
  onConnect?: (client: Client) => void
  onStompError?: (message: string) => void
  onWebSocketClose?: () => void
}

export const createChatStompClient = ({
  onConnect,
  onStompError,
  onWebSocketClose,
}: CreateChatStompClientOptions = {}) => {
  const client = new Client({
    brokerURL: env.wsUrl,
    reconnectDelay: 3000,
    debug: () => {},
    onConnect: () => {
      onConnect?.(client)
    },
    onStompError: frame => {
      onStompError?.(
        frame.headers.message || 'STOMP 연결 중 문제가 발생했습니다.',
      )
    },
    onWebSocketClose: () => {
      onWebSocketClose?.()
    },
  })

  return client
}

export const subscribeToChatRoom = (
  client: Client,
  roomId: number,
  onMessage: (message: IMessage) => void,
) => client.subscribe(`/topic/public/rooms/${roomId}`, onMessage)

export const publishChatMessage = (
  client: Client,
  roomId: number,
  payload: ChatMessagePublishPayload,
) => {
  client.publish({
    destination: `/app/message/${roomId}`,
    body: JSON.stringify(payload),
  })
}

export const disconnectChatStompClient = async (
  client: Client | null | undefined,
  subscription?: StompSubscription | null,
) => {
  subscription?.unsubscribe()

  if (!client?.active) {
    return
  }

  await client.deactivate()
}
