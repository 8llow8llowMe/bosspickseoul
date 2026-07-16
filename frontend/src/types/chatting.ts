import type { CommunityCategoryValue } from '@/types/community'

export type ChatRoomCategory = Exclude<CommunityCategoryValue, ''> | string

export type ChatRoomListItem = {
  chatRoomId: number
  category: ChatRoomCategory
  name: string
  memberCount: number
  limit: number
}

export type ChatRoomDetail = {
  chatRoomId: number
  category: ChatRoomCategory
  name: string
  introduction: string
  memberCount: number
  limit: number
}

export type MyChatRoomListItem = {
  id: number
  name: string
}

export type ChatMessage = {
  chatRoomId: number
  chatMessageId: number
  content: string
  createdAt: string
  senderId: number
  senderNickname: string
  senderProfileImage: string | null
}

export type CreateChatRoomPayload = {
  category: ChatRoomCategory
  name: string
  introduction: string
  limit: number
}

export type EnterChatRoomResponse = {
  chatRoomId: number
}

export type ChatMessagePublishPayload = {
  chatRoomId: number
  content: string
  senderId: number
}

export type FcmSubscribePayload = {
  token: string
  topic: string
}

export type FcmTopicPayload = {
  title: string
  body: string
  topicName: string
}
