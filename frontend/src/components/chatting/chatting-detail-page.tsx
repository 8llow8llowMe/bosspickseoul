'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import type { Client, IMessage, StompSubscription } from '@stomp/stompjs'
import styled from 'styled-components'
import RequireAuth from '@/components/auth/require-auth'
import ChattingShell from '@/components/chatting/chatting-shell'
import ChattingSidebar from '@/components/chatting/chatting-sidebar'
import {
  exitChatRoomData,
  getChatRoomDetailData,
  getChatRoomMessagesData,
} from '@/lib/api/chatting'
import { sendFcmTopicMessage } from '@/lib/api/firebase'
import { getApiMessage, isApiSuccess } from '@/lib/api/response'
import {
  formatChatDateLabel,
  formatChatRoomMembers,
  formatChatTime,
  getChatRoomCategoryLabel,
  isChatNewDay,
  mergeChatMessages,
} from '@/lib/chatting'
import {
  createChatStompClient,
  disconnectChatStompClient,
  publishChatMessage,
  subscribeToChatRoom,
} from '@/lib/realtime/chat-stomp'
import { useAuthStore } from '@/stores/auth-store'
import type { ChatMessage } from '@/types/chatting'

const Main = styled.div`
  display: grid;
`

const Panel = styled.section`
  display: grid;
  grid-template-rows: auto minmax(420px, 1fr) auto;
  min-height: calc(100vh - 192px);
  border: 1px solid var(--color-border-200);
  border-radius: 28px;
  background: white;
  box-shadow: 0 10px 30px rgba(21, 73, 181, 0.08);
  overflow: hidden;

  @media (max-width: 1024px) {
    min-height: calc(100vh - 240px);
  }
`

const Header = styled.header`
  display: grid;
  gap: 14px;
  padding: 28px;
  border-bottom: 1px solid var(--color-border-200);
  background:
    radial-gradient(
      circle at top left,
      rgba(51, 109, 211, 0.12),
      transparent 36%
    ),
    linear-gradient(180deg, #f8fbff 0%, #ffffff 100%);
`

const HeaderTop = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
`

const HeaderCopy = styled.div`
  display: grid;
  gap: 10px;
`

const CategoryBadge = styled.span`
  display: inline-flex;
  width: fit-content;
  min-height: 28px;
  align-items: center;
  padding: 0 10px;
  border-radius: 999px;
  background: rgba(21, 73, 181, 0.08);
  color: var(--color-primary-700);
  font-size: 12px;
  font-weight: 700;
`

const Title = styled.h1`
  color: var(--color-text-900);
  font-size: 30px;
  line-height: 1.2;
  letter-spacing: -0.03em;
`

const Introduction = styled.p`
  color: var(--color-text-500);
  line-height: 1.75;
`

const MetaRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  color: var(--color-text-500);
  font-size: 13px;
`

const ActionRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
`

const SecondaryLink = styled(Link)`
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 16px;
  border: 1px solid var(--color-border-200);
  border-radius: 14px;
  background: white;
  color: var(--color-text-700);
  font-size: 14px;
  font-weight: 700;
`

const GhostButton = styled.button`
  min-height: 44px;
  padding: 0 16px;
  border: 1px solid var(--color-border-200);
  border-radius: 14px;
  background: white;
  color: var(--color-text-700);
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
`

const Notice = styled.div<{ $tone?: 'error' }>`
  padding: 16px 18px;
  border-radius: 18px;
  background: ${props =>
    props.$tone === 'error'
      ? 'rgba(209, 67, 67, 0.08)'
      : 'rgba(51, 109, 211, 0.08)'};
  color: ${props =>
    props.$tone === 'error'
      ? 'var(--color-danger)'
      : 'var(--color-primary-700)'};
  line-height: 1.75;
