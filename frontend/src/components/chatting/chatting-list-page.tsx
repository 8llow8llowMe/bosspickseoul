'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import styled from 'styled-components'
import ChattingShell from '@/components/chatting/chatting-shell'
import ChattingSidebar from '@/components/chatting/chatting-sidebar'
import { chatRoomCategories } from '@/data/chat-room-categories'
import {
  enterChatRoomData,
  getChatRoomListData,
  getPopularChatRoomsData,
} from '@/lib/api/chatting'
import { getApiMessage, isApiSuccess } from '@/lib/api/response'
import { subscribeChatRoomNotifications } from '@/lib/firebase-messaging'
import { formatChatRoomMembers, getChatRoomCategoryLabel } from '@/lib/chatting'
import { buildLoginHref, currentBrowserPath } from '@/lib/auth/return-path'
import { useAuthStore } from '@/stores/auth-store'
import type { ChatRoomDetail } from '@/types/chatting'

const Main = styled.div`
  display: grid;
  gap: 24px;
`

const Hero = styled.section`
  display: grid;
  gap: 16px;
  padding: 32px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  background: var(--color-surface);
  box-shadow: var(--shadow-level-1);
`

const Eyebrow = styled.p`
  color: var(--color-primary-700);
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`

const HeroTitle = styled.h1`
  color: var(--color-text-900);
  font-size: 26px;
  line-height: 1.1;
  letter-spacing: 0;
`

const HeroBody = styled.p`
  max-width: 760px;
  color: var(--color-text-500);
  line-height: 1.8;
`

const Section = styled.section`
  display: grid;
  gap: 18px;
  padding: 28px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  background: white;
  box-shadow: var(--shadow-level-1);
`

const SectionHeader = styled.div`
  display: grid;
  gap: 8px;
`

const SectionTitle = styled.h2`
  color: var(--color-text-900);
  font-size: 28px;
  line-height: 1.2;
  letter-spacing: 0;
`

const SectionBody = styled.p`
  color: var(--color-text-500);
  line-height: 1.75;
`

const CategoryRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
`

const CategoryChip = styled.button<{ $active: boolean }>`
  min-height: 42px;
  padding: 0 16px;
  border: 1px solid
    ${props =>
      props.$active ? 'var(--color-primary-700)' : 'var(--color-border-200)'};
  border-radius: 999px;
  background: ${props =>
    props.$active ? 'var(--color-primary-100)' : 'white'};
  color: ${props =>
    props.$active ? 'var(--color-primary-700)' : 'var(--color-text-500)'};
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
`

const PopularGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`

const PopularCard = styled.button`
  min-height: 220px;
  display: grid;
  gap: 14px;
  padding: 24px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  background: var(--color-surface);
  color: inherit;
  box-shadow: var(--shadow-level-1);
  text-align: left;
  cursor: pointer;
`

const CategoryBadge = styled.span`
  display: inline-flex;
  width: fit-content;
  min-height: 28px;
  align-items: center;
  padding: 0 10px;
  border-radius: 999px;
  background: var(--color-surface-muted);
  color: var(--color-text-caption);
  font-size: 12px;
  font-weight: 600;
`

const CardTitle = styled.h3`
  color: var(--color-text-900);
  font-size: 22px;
  line-height: 1.35;
  letter-spacing: 0;
`

const CardBody = styled.p`
  color: var(--color-text-600);
  line-height: 1.75;
`

const CardMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: auto;
  color: var(--color-text-caption);
  font-size: 13px;
`

const RoomGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`

const RoomCard = styled.button`
  display: grid;
  gap: 12px;
  padding: 22px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  background: var(--color-surface-muted);
  color: inherit;
  text-align: left;
  cursor: pointer;
  transition:
    transform var(--motion-fast) var(--ease-standard),
    box-shadow var(--motion-fast) var(--ease-standard),
    border-color var(--motion-fast) var(--ease-standard);

  &:hover {
    transform: translateY(-2px);
    border-color: var(--color-primary-700);
    box-shadow: var(--shadow-level-2);
  }
`

const RoomCategory = styled.span`
  display: inline-flex;
  width: fit-content;
  min-height: 28px;
  align-items: center;
  padding: 0 10px;
  border-radius: 999px;
  background: var(--color-primary-100);
  color: var(--color-primary-700);
  font-size: 12px;
  font-weight: 700;
`

