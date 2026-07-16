import { apiClient } from '@/lib/api/client'
import type { ApiResponse } from '@/types/api'
import type {
  ChatMessage,
  ChatRoomDetail,
  ChatRoomListItem,
  CreateChatRoomPayload,
  EnterChatRoomResponse,
  MyChatRoomListItem,
} from '@/types/chatting'

export const getChatRoomListData = async (lastId = 0) => {
  const response = await apiClient.get<ApiResponse<ChatRoomListItem[]>>(
    '/chat-rooms',
    {
      params: {
        lastId,
      },
    },
  )

  return response.data
}

export const getPopularChatRoomsData = async (category: string) => {
  const response = await apiClient.get<ApiResponse<ChatRoomDetail[]>>(
    '/chat-rooms/popular-room',
    {
      params: {
        category,
      },
    },
  )

  return response.data
}

export const getMyChatRoomsData = async ({
  lastId = 0,
  keyword = '',
}: {
  lastId?: number
  keyword?: string
}) => {
  const response = await apiClient.get<ApiResponse<MyChatRoomListItem[]>>(
    '/chat-rooms/my-rooms',
    {
      params: {
        lastId,
        keyword,
      },
    },
  )

  return response.data
}

export const getChatRoomDetailData = async (chatRoomId: number) => {
  const response = await apiClient.get<ApiResponse<ChatRoomDetail>>(
    `/chat-rooms/${chatRoomId}`,
  )

  return response.data
}

export const getChatRoomMessagesData = async (
  chatRoomId: number,
  lastId = 0,
) => {
  const response = await apiClient.get<ApiResponse<ChatMessage[]>>(
    `/chat-rooms/${chatRoomId}/messages`,
    {
      params: {
        lastId,
      },
    },
  )

  return response.data
}

export const createChatRoomData = async (payload: CreateChatRoomPayload) => {
  const response = await apiClient.post<ApiResponse<EnterChatRoomResponse>>(
    '/chat-rooms',
    payload,
  )

  return response.data
}

export const enterChatRoomData = async (chatRoomId: number) => {
  const response = await apiClient.post<ApiResponse<EnterChatRoomResponse>>(
    `/chat-rooms/${chatRoomId}`,
  )

  return response.data
}

export const exitChatRoomData = async (chatRoomId: number) => {
  const response = await apiClient.delete<ApiResponse<null>>(
    `/chat-rooms/${chatRoomId}`,
  )

  return response.data
}
