'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import styled from 'styled-components'
import { Button, ButtonLink } from '@/components/ui/button'
import ChatRoomCreateModal from '@/components/chatting/chat-room-create-modal'
import ChatRoomSearch from '@/components/chatting/chat-room-search'
import { buildLoginHref, currentBrowserPath } from '@/lib/auth/return-path'
import { useAuthStore } from '@/stores/auth-store'

const Card = styled.section`
  display: grid;
  gap: 16px;
  padding: 24px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-card);
  background: white;
  box-shadow: var(--shadow-level-1);
`

const Title = styled.h2`
  color: var(--color-text-900);
  font-size: 24px;
  line-height: 1.2;
  letter-spacing: 0;
`

const Body = styled.p`
  color: var(--color-text-500);
  line-height: 1.75;
`

/* 사이드 카드 폭을 채운다. */
const FullWidthButton = styled(Button)`
  width: 100%;
`

const FullWidthButtonLink = styled(ButtonLink)`
  width: 100%;
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
      router.push(buildLoginHref(currentBrowserPath()))
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
        <FullWidthButton
          type="button"
          size="large"
          onClick={() => {
            handleOpenCreate()
          }}
        >
          채팅방 생성하기
        </FullWidthButton>
        <FullWidthButtonLink
          href="/chatting/list"
          size="large"
          variant="secondary"
        >
          인기방 둘러보기
        </FullWidthButtonLink>
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