const RoomTitle = styled.h3`
  color: var(--color-text-900);
  font-size: 22px;
  line-height: 1.35;
  letter-spacing: 0;
`

const RoomMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  color: var(--color-text-500);
  font-size: 13px;
`

const Notice = styled.div<{ $tone?: 'error' }>`
  padding: 16px 18px;
  border-radius: var(--radius-card);
  background: ${props =>
    props.$tone === 'error'
      ? 'rgba(240, 68, 82, 0.1)'
      : 'var(--color-primary-100)'};
  color: ${props =>
    props.$tone === 'error'
      ? 'var(--color-danger)'
      : 'var(--color-primary-700)'};
  line-height: 1.75;
`

const LoadMoreButton = styled.button`
  min-height: 46px;
  width: fit-content;
  padding: 0 18px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-control);
  background: white;
  color: var(--color-text-700);
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
`

const dedupeRooms = <
  T extends {
    chatRoomId: number
  },
>(
  rooms: T[],
) =>
  rooms.filter(
    (room, index, array) =>
      array.findIndex(candidate => candidate.chatRoomId === room.chatRoomId) ===
      index,
  )

export default function ChattingListPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const hasHydrated = useAuthStore(state => state.hasHydrated)
  const isLoggedIn = useAuthStore(state => state.isLoggedIn)
  const [selectedCategory, setSelectedCategory] = useState('')
  const [pageMessage, setPageMessage] = useState<string | null>(null)

  const popularRoomsQuery = useQuery({
    queryKey: ['chat-popular-rooms', selectedCategory],
    queryFn: () => getPopularChatRoomsData(selectedCategory),
  })

  const roomListQuery = useInfiniteQuery({
    queryKey: ['chat-room-list'],
    initialPageParam: 0,
    queryFn: ({ pageParam }) => getChatRoomListData(Number(pageParam)),
    getNextPageParam: lastPage => {
      if (!isApiSuccess(lastPage) || lastPage.dataBody.length === 0) {
        return undefined
      }

      return lastPage.dataBody[lastPage.dataBody.length - 1]?.chatRoomId
    },
  })

  const enterRoomMutation = useMutation({
    mutationFn: (roomId: number) => enterChatRoomData(roomId),
    onSuccess: async (response, roomId) => {
      if (!isApiSuccess(response)) {
        setPageMessage(getApiMessage(response))
        return
      }

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['chat-my-rooms'],
        }),
        queryClient.invalidateQueries({
          queryKey: ['chat-room-list'],
        }),
        queryClient.invalidateQueries({
          queryKey: ['chat-popular-rooms'],
        }),
      ])

      void subscribeChatRoomNotifications(roomId)
      router.push(`/chatting/${response.dataBody.chatRoomId}`)
    },
    onError: error => {
      setPageMessage(
        error instanceof Error
          ? error.message
          : '채팅방 정보를 확인한 뒤 다시 입장해주세요.',
      )
    },
  })

  const popularRooms =
    popularRoomsQuery.data && isApiSuccess(popularRoomsQuery.data)
      ? popularRoomsQuery.data.dataBody
      : []

  const roomList = dedupeRooms(
    (roomListQuery.data?.pages ?? []).flatMap(page =>
      isApiSuccess(page) ? page.dataBody : [],
    ),
  )

  const handleEnterRoom = (roomId: number) => {
    if (hasHydrated && !isLoggedIn) {
      router.push(buildLoginHref(currentBrowserPath()))
      return
    }

    setPageMessage(null)
    enterRoomMutation.mutate(roomId)
  }

  const popularErrorMessage =
    popularRoomsQuery.data && !isApiSuccess(popularRoomsQuery.data)
      ? getApiMessage(popularRoomsQuery.data)
      : popularRoomsQuery.error instanceof Error
        ? popularRoomsQuery.error.message
        : null

  const roomListFirstPage = roomListQuery.data?.pages[0]
  const roomListErrorMessage =
    roomListFirstPage && !isApiSuccess(roomListFirstPage)
      ? getApiMessage(roomListFirstPage)
      : roomListQuery.error instanceof Error
        ? roomListQuery.error.message
        : null

  return (
    <ChattingShell rail={<ChattingSidebar />}>
      <Main>
        <Hero>
          <Eyebrow>Chatting</Eyebrow>
          <HeroTitle>
            운영 경험을 바로 대화로 연결하는 실시간 채팅방입니다.
          </HeroTitle>
          <HeroBody>
            인기 채팅방은 카테고리 기준으로 빠르게 탐색하고, 전체 목록에서는
            지금 열려 있는 대화방에 바로 입장할 수 있습니다.
          </HeroBody>
        </Hero>

        {pageMessage ? <Notice $tone="error">{pageMessage}</Notice> : null}

        <Section>
          <SectionHeader>
            <SectionTitle>인기 채팅방</SectionTitle>
            <SectionBody>
              반응이 좋은 주제의 채팅방을 카테고리별로 모아 봅니다.
            </SectionBody>
          </SectionHeader>

          <CategoryRow>
            {chatRoomCategories.map(category => (
              <CategoryChip
                key={category.value || 'all'}
                type="button"
                $active={selectedCategory === category.value}
                onClick={() => {
                  setSelectedCategory(category.value)
                }}
              >
                {category.label}
              </CategoryChip>
            ))}
          </CategoryRow>

          {popularRoomsQuery.isLoading ? (
            <Notice>인기 채팅방을 불러오는 중입니다.</Notice>
          ) : popularErrorMessage ? (
            <Notice $tone="error">{popularErrorMessage}</Notice>
          ) : popularRooms.length > 0 ? (
            <PopularGrid>
              {popularRooms.map(room => (
                <PopularRoomCard
                  key={room.chatRoomId}
                  room={room}
                  onClick={() => {
                    handleEnterRoom(room.chatRoomId)
                  }}
                />
              ))}
            </PopularGrid>
          ) : (
            <Notice>조건에 맞는 인기 채팅방이 없어요.</Notice>
          )}
        </Section>

        <Section>
          <SectionHeader>
            <SectionTitle>전체 채팅방</SectionTitle>
            <SectionBody>
              입장 전 인원 수와 카테고리를 먼저 확인할 수 있습니다.
            </SectionBody>
          </SectionHeader>

          {roomListQuery.isLoading ? (
            <Notice>채팅방 목록을 불러오는 중입니다.</Notice>
          ) : roomListErrorMessage ? (
            <Notice $tone="error">{roomListErrorMessage}</Notice>
          ) : roomList.length > 0 ? (
            <>
              <RoomGrid>
                {roomList.map(room => (
                  <RoomCard
                    key={room.chatRoomId}
                    type="button"
                    onClick={() => {
                      handleEnterRoom(room.chatRoomId)
                    }}
                  >
                    <RoomCategory>
                      {getChatRoomCategoryLabel(room.category)}
                    </RoomCategory>
                    <RoomTitle>{room.name}</RoomTitle>
                    <RoomMeta>
                      <span>
                        인원{' '}
                        {formatChatRoomMembers(room.memberCount, room.limit)}
                      </span>
                    </RoomMeta>
                  </RoomCard>
                ))}
              </RoomGrid>
              {roomListQuery.hasNextPage ? (
                <LoadMoreButton
                  type="button"
                  onClick={() => {
                    void roomListQuery.fetchNextPage()
                  }}
                >
                  {roomListQuery.isFetchingNextPage
                    ? '더 불러오는 중'
                    : '채팅방 더 보기'}
                </LoadMoreButton>
              ) : null}
            </>
          ) : (
            <Notice>
              현재 개설된 채팅방이 없어요. 새 채팅방을 만들어보세요.
            </Notice>
          )}
        </Section>
      </Main>
    </ChattingShell>
  )
}

function PopularRoomCard({
  room,
  onClick,
}: {
  room: ChatRoomDetail
  onClick: () => void
}) {
  return (
    <PopularCard type="button" onClick={onClick}>
      <CategoryBadge>{getChatRoomCategoryLabel(room.category)}</CategoryBadge>
      <CardTitle>{room.name}</CardTitle>
      <CardBody>{room.introduction}</CardBody>
      <CardMeta>
        <span>인원 {formatChatRoomMembers(room.memberCount, room.limit)}</span>
      </CardMeta>
    </PopularCard>
  )
}
