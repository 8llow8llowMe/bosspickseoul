'use client'

import Link from 'next/link'
import { useDeferredValue, useState } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import styled from 'styled-components'
import { getMyChatRoomsData } from '@/lib/api/chatting'
import { getApiMessage, isApiSuccess } from '@/lib/api/response'

const Wrap = styled.div`
  display: grid;
  gap: 12px;
`

const SearchInput = styled.input`
  width: 100%;
  min-height: 46px;
  padding: 0 14px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-field);
  background: white;
  color: var(--color-text-900);
`

const RoomList = styled.div`
  display: grid;
  gap: 8px;
`

const RoomLink = styled(Link)<{ $active?: boolean }>`
  min-height: 44px;
  display: flex;
  align-items: center;
  padding: 0 14px;
  border-radius: var(--radius-control);
  background: ${props =>
    props.$active ? 'var(--color-primary-100)' : 'var(--color-surface-muted)'};
  color: ${props =>
    props.$active ? 'var(--color-primary-700)' : 'var(--color-text-700)'};
  font-size: 14px;
  font-weight: 700;
`

const Notice = styled.p<{ $tone?: 'error' }>`
  color: ${props =>
    props.$tone === 'error' ? 'var(--color-danger)' : 'var(--color-text-500)'};
  font-size: 13px;
  line-height: 1.75;
`

const LoadMoreButton = styled.button`
  min-height: 42px;
  width: 100%;
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
    id: number
  },
>(
  rooms: T[],
) =>
  rooms.filter(
    (room, index, array) =>
      array.findIndex(candidate => candidate.id === room.id) === index,
  )

type ChatRoomSearchProps = {
  selectedRoomId?: number | null
}

export default function ChatRoomSearch({
  selectedRoomId = null,
}: ChatRoomSearchProps) {
  const [keyword, setKeyword] = useState('')
  const deferredKeyword = useDeferredValue(keyword.trim())

  const myRoomsQuery = useInfiniteQuery({
    queryKey: ['chat-my-rooms', deferredKeyword],
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      getMyChatRoomsData({
        keyword: deferredKeyword,
        lastId: Number(pageParam),
      }),
    getNextPageParam: lastPage => {
      if (!isApiSuccess(lastPage) || lastPage.dataBody.length === 0) {
        return undefined
      }

      return lastPage.dataBody[lastPage.dataBody.length - 1]?.id
    },
  })

  const myRooms = dedupeRooms(
    (myRoomsQuery.data?.pages ?? []).flatMap(page =>
      isApiSuccess(page) ? page.dataBody : [],
    ),
  )

  const firstPage = myRoomsQuery.data?.pages[0]
  const errorMessage =
    firstPage && !isApiSuccess(firstPage)
      ? getApiMessage(firstPage)
      : myRoomsQuery.error instanceof Error
        ? myRoomsQuery.error.message
        : null

  return (
    <Wrap>
      <SearchInput
        type="search"
        value={keyword}
        placeholder="채팅방 검색하기"
        onChange={event => {
          setKeyword(event.target.value)
        }}
      />
      {myRoomsQuery.isLoading ? (
        <Notice>내 채팅방 목록을 불러오는 중입니다.</Notice>
      ) : errorMessage ? (
        <Notice $tone="error">{errorMessage}</Notice>
      ) : myRooms.length > 0 ? (
        <RoomList>
          {myRooms.map(room => (
            <RoomLink
              key={room.id}
              href={`/chatting/${room.id}`}
              $active={selectedRoomId === room.id}
            >
              {room.name}
            </RoomLink>
          ))}
          {myRoomsQuery.hasNextPage ? (
            <LoadMoreButton
              type="button"
              onClick={() => {
                void myRoomsQuery.fetchNextPage()
              }}
            >
              {myRoomsQuery.isFetchingNextPage
                ? '더 불러오는 중'
                : '내 채팅방 더 보기'}
            </LoadMoreButton>
          ) : null}
        </RoomList>
      ) : (
        <Notice>
          {deferredKeyword
            ? '조건에 맞는 채팅방이 없어요.'
            : '아직 참여 중인 채팅방이 없어요.'}
        </Notice>
      )}
    </Wrap>
  )
}
