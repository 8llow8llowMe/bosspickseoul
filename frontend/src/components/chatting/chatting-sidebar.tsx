'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import styled from 'styled-components'
import ChatRoomCreateModal from '@/components/chatting/chat-room-create-modal'
import ChatRoomSearch from '@/components/chatting/chat-room-search'
import { useAuthStore } from '@/stores/auth-store'

const Card = styled.section`
  display: grid;
  gap: 16px;
  padding: 24px;
  border: 1px solid var(--color-border-200);
  border-radius: 24px;
  background: white;
  box-shadow: 0 10px 30px rgba(21, 73, 181, 0.08);
`

const Title = styled.h2`
  color: var(--color-text-900);
  font-size: 24px;
  line-height: 1.2;
  letter-spacing: -0.03em;
`

const Body = styled.p`
  color: var(--color-text-500);
  line-height: 1.75;
`

const PrimaryButton = styled.button`
  min-height: 46px;
  width: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--color-primary-700);
  border-radius: 14px;
  background: var(--color-primary-700);
  color: white;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
`

const SecondaryLink = styled(Link)`
  min-height: 46px;
  width: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--color-border-200);
  border-radius: 14px;
  background: white;
  color: var(--color-text-700);
  font-size: 14px;
  font-weight: 700;
`

const Divider = styled.hr`
  border: none;
  border-top: 1px solid var(--color-border-200);
`

const SectionTitle = styled.h3`
  color: var(--color-text-900);
  font-size: 16px;
  line-height: 1.3;
`

const Notice = styled.p`
  color: var(--color-text-500);
  font-size: 13px;
  line-height: 1.75;
`

type ChattingSidebarProps = {
  selectedRoomId?: number | null
}

export default function ChattingSidebar({
  selectedRoomId = null,
}: ChattingSidebarProps) {
  const router = useRouter()
  const hasHydrated = useAuthStore(state => state.hasHydrated)
  const isLoggedIn = useAuthStore(state => state.isLoggedIn)
  const [modalOpen, setModalOpen] = useState(false)

  const handleOpenCreate = () => {
    if (hasHydrated && !isLoggedIn) {
      router.push('/login')
      return
    }

    setModalOpen(true)
  }

  return (
    <>
      <Card>
        <Title>채팅</Title>
        <Body>
          인기 채팅방을 둘러보고, 관심 있는 주제의 대화방에 바로 참여할 수
          있습니다.
        </Body>
        <PrimaryButton
          type="button"
          onClick={() => {
            handleOpenCreate()
          }}
        >
          채팅방 생성하기
        </PrimaryButton>
        <SecondaryLink href="/chatting/list">인기방 둘러보기</SecondaryLink>
      </Card>

      <Card>
        <SectionTitle>내 채팅방 목록</SectionTitle>
        {!hasHydrated ? (
          <Notice>로그인 상태를 확인하는 중입니다.</Notice>
        ) : isLoggedIn ? (
          <ChatRoomSearch selectedRoomId={selectedRoomId} />
        ) : (
          <Notice>
            로그인하면 참여 중인 채팅방을 검색하고 바로 다시 입장할 수 있습니다.
          </Notice>
        )}
        <Divider />
        <Notice>
          실시간 메시지는 WebSocket으로 연결하고, 브라우저 푸시는 가능한
          환경에서만 보조적으로 활성화됩니다.
        </Notice>
      </Card>

      <ChatRoomCreateModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false)
        }}
      />
    </>
  )
}
