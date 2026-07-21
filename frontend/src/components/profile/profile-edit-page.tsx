'use client'

import { useRef, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import styled from 'styled-components'
import {
  ActionRow,
  Field,
  FieldLabel,
  Form,
  HelperText,
  PrimaryButton,
  SectionNotice,
  SectionPanel,
  SectionStack,
  SectionTitle,
  SectionBody,
  SecondaryButton,
  TextInput,
} from '@/components/profile/profile-ui'
import { updateMemberInfo, uploadProfileImage } from '@/lib/api/profile'
import { getApiMessage, isApiSuccess } from '@/lib/api/response'
import { useAuthStore } from '@/stores/auth-store'

const PreviewWrap = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  align-items: center;
`

const PreviewImage = styled.div<{ $image?: string | null }>`
  width: 96px;
  height: 96px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: ${props =>
    props.$image
      ? `url(${props.$image}) center / cover no-repeat`
      : 'var(--color-surface-muted)'};
  color: var(--color-text-700);
  font-size: 30px;
  font-weight: 700;
`

type ProfileEditFormProps = {
  memberInfo: NonNullable<
    ReturnType<typeof useAuthStore.getState>['memberInfo']
  >
}

function ProfileEditForm({ memberInfo }: ProfileEditFormProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const setStoreSession = useAuthStore(state => state.setSession)
  const [nickname, setNickname] = useState(memberInfo?.nickname ?? '')
  const [profileImage, setProfileImage] = useState(
    memberInfo?.profileImageUrl ?? null,
  )
  const [message, setMessage] = useState<{
    tone: 'error' | 'success' | 'info'
    text: string
  } | null>(null)

  const uploadMutation = useMutation({
    mutationFn: uploadProfileImage,
    onSuccess: response => {
      if (!isApiSuccess(response) || !response.dataBody) {
        setMessage({
          tone: 'error',
          text: getApiMessage(
            response,
            '프로필 이미지를 업로드하지 못했습니다.',
          ),
        })
        return
      }

      setProfileImage(response.dataBody)
      setMessage({
        tone: 'success',
        text: '이미지가 업로드되었습니다. 저장 버튼으로 변경 내용을 반영하세요.',
      })
    },
    onError: () => {
      setMessage({
        tone: 'error',
        text: '이미지 파일을 확인한 뒤 다시 업로드해주세요.',
      })
    },
  })

  const updateMutation = useMutation({
    mutationFn: updateMemberInfo,
    onSuccess: response => {
      if (!isApiSuccess(response) || !memberInfo) {
        setMessage({
          tone: 'error',
          text: getApiMessage(response, '프로필 정보를 수정하지 못했습니다.'),
        })
        return
      }

      setStoreSession({
        ...memberInfo,
        nickname,
        profileImageUrl: profileImage ?? '',
      })
      setMessage({
        tone: 'success',
        text: '프로필 정보가 업데이트되었습니다.',
      })
    },
    onError: () => {
      setMessage({
        tone: 'error',
        text: '닉네임과 이미지를 확인한 뒤 다시 저장해주세요.',
      })
    },
  })

  if (!memberInfo) {
    return (
      <SectionStack>
        <SectionNotice $tone="info">
          프로필 정보를 준비하는 중입니다.
        </SectionNotice>
      </SectionStack>
    )
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    const formData = new FormData()
    formData.append('file', file)
    formData.append('fileName', file.name)
    uploadMutation.mutate(formData)
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setMessage(null)

    updateMutation.mutate({
      nickname,
      profileImage: profileImage ?? '',
    })
  }

  return (
    <SectionStack>
      <SectionPanel>
        <SectionTitle>회원 정보 수정</SectionTitle>
        <SectionBody>
          프로필 이미지는 업로드 후 저장 버튼을 눌러 최종 반영합니다. 소셜
          가입자는 이메일과 공급자 정보는 유지됩니다.
        </SectionBody>
      </SectionPanel>

      <SectionPanel>
        {message ? (
          <SectionNotice $tone={message.tone}>{message.text}</SectionNotice>
        ) : null}
        <Form onSubmit={handleSubmit}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={handleFileChange}
          />
          <PreviewWrap>
            <PreviewImage $image={profileImage}>
              {profileImage ? null : memberInfo.nickname.slice(0, 1)}
            </PreviewImage>
            <div>
              <FieldLabel>{memberInfo.email}</FieldLabel>
              <HelperText>{memberInfo.role?.description}</HelperText>
              <ActionRow>
                <SecondaryButton
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                >
                  이미지 선택
                </SecondaryButton>
              </ActionRow>
            </div>
          </PreviewWrap>

          <Field>
            <FieldLabel>닉네임</FieldLabel>
            <TextInput
              type="text"
              value={nickname}
              onChange={event => setNickname(event.target.value)}
            />
          </Field>

          <PrimaryButton type="submit" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? '저장 중...' : '수정사항 저장'}
          </PrimaryButton>
        </Form>
      </SectionPanel>
    </SectionStack>
  )
}

export default function ProfileEditPage() {
  const memberInfo = useAuthStore(state => state.memberInfo)

  if (!memberInfo) {
    return (
      <SectionStack>
        <SectionNotice $tone="info">
          프로필 정보를 준비하는 중입니다.
        </SectionNotice>
      </SectionStack>
    )
  }

  return <ProfileEditForm key={memberInfo.email} memberInfo={memberInfo} />
}
