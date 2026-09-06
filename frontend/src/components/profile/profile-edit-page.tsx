'use client'

import { useRef, useState } from 'react'
import styled from 'styled-components'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import {
  ActionRow,
  Field,
  FieldLabel,
  Form,
  HelperText,
  SectionNotice,
  SectionPanel,
  SectionStack,
  SectionTitle,
  SectionBody,
  TextInput,
} from '@/components/profile/profile-ui'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { normalizeApiError } from '@/lib/api/api-error'
import {
  ProfileImageError,
  removeProfileImage,
  uploadProfileImage,
} from '@/lib/api/member-profile-image'
import { updateMyInfo } from '@/lib/api/profile'
import { getApiMessage, isApiSuccess } from '@/lib/api/response'
import {
  NICKNAME_MAX_LENGTH,
  NICKNAME_RULE_TEXT,
  isValidNickname,
} from '@/lib/auth/nickname-rules'
import {
  describeImageFileIssue,
  IMAGE_ACCEPT_ATTRIBUTE,
  IMAGE_RULE_TEXT,
  resolveUploadErrorMessage,
} from '@/lib/upload/image-rules'
import {
  invalidateMemberInfoQuery,
  writeMemberInfoQuery,
} from '@/lib/member-info-query'
import { useAuthStore } from '@/stores/auth-store'

const AccountSummary = styled.dl`
  display: grid;
  grid-template-columns: minmax(112px, 0.35fr) minmax(0, 1fr);
  margin: 20px 0 0;
  border-top: 1px solid var(--color-border-200);

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`

const AccountTerm = styled.dt`
  padding: 16px 12px;
  border-bottom: 1px solid var(--color-border-200);
  color: var(--color-text-500);
  font-size: 14px;
  font-weight: 600;

  @media (max-width: 640px) {
    padding-bottom: 4px;
    border-bottom: 0;
  }
`

const AccountDescription = styled.dd`
  min-width: 0;
  margin: 0;
  padding: 16px 12px;
  border-bottom: 1px solid var(--color-border-200);
  color: var(--color-text-900);
  overflow-wrap: anywhere;

  @media (max-width: 640px) {
    padding-top: 4px;
  }
`

const AccountRow = styled.div`
  display: contents;
`

const AvatarRow = styled.div`
  display: flex;
  align-items: center;
  gap: 20px;
  margin-top: 20px;

  @media (max-width: 640px) {
    flex-direction: column;
    align-items: flex-start;
  }
`

const Avatar = styled.div<{ $image?: string | null }>`
  flex: none;
  width: 84px;
  height: 84px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: ${props =>
    props.$image
      ? `url(${props.$image}) center / cover no-repeat`
      : 'var(--color-surface-muted)'};
  color: var(--color-text-700);
  font-size: 28px;
  font-weight: 700;
`