`

const MessageViewport = styled.div`
  overflow-y: auto;
  padding: 20px 24px;
  background: linear-gradient(180deg, #fbfdff 0%, #f6f9fd 100%);
`

const MessageList = styled.div`
  display: grid;
  gap: 14px;
`

const DaySeparator = styled.div`
  justify-self: center;
  padding: 8px 14px;
  border-radius: 999px;
  background: rgba(21, 73, 181, 0.08);
  color: var(--color-primary-700);
  font-size: 12px;
  font-weight: 700;
`

const MessageRow = styled.div<{ $isMe: boolean }>`
  display: flex;
  justify-content: ${props => (props.$isMe ? 'flex-end' : 'flex-start')};
`

const MessageBubble = styled.article<{ $isMe: boolean }>`
  max-width: min(72%, 560px);
  display: grid;
  gap: 8px;
  padding: 14px 16px;
  border-radius: 18px;
  background: ${props => (props.$isMe ? 'var(--color-primary-700)' : 'white')};
  color: ${props => (props.$isMe ? 'white' : 'var(--color-text-700)')};
  box-shadow: 0 8px 24px rgba(21, 73, 181, 0.08);

  @media (max-width: 768px) {
    max-width: 86%;
  }
`

const Sender = styled.p<{ $isMe: boolean }>`
  color: ${props =>
    props.$isMe ? 'rgba(255, 255, 255, 0.84)' : 'var(--color-text-500)'};
  font-size: 12px;
  font-weight: 700;
`

const MessageContent = styled.p`
  line-height: 1.75;
  white-space: pre-wrap;
  word-break: break-word;
`

const MessageMeta = styled.p<{ $isMe: boolean }>`
  color: ${props =>
    props.$isMe ? 'rgba(255, 255, 255, 0.7)' : 'var(--color-text-500)'};
  font-size: 12px;
`

const Composer = styled.div`
  display: grid;
  gap: 12px;
  padding: 20px 24px 24px;
  border-top: 1px solid var(--color-border-200);
  background: white;
`

const ComposerInput = styled.textarea`
  width: 100%;
  min-height: 120px;
  padding: 14px 16px;
  border: 1px solid var(--color-border-200);
  border-radius: 16px;
  resize: vertical;
  background: white;
  color: var(--color-text-900);
  line-height: 1.8;
`

const ComposerFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
`

const Helper = styled.p`
  color: var(--color-text-500);
  font-size: 13px;
  line-height: 1.75;
`

const PrimaryButton = styled.button`
  min-height: 46px;
  padding: 0 18px;
  border: 1px solid var(--color-primary-700);
  border-radius: 14px;
  background: var(--color-primary-700);
  color: white;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
`

const LoadOlderButton = styled.button`
  min-height: 40px;
  width: fit-content;
  margin: 0 auto 6px;
  padding: 0 14px;
  border: 1px solid var(--color-border-200);
  border-radius: 14px;
  background: white;
  color: var(--color-text-700);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
`

type ChattingDetailPageProps = {
  roomId: number
}

export default function ChattingDetailPage({
  roomId,
}: ChattingDetailPageProps) {
  return (
    <RequireAuth>
      <ChattingDetailContent key={roomId} roomId={roomId} />
    </RequireAuth>
  )
}

function ChattingDetailContent({ roomId }: ChattingDetailPageProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const hasHydrated = useAuthStore(state => state.hasHydrated)
  const isLoggedIn = useAuthStore(state => state.isLoggedIn)
  const memberInfo = useAuthStore(state => state.memberInfo)
  const [composerValue, setComposerValue] = useState('')
  const [roomMessage, setRoomMessage] = useState<string | null>(null)
  const [realtimeMessages, setRealtimeMessages] = useState<ChatMessage[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const clientRef = useRef<Client | null>(null)
  const subscriptionRef = useRef<StompSubscription | null>(null)
  const viewportRef = useRef<HTMLDivElement | null>(null)

  const roomDetailQuery = useQuery({
    queryKey: ['chat-room-detail', roomId],
    queryFn: () => getChatRoomDetailData(roomId),
  })

  const roomMessagesQuery = useInfiniteQuery({
    queryKey: ['chat-room-messages', roomId],
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      getChatRoomMessagesData(roomId, Number(pageParam)),
    getNextPageParam: lastPage => {
      if (!isApiSuccess(lastPage) || lastPage.dataBody.length === 0) {
        return undefined
      }

      return lastPage.dataBody[lastPage.dataBody.length - 1]?.chatMessageId
    },
  })

  const exitRoomMutation = useMutation({
    mutationFn: () => exitChatRoomData(roomId),
    onSuccess: async response => {
      if (!isApiSuccess(response)) {
        setRoomMessage(getApiMessage(response))
        return
      }

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['chat-room-list'],
        }),
        queryClient.invalidateQueries({
          queryKey: ['chat-my-rooms'],
        }),
        queryClient.invalidateQueries({
          queryKey: ['chat-room-detail'],
        }),
        queryClient.invalidateQueries({
          queryKey: ['chat-room-messages'],
        }),
      ])

      router.replace('/chatting/list')
    },
    onError: error => {
      setRoomMessage(
        error instanceof Error
          ? error.message
          : '채팅방 나가기 중 문제가 발생했습니다.',
      )
    },
  })

  useEffect(() => {
    if (!hasHydrated || !isLoggedIn || !memberInfo?.id) {
      return
    }

    const client = createChatStompClient({
      onConnect: connectedClient => {
        setIsConnected(true)
        setRoomMessage(null)
        subscriptionRef.current = subscribeToChatRoom(
          connectedClient,
          roomId,
          (message: IMessage) => {
            try {
              const nextMessage = JSON.parse(message.body) as ChatMessage
              setRealtimeMessages(currentMessages =>
                mergeChatMessages(currentMessages, [nextMessage]),
              )
            } catch (error) {
              console.warn('Parsing chat message failed.', error)
            }
          },
        )
      },
      onStompError: message => {
        setIsConnected(false)
        setRoomMessage(message)
      },
      onWebSocketClose: () => {
        setIsConnected(false)
      },
    })

    clientRef.current = client
    client.activate()

    return () => {
      const currentClient = clientRef.current
      const currentSubscription = subscriptionRef.current

      clientRef.current = null
      subscriptionRef.current = null
      setIsConnected(false)
      void disconnectChatStompClient(currentClient, currentSubscription)
    }
  }, [hasHydrated, isLoggedIn, memberInfo?.id, roomId])

  const historyMessages = (roomMessagesQuery.data?.pages ?? []).flatMap(page =>
    isApiSuccess(page) ? page.dataBody : [],
  )

  const mergedMessages = mergeChatMessages(historyMessages, realtimeMessages)

  useEffect(() => {
    if (!viewportRef.current) {
      return
    }

    viewportRef.current.scrollTop = viewportRef.current.scrollHeight
  }, [mergedMessages.length])

  const handleSendMessage = async () => {
    const trimmedContent = composerValue.trim()

    if (!trimmedContent) {
      return
    }

    if (!clientRef.current?.connected || !memberInfo?.id) {
      setRoomMessage('실시간 연결을 확인한 뒤 다시 전송해 주세요.')
      return
    }

    try {
      publishChatMessage(clientRef.current, roomId, {
        chatRoomId: roomId,
        content: trimmedContent,
        senderId: memberInfo.id,
      })

      const roomName =
        roomDetailQuery.data && isApiSuccess(roomDetailQuery.data)
          ? roomDetailQuery.data.dataBody.name
          : 'NowDoBoss 채팅'

      void sendFcmTopicMessage({
        title: roomName,
        body: trimmedContent,
        topicName: String(roomId),
      }).catch(error => {
        console.warn('Sending chat topic notification failed.', error)
      })

      setComposerValue('')
      setRoomMessage(null)
    } catch (error) {
      setRoomMessage(
        error instanceof Error
          ? error.message
          : '메시지를 전송하지 못했습니다.',
      )
    }
  }

  const handleComposerKeyDown = (
    event: React.KeyboardEvent<HTMLTextAreaElement>,
  ) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void handleSendMessage()
    }
  }

  const handleExitRoom = () => {
    if (!window.confirm('채팅방을 나가시겠습니까?')) {
      return
    }

    exitRoomMutation.mutate()
  }

  if (roomDetailQuery.isLoading) {
    return (
      <ChattingShell rail={<ChattingSidebar selectedRoomId={roomId} />}>
        <Notice>채팅방 정보를 불러오는 중입니다.</Notice>
      </ChattingShell>
    )
  }

  if (!roomDetailQuery.data || !isApiSuccess(roomDetailQuery.data)) {
    return (
      <ChattingShell rail={<ChattingSidebar selectedRoomId={roomId} />}>
        <Notice $tone="error">
          {getApiMessage(
            roomDetailQuery.data,
            '채팅방 정보를 찾을 수 없습니다.',
          )}
        </Notice>
      </ChattingShell>
    )
  }

  const roomDetail = roomDetailQuery.data.dataBody
  const messagesFirstPage = roomMessagesQuery.data?.pages[0]
  const messagesErrorMessage =
    messagesFirstPage && !isApiSuccess(messagesFirstPage)
      ? getApiMessage(messagesFirstPage)
      : roomMessagesQuery.error instanceof Error
        ? roomMessagesQuery.error.message
        : null

  return (
    <ChattingShell rail={<ChattingSidebar selectedRoomId={roomId} />}>
      <Main>
        <Panel>
          <Header>
            <HeaderTop>
              <HeaderCopy>
                <CategoryBadge>
                  {getChatRoomCategoryLabel(roomDetail.category)}
                </CategoryBadge>
                <Title>{roomDetail.name}</Title>
                <Introduction>{roomDetail.introduction}</Introduction>
                <MetaRow>
                  <span>
                    인원{' '}
                    {formatChatRoomMembers(
                      roomDetail.memberCount,
                      roomDetail.limit,
                    )}
                  </span>
                  <span>
                    {isConnected ? '실시간 연결됨' : '실시간 연결 중'}
                  </span>
                </MetaRow>
              </HeaderCopy>
              <ActionRow>
                <SecondaryLink href="/chatting/list">목록으로</SecondaryLink>
                <GhostButton type="button" onClick={handleExitRoom}>
                  {exitRoomMutation.isPending ? '나가는 중' : '나가기'}
                </GhostButton>
              </ActionRow>
            </HeaderTop>
            {roomMessage ? <Notice $tone="error">{roomMessage}</Notice> : null}
          </Header>

          <MessageViewport ref={viewportRef}>
            {roomMessagesQuery.hasNextPage ? (
              <LoadOlderButton
                type="button"
                onClick={() => {
                  void roomMessagesQuery.fetchNextPage()
                }}
              >
                {roomMessagesQuery.isFetchingNextPage
                  ? '불러오는 중'
                  : '이전 메시지 더 보기'}
              </LoadOlderButton>
            ) : null}

            {roomMessagesQuery.isLoading ? (
              <Notice>이전 메시지를 불러오는 중입니다.</Notice>
            ) : messagesErrorMessage ? (
              <Notice $tone="error">{messagesErrorMessage}</Notice>
            ) : mergedMessages.length > 0 ? (
              <MessageList>
                {mergedMessages.map((message, index) => {
                  const previousMessage = mergedMessages[index - 1] ?? null
                  const isMe = memberInfo?.id === message.senderId
                  const shouldShowDaySeparator = isChatNewDay(
                    previousMessage?.createdAt ?? null,
                    message.createdAt,
                  )

                  return (
                    <div key={message.chatMessageId}>
                      {shouldShowDaySeparator ? (
                        <DaySeparator>
                          {formatChatDateLabel(message.createdAt)}
                        </DaySeparator>
                      ) : null}
                      <MessageRow $isMe={isMe}>
                        <MessageBubble $isMe={isMe}>
                          <Sender $isMe={isMe}>
                            {isMe ? '나' : message.senderNickname}
                          </Sender>
                          <MessageContent>{message.content}</MessageContent>
                          <MessageMeta $isMe={isMe}>
                            {formatChatTime(message.createdAt)}
                          </MessageMeta>
                        </MessageBubble>
                      </MessageRow>
                    </div>
                  )
                })}
              </MessageList>
            ) : (
              <Notice>첫 메시지를 보내 대화를 시작해 보세요.</Notice>
            )}
          </MessageViewport>

          <Composer>
            <ComposerInput
              aria-label="chat message"
              placeholder="내용을 입력하세요. Enter로 전송하고 Shift+Enter로 줄바꿈합니다."
              value={composerValue}
              maxLength={499}
              onChange={event => {
                setComposerValue(event.target.value)
              }}
              onKeyDown={handleComposerKeyDown}
            />
            <ComposerFooter>
              <Helper>
                브라우저 푸시가 불가능한 환경에서도 채팅 자체는 정상 동작합니다.
              </Helper>
              <PrimaryButton
                type="button"
                onClick={() => {
                  void handleSendMessage()
                }}
              >
                보내기
              </PrimaryButton>
            </ComposerFooter>
          </Composer>
        </Panel>
      </Main>
    </ChattingShell>
  )
}
