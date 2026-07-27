import { getChatRoomCategoryLabelFromCatalog } from '@/data/chat-room-categories'
import type { ChatMessage } from '@/types/chatting'

const timeFormatter = new Intl.DateTimeFormat('ko-KR', {
  hour: '2-digit',
  minute: '2-digit',
})

const dateFormatter = new Intl.DateTimeFormat('ko-KR', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  weekday: 'short',
})

const compactNumberFormatter = new Intl.NumberFormat('ko-KR')

const resolveDate = (value: string) => {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export const formatChatTime = (value: string) => {
  const date = resolveDate(value)

  if (!date) {
    return ''
  }

  return timeFormatter.format(date)
}

export const formatChatDateLabel = (value: string) => {
  const date = resolveDate(value)

  if (!date) {
    return ''
  }

  return dateFormatter.format(date)
}

export const isChatNewDay = (
  previousValue: string | null,
  currentValue: string,
) => {
  const previousDate = previousValue ? resolveDate(previousValue) : null
  const currentDate = resolveDate(currentValue)

  if (!currentDate) {
    return false
  }

  if (!previousDate) {
    return true
  }

  return (
    previousDate.getFullYear() !== currentDate.getFullYear() ||
    previousDate.getMonth() !== currentDate.getMonth() ||
    previousDate.getDate() !== currentDate.getDate()
  )
}

export const formatChatRoomMembers = (memberCount: number, limit: number) =>
  `${compactNumberFormatter.format(memberCount)} / ${compactNumberFormatter.format(limit)}`

export const getChatRoomCategoryLabel = (value: string) =>
  getChatRoomCategoryLabelFromCatalog(value)

export const sortChatMessagesAscending = (messages: ChatMessage[]) =>
  [...messages].sort((leftMessage, rightMessage) => {
    if (leftMessage.chatMessageId !== rightMessage.chatMessageId) {
      return leftMessage.chatMessageId - rightMessage.chatMessageId
    }

    return leftMessage.createdAt.localeCompare(rightMessage.createdAt)
  })

export const mergeChatMessages = (
  currentMessages: ChatMessage[],
  nextMessages: ChatMessage[],
) => {
  const mergedMessages = [...currentMessages, ...nextMessages]
  const dedupedMessages = mergedMessages.filter(
    (message, index, array) =>
      array.findIndex(
        candidate => candidate.chatMessageId === message.chatMessageId,
      ) === index,
  )

  return sortChatMessagesAscending(dedupedMessages)
}