const AvatarControls = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
`

/**
 * 파일 입력은 화면에서 감추고 버튼이 대신 연다. `display: none` 이 아니라 이렇게 두는
 * 이유는 키보드 포커스와 스크린리더 접근을 남겨 두기 위해서다.
 */
const HiddenFileInput = styled.input`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
`

/**
 * 사진을 지울 수 있는가. **소셜 제공자 이미지는 우리가 지울 대상이 아니다.**
 *
 * `GET /members/me` 의 `profileImageUrl` 은 직접 업로드본이 있으면 그 URL, 없으면 소셜
 * 제공자 URL 이다(`file-upload-guide.md`). 즉 URL 이 있다고 곧 "우리가 저장한 파일이
 * 있다"는 뜻이 아니다 — 소셜 계정에 사진이 있고 업로드는 안 한 사용자에게 「사진 삭제」를
 * 보여 주면, 눌러 봐야 아무것도 지워지지 않거나 서버가 거절한다.
 *
 * ⚠️ **응답에는 둘을 구분할 필드가 없다**(`profileImageKey` 는 업로드 응답에만 있다).
 * 그래서 소셜 계정이면 삭제 버튼을 **이번 세션에서 실제로 올린 뒤에만** 연다.
 * 일반 계정은 URL 이 곧 업로드본이므로 그대로 연다. 정확한 판별을 원하면 백엔드가
 * `GET /members/me` 에 `hasUploadedProfileImage` 같은 필드를 주어야 한다.
 */
export const canRemoveProfileImage = (
  memberInfo: { provider: string | null; profileImageUrl: string } | null,
  uploadedInThisSession: boolean,
): boolean => {
  if (!memberInfo) return false
  if (uploadedInThisSession) return true
  if (!memberInfo.profileImageUrl) return false

  return !memberInfo.provider
}

/**
 * 저장을 열어도 되는가. **길이 규칙과 "달라졌는가"를 함께 본다.**
 *
 * A2 는 못 누르는 이유를 문구로 함께 냈지만(`describeNewPasswordIssue`) 여기서는
 * 그러지 않는다. 이 폼은 열자마자 **지금 닉네임을 그대로 보여 주고**, 입력은
 * `maxLength` 로 서버 한계에서 잘린다 — 못 누르는 경우가 "아직 안 바꿨다" 와
 * "다 지웠다" 둘뿐이고, 둘 다 입력칸을 보면 이미 알 수 있다. 같은 것을 빨간 글씨로
 * 한 번 더 말하면 정작 읽어야 할 길이 규칙이 그 자리에서 밀려난다.
 *
 * 그래도 `isValidNickname` 을 여기서 다시 보는 이유: `maxLength` 는 브라우저의 편의일
 * 뿐이라(IME 조합·자동완성이 넘길 수 있다) 제출 판정을 거기에 맡기지 않는다.
 */
export const canSubmitNickname = (
  nickname: string,
  currentNickname: string,
): boolean => {
  const trimmed = nickname.trim()
  return isValidNickname(trimmed) && trimmed !== currentNickname
}

export default function ProfileEditPage() {
  const memberInfo = useAuthStore(state => state.memberInfo)
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [uploadedInThisSession, setUploadedInThisSession] = useState(false)
  const [nicknameError, setNicknameError] = useState<string | null>(null)

  const memberId = memberInfo?.memberId ?? null
  const currentNickname = memberInfo?.nickname ?? ''

  /*
   * 입력칸은 **지금 닉네임에서 출발한다.** 그런데 회원 정보는 이 컴포넌트보다 늦게
   * 도착하고(스토어 hydrate), 저장에 성공하면 또 한 번 바뀐다. 초기값으로만 두면 둘 다
   * 놓쳐 빈 칸이나 옛 값이 남는다.
   *
   * 그래서 씨앗이 된 값을 함께 들고 있다가 서버 값이 달라지면 렌더 중에 다시 심는다
   * (React 의 "props 가 바뀔 때 state 조정" 패턴). 저장 직후에는 방금 저장한 값이
   * 그대로 다시 심기고, 편집 중이던 내용은 서버가 실제로 바뀐 그 순간에만 버려진다.
   */
  const [nicknameSeed, setNicknameSeed] = useState(currentNickname)
  const [nickname, setNickname] = useState(currentNickname)

  if (nicknameSeed !== currentNickname) {
    setNicknameSeed(currentNickname)
    setNickname(currentNickname)
  }

  const canSaveNickname = canSubmitNickname(nickname, currentNickname)

  /*
   * 성공 후 회원 정보를 무효화하면 `ProfileShell` 의 쿼리가 다시 돌고, 그 결과가
   * `setSession` 으로 스토어에 들어가 **사이드바와 헤더 아바타가 같이 갱신된다.**
   * 여기서 URL 만 지역 상태로 들고 있으면 헤더는 옛 사진을 계속 보여 준다.
   */
  const refreshMemberInfo = async () => {
    if (memberId) await invalidateMemberInfoQuery(queryClient, memberId)
  }

  const handleFailure = (error: unknown) => {
    const code = error instanceof ProfileImageError ? error.code : null
    const raw =
      error instanceof Error
        ? error.message
        : '요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.'

    setErrorMessage(resolveUploadErrorMessage(code, raw))
  }

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      setErrorMessage(null)
      await uploadProfileImage(file)
    },
    onSuccess: async () => {
      setUploadedInThisSession(true)
      await refreshMemberInfo()
      showToast({ message: '프로필 사진을 변경했어요.', tone: 'success' })
    },
    onError: handleFailure,
  })

  const removeMutation = useMutation({
    mutationFn: async () => {
      setErrorMessage(null)
      await removeProfileImage()
    },
    onSuccess: async () => {
      setUploadedInThisSession(false)
      await refreshMemberInfo()
      showToast({ message: '프로필 사진을 지웠어요.', tone: 'success' })
    },
    onError: handleFailure,
  })

  /**
   * 닉네임 저장. 응답이 **수정된 회원 정보 전체**라 다시 조회하지 않고 캐시에 심는다 —
   * 그 값이 `ProfileShell` 을 거쳐 스토어까지 흘러 헤더·사이드바의 닉네임도 함께 바뀐다.
   *
   * 실패 문구는 **서버가 준 것을 그대로 쓴다**(`MEMBER_108` 필수 · `MEMBER_109` 10자).
   * 화면이 문구를 따로 지어내면 서버 규칙이 바뀔 때 둘이 어긋난다.
   */
  const nicknameMutation = useMutation({
    mutationFn: () => {
      setNicknameError(null)
      return updateMyInfo(nickname.trim())
    },
    onSuccess: async response => {
      // 이 백엔드는 200 에 `success: false` 를 싣는 경우가 있어 본문까지 본다.
      if (!isApiSuccess(response) || !response.dataBody) {
        setNicknameError(getApiMessage(response, '닉네임을 바꾸지 못했어요.'))
        return
      }

      if (memberId) {
        writeMemberInfoQuery(queryClient, memberId, response)
      } else {
        /*
         * memberId 를 모르면 어느 키에 심을지 알 수 없다. 실제로는 여기까지 오면
         * 로그인 상태가 아니라는 뜻이라 도달하지 않지만, 조용히 옛 값을 남기느니
         * 다음 조회 때 서버에서 다시 받게 둔다.
         */
        await refreshMemberInfo()
      }

      showToast({ message: '닉네임을 변경했어요.', tone: 'success' })
    },
    onError: error => setNicknameError(normalizeApiError(error).message),
  })

  const isBusy = uploadMutation.isPending || removeMutation.isPending

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    /*
     * 같은 파일을 다시 골랐을 때도 onChange 가 나도록 값을 비운다. 안 그러면 실패 뒤
     * 같은 파일로 재시도하는 흔한 동작이 아무 반응 없이 먹힌다.
     */
    event.target.value = ''
    if (!file) return

    const issue = describeImageFileIssue(file)
    if (issue) {
      // 뻔한 실패에 5MB 를 왕복시키지 않는다. 진짜 판정은 서버의 매직 바이트 검사다.
      setErrorMessage(issue)
      return
    }

    uploadMutation.mutate(file)
  }

  if (!memberInfo) {
    return (
      <SectionStack>
        <SectionNotice $tone="info">
          프로필 정보를 준비하는 중입니다.
        </SectionNotice>
      </SectionStack>
    )
  }

  /*
   * 닉네임은 여기서 빠졌다 — 바로 위 패널이 **고칠 수 있는 자리**로 같은 값을 보여
   * 주기 때문이다. 읽기 전용 행과 입력칸에 같은 값을 두 번 두면, 편집 중에 어느 쪽이
   * 진짜인지 읽는 사람이 판단해야 한다.
   */
  const accountItems = [
    ['이메일', memberInfo.email],
    ['이름', memberInfo.name],
    ['회원 유형', memberInfo.role?.description ?? '일반 회원'],
  ] as const

  const avatarLabel = memberInfo.nickname?.slice(0, 1) ?? 'N'
  const canRemove = canRemoveProfileImage(memberInfo, uploadedInThisSession)

  return (
    <SectionStack>
      <SectionPanel>
        <SectionTitle>프로필 사진</SectionTitle>
        <SectionBody>
          고른 사진은 바로 반영돼요. 기존 사진이 있으면 새 사진으로 교체돼요.
        </SectionBody>

        <AvatarRow>
          <Avatar $image={memberInfo.profileImageUrl} aria-hidden="true">
            {memberInfo.profileImageUrl ? null : avatarLabel}
          </Avatar>

          <AvatarControls>
            <HiddenFileInput
              ref={fileInputRef}
              type="file"
              accept={IMAGE_ACCEPT_ATTRIBUTE}
              onChange={handleFileChange}
              disabled={isBusy}
              aria-label="프로필 사진 파일 선택"
            />
            <ActionRow>
              <Button
                type="button"
                size="medium"
                onClick={() => fileInputRef.current?.click()}
                disabled={isBusy}
                isLoading={uploadMutation.isPending}
              >
                사진 올리기
              </Button>
              {canRemove ? (
                <Button
                  type="button"
                  size="medium"
                  variant="secondary"
                  onClick={() => removeMutation.mutate()}
                  disabled={isBusy}
                  isLoading={removeMutation.isPending}
                >
                  사진 지우기
                </Button>
              ) : null}
            </ActionRow>
            <HelperText>{IMAGE_RULE_TEXT}</HelperText>
          </AvatarControls>
        </AvatarRow>

        {errorMessage ? (
          <SectionNotice $tone="error" role="alert">
            {errorMessage}
          </SectionNotice>
        ) : null}
      </SectionPanel>

      <SectionPanel>
        <SectionTitle>닉네임</SectionTitle>
        <SectionBody>
          닉네임은 커뮤니티 글·댓글과 헤더에 함께 보여요.
        </SectionBody>

        <Form
          onSubmit={event => {
            event.preventDefault()
            if (canSaveNickname && !nicknameMutation.isPending) {
              nicknameMutation.mutate()
            }
          }}
        >
          <Field>
            <FieldLabel>닉네임</FieldLabel>
            <TextInput
              type="text"
              value={nickname}
              onChange={event => setNickname(event.target.value)}
              /*
               * 서버 한계와 같은 값으로 입력 자체를 막는다. 잘린 줄 모르는 일이
               * 없도록 규칙 문구를 아래에 항상 띄워 둔다.
               */
              maxLength={NICKNAME_MAX_LENGTH}
              autoComplete="nickname"
              aria-label="닉네임"
            />
          </Field>

          <HelperText>{NICKNAME_RULE_TEXT}</HelperText>

          {nicknameError ? (
            <SectionNotice $tone="error" role="alert">
              {nicknameError}
            </SectionNotice>
          ) : null}

          <ActionRow>
            <Button
              type="submit"
              size="medium"
              disabled={!canSaveNickname || nicknameMutation.isPending}
              isLoading={nicknameMutation.isPending}
            >
              닉네임 변경
            </Button>
          </ActionRow>
        </Form>
      </SectionPanel>

      <SectionPanel>
        <SectionTitle>회원 정보</SectionTitle>
        <SectionBody>
          현재 V2 회원 API에서 확인할 수 있는 계정 정보입니다.
        </SectionBody>
        <AccountSummary>
          {accountItems.map(([label, value]) => (
            <AccountRow key={label}>
              <AccountTerm>{label}</AccountTerm>
              <AccountDescription>{value}</AccountDescription>
            </AccountRow>
          ))}
        </AccountSummary>
      </SectionPanel>
    </SectionStack>
  )
}
