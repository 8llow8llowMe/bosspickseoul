'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import styled from 'styled-components'
import { chatRoomCategories } from '@/data/chat-room-categories'
import { createChatRoomData } from '@/lib/api/chatting'
import { getApiMessage, isApiSuccess } from '@/lib/api/response'
import { subscribeChatRoomNotifications } from '@/lib/firebase-messaging'

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 30;
  display: grid;
  place-items: center;
  padding: 24px;
  background: var(--color-overlay);
`

const Card = styled.section`
  width: min(480px, 100%);
  display: grid;
  gap: 18px;
  padding: 28px;
  border-radius: var(--radius-card);
  background: white;
  box-shadow: var(--shadow-level-4);
`

const Header = styled.div`
  display: grid;
  gap: 8px;
`

const Title = styled.h2`
  color: var(--color-text-900);
  font-size: 28px;
  line-height: 1.2;
  letter-spacing: 0;
`

const Body = styled.p`
  color: var(--color-text-500);
  line-height: 1.75;
`

const Fieldset = styled.div`
  display: grid;
  gap: 10px;
`

const Label = styled.label`
  color: var(--color-text-900);
  font-size: 15px;
  font-weight: 700;
`

const Input = styled.input`
  width: 100%;
  min-height: 50px;
  padding: 0 14px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-field);
  background: white;
  color: var(--color-text-900);
`

const TextArea = styled.textarea`
  width: 100%;
  min-height: 120px;
  padding: 14px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-field);
  resize: vertical;
  background: white;
  color: var(--color-text-900);
  line-height: 1.7;
`

const Select = styled.select`
  width: 100%;
  min-height: 50px;
  padding: 0 14px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-field);
  background: white;
  color: var(--color-text-900);
`

const Helper = styled.p`
  color: var(--color-text-500);
  font-size: 13px;
  line-height: 1.75;
`

const Notice = styled.p<{ $tone?: 'error' }>`
  color: ${props =>
    props.$tone === 'error' ? 'var(--color-danger)' : 'var(--color-text-500)'};
  line-height: 1.75;
`

const ActionRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
`

const PrimaryButton = styled.button<{ $disabled?: boolean }>`
  min-height: 48px;
  padding: 0 18px;
  border: 1px solid
    ${props =>
      props.$disabled ? 'var(--color-border-200)' : 'var(--color-primary-700)'};
  border-radius: var(--radius-control);
  background: ${props =>
    props.$disabled ? 'var(--color-border-200)' : 'var(--color-primary-700)'};
  color: white;
  font-size: 14px;
  font-weight: 700;
  cursor: ${props => (props.$disabled ? 'default' : 'pointer')};
`

const SecondaryButton = styled.button`
  min-height: 48px;
  padding: 0 18px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-control);
  background: white;
  color: var(--color-text-700);
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
`

type ChatRoomCreateModalProps = {
  open: boolean
  onClose: () => void
}

const MAX_NAME_LENGTH = 20
const MAX_INTRODUCTION_LENGTH = 40

export default function ChatRoomCreateModal({
  open,
  onClose,
}: ChatRoomCreateModalProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [nameValue, setNameValue] = useState('')
  const [introductionValue, setIntroductionValue] = useState('')
  const [categoryValue, setCategoryValue] = useState('')
  const [limitValue, setLimitValue] = useState(2)
  const [formMessage, setFormMessage] = useState<string | null>(null)

  const isValid =
    Boolean(categoryValue) &&
    nameValue.trim().length >= 1 &&
    nameValue.trim().length <= MAX_NAME_LENGTH &&
    introductionValue.trim().length >= 1 &&
    introductionValue.trim().length <= MAX_INTRODUCTION_LENGTH &&
    limitValue >= 2 &&
    limitValue <= 600

  const createRoomMutation = useMutation({
    mutationFn: () =>
      createChatRoomData({
        category: categoryValue,
        name: nameValue.trim(),
        introduction: introductionValue.trim(),
        limit: limitValue,
      }),
    onSuccess: async response => {
      if (!isApiSuccess(response)) {
        setFormMessage(getApiMessage(response))
        return
      }

      const roomId = response.dataBody.chatRoomId

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['chat-room-list'],
        }),
        queryClient.invalidateQueries({
          queryKey: ['chat-popular-rooms'],
        }),
        queryClient.invalidateQueries({
          queryKey: ['chat-my-rooms'],
        }),
      ])

      onClose()
      void subscribeChatRoomNotifications(roomId)
      router.push(`/chatting/${roomId}`)
    },
    onError: error => {
      setFormMessage(
        error instanceof Error
          ? error.message
          : '채팅방 이름과 카테고리를 확인한 뒤 다시 생성해주세요.',
      )
    },
  })

  if (!open) {
    return null
  }

  return (
    <Overlay
      onClick={() => {
        onClose()
      }}
    >
      <Card
        onClick={event => {
          event.stopPropagation()
        }}
      >
        <Header>
          <Title>채팅방 생성하기</Title>
          <Body>
            운영자와 예비 창업자가 바로 대화를 시작할 수 있도록 주제와 소개를
            간단히 정리합니다.
          </Body>
        </Header>

        <Fieldset>
          <Label htmlFor="chat-room-name">채팅방 이름</Label>
          <Input
            id="chat-room-name"
            value={nameValue}
            maxLength={MAX_NAME_LENGTH}
            placeholder="최대 20자"
            onChange={event => {
              setNameValue(event.target.value)
            }}
          />
          <Helper>
            {nameValue.length}/{MAX_NAME_LENGTH}자
          </Helper>
        </Fieldset>

        <Fieldset>
          <Label htmlFor="chat-room-introduction">채팅방 소개</Label>
          <TextArea
            id="chat-room-introduction"
            value={introductionValue}
            maxLength={MAX_INTRODUCTION_LENGTH}
            placeholder="대화 주제와 참여 대상 등을 적어 주세요."
            onChange={event => {
              setIntroductionValue(event.target.value)
            }}
          />
          <Helper>
            {introductionValue.length}/{MAX_INTRODUCTION_LENGTH}자
          </Helper>
        </Fieldset>

        <Fieldset>
          <Label htmlFor="chat-room-category">카테고리</Label>
          <Select
            id="chat-room-category"
            value={categoryValue}
            onChange={event => {
              setCategoryValue(event.target.value)
            }}
          >
            <option value="">카테고리를 선택해 주세요.</option>
            {chatRoomCategories
              .filter(category => category.value !== '')
              .map(category => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
          </Select>
        </Fieldset>

        <Fieldset>
          <Label htmlFor="chat-room-limit">최대 인원</Label>
          <Input
            id="chat-room-limit"
            type="number"
            min={2}
            max={600}
            value={limitValue}
            onChange={event => {
              setLimitValue(Number(event.target.value || 0))
            }}
          />
          <Helper>최소 2명, 최대 600명</Helper>
        </Fieldset>

        {formMessage ? <Notice $tone="error">{formMessage}</Notice> : null}

        <ActionRow>
          <PrimaryButton
            type="button"
            $disabled={!isValid || createRoomMutation.isPending}
            onClick={() => {
              if (!isValid || createRoomMutation.isPending) {
                return
              }

              setFormMessage(null)
              createRoomMutation.mutate()
            }}
          >
            {createRoomMutation.isPending ? '생성 중' : '채팅방 만들기'}
          </PrimaryButton>
          <SecondaryButton
            type="button"
            onClick={() => {
              onClose()
            }}
          >
            취소
          </SecondaryButton>
        </ActionRow>
      </Card>
    </Overlay>
  )
}
