'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import {
  ActionRow,
  CheckboxRow,
  Field,
  FieldLabel,
  Form,
  HelperText,
  SectionBody,
  SectionNotice,
  SectionPanel,
  SectionStack,
  SectionTitle,
  TextInput,
} from '@/components/profile/profile-ui'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import {
  MemberPasswordError,
  requestPasswordChange,
  requestPasswordRemoval,
  requestPasswordSetup,
} from '@/lib/api/member-password'
import {
  isStaleMemberStateCode,
  resolveMemberPasswordMode,
  resolvePasswordErrorMessage,
} from '@/lib/auth/member-password-state'
import { PASSWORD_PATTERN, PASSWORD_RULE_TEXT } from '@/lib/auth/password-rules'
import { clearMemberInfoQuery } from '@/lib/member-info-query'
import { clearMemberBookmarksQuery } from '@/lib/recommend/recommend-bookmarks'
import { useAuthStore } from '@/stores/auth-store'

/**
 * 변경이 실제로 무엇을 하는지. 백엔드 설명을 그대로 옮긴다
 * ("변경 후 재로그인이 필요하며, 모든 기기의 토큰 재발급이 차단됩니다").
 * **누르기 전에** 알려야 사용자가 갑작스러운 로그아웃을 사고로 읽지 않는다.
 */
export const PASSWORD_CHANGE_NOTICE =
  '비밀번호를 바꾸면 모든 기기에서 다시 로그인해야 해요.'

export const PASSWORD_SETUP_NOTICE =
  '설정하면 이메일 로그인과 소셜 로그인을 모두 쓸 수 있어요. 지금 로그인은 그대로 유지돼요.'

/** 소셜 전용 전환의 결과. 되돌릴 수는 있지만 **지금 잃는 것**을 먼저 적는다. */
export const SOCIAL_ONLY_CONSEQUENCES = [
  '이메일과 비밀번호로는 더 이상 로그인할 수 없어요.',
  '로그인한 모든 기기에서 로그아웃돼요.',
  '나중에 이 화면에서 비밀번호를 다시 설정할 수 있어요.',
] as const

/**
 * 새 비밀번호가 아직 제출할 수 없는 이유. 없으면 `null`.
 *
 * 버튼만 비활성으로 두면 사용자는 **왜** 안 눌리는지 모른 채 같은 값을 다시 넣는다.
 * 그래서 비활성과 이유를 한 함수에서 낸다 — 둘이 갈라지면 "이유는 없는데 안 눌리는"
 * 상태가 생긴다.
 */
export const describeNewPasswordIssue = (
  newPassword: string,
  confirmation: string,
): string | null => {
  if (!newPassword) return null
  if (!PASSWORD_PATTERN.test(newPassword)) return PASSWORD_RULE_TEXT
  if (confirmation && newPassword !== confirmation) {
    return '새 비밀번호가 서로 달라요.'
  }
  return null
}

export const canSubmitNewPassword = (
  newPassword: string,
  confirmation: string,
): boolean => PASSWORD_PATTERN.test(newPassword) && newPassword === confirmation

export default function ProfileChangePasswordPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  const memberInfo = useAuthStore(state => state.memberInfo)
  const hasHydrated = useAuthStore(state => state.hasHydrated)
  const hydrate = useAuthStore(state => state.hydrate)
  const clearSession = useAuthStore(state => state.clearSession)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [agreedToSocialOnly, setAgreedToSocialOnly] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const memberId = memberInfo?.memberId ?? null
  const mode = resolveMemberPasswordMode(memberInfo)
  const issue = describeNewPasswordIssue(newPassword, confirmation)
  const canSubmit = canSubmitNewPassword(newPassword, confirmation)

  /** 로그아웃과 같은 순서: 회원 캐시 → 스토어 → 이동. 토스트는 이동 뒤에도 살아 있다. */
  const endSessionAndLeave = async (path: string, message: string) => {
    if (memberId) {
      await Promise.all([
        clearMemberBookmarksQuery(queryClient, memberId),
        clearMemberInfoQuery(queryClient, memberId),
      ])
    }
    clearSession()
    showToast({ message, tone: 'success' })
    router.replace(path)
  }

  /**
   * 실패 처리. `MEMBER_007/008/009` 는 **화면이 이미 걸러 냈어야 하는** 경우라,
   * 왔다면 들고 있는 계정 정보가 낡았다는 뜻이다 — 문구를 갈아 끼우는 데서 끝내지
   * 않고 정보를 **다시 받아** 화면을 다시 가른다.
   */
  const handleFailure = (error: unknown) => {
    const code = error instanceof MemberPasswordError ? error.code : null
    const raw =
      error instanceof Error
        ? error.message
        : '요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.'

    setErrorMessage(resolvePasswordErrorMessage(code, raw))

    if (isStaleMemberStateCode(code)) {
      if (memberId) void clearMemberInfoQuery(queryClient, memberId)
      void hydrate()
    }
  }

  const changeMutation = useMutation({
    mutationFn: async () => {
      setErrorMessage(null)
      await requestPasswordChange({ currentPassword, newPassword })
    },
    // 서버 세션은 라우트가 이미 파괴했다. 여기서는 이 브라우저에 남은 흔적을 지운다.
    onSuccess: () =>
      endSessionAndLeave(
        '/login',
        '비밀번호를 변경했어요. 새 비밀번호로 다시 로그인해 주세요.',
      ),
    onError: handleFailure,
  })

  const setupMutation = useMutation({
    mutationFn: async () => {
      setErrorMessage(null)
      await requestPasswordSetup({ newPassword })
    },
    onSuccess: async () => {
      /*
       * **세션을 유지한다.** 백엔드가 토큰을 건드리지 않았으므로 로그아웃시킬 이유가
       * 없다. 대신 `hasPassword` 가 바뀌었으니 회원 정보를 다시 받아 화면을 다시
       * 가른다 — 안 하면 방금 설정한 사용자에게 설정 폼이 계속 보인다.
       */
      setNewPassword('')
      setConfirmation('')
      if (memberId) await clearMemberInfoQuery(queryClient, memberId)
      await hydrate()
      showToast({ message: '비밀번호를 설정했어요.', tone: 'success' })
    },
    onError: handleFailure,
  })

  const removalMutation = useMutation({
    mutationFn: async () => {
      setErrorMessage(null)
      await requestPasswordRemoval()
    },
    onSuccess: () =>
      endSessionAndLeave(
        '/',
        '소셜 전용 계정으로 전환했어요. 이제 소셜 로그인으로만 로그인할 수 있어요.',
      ),
    onError: handleFailure,
  })

  const isBusy =
    changeMutation.isPending ||
    setupMutation.isPending ||
    removalMutation.isPending

  const errorNotice = errorMessage ? (
    <SectionNotice $tone="error" role="alert">
      {errorMessage}
    </SectionNotice>
  ) : null

  if (!hasHydrated) {
    return (
      <SectionStack>
        <SectionPanel>
          <SectionTitle>비밀번호</SectionTitle>
          <SectionBody>계정 정보를 불러오는 중이에요.</SectionBody>
        </SectionPanel>
      </SectionStack>
    )
  }

  /*
   * 비밀번호도 소셜도 없는 계정은 이론상 없다(로그인할 수단이 없다). 그래도 여기까지
   * 왔다면 어느 폼을 줘도 백엔드가 400 을 돌려준다 — 실패가 뻔한 입력을 시키지 않는다.
   */
  if (mode === 'unknown') {
    return (
      <SectionStack>
        <SectionPanel>
          <SectionTitle>비밀번호</SectionTitle>
          <SectionBody>
            계정 상태를 확인하지 못했어요. 새로고침한 뒤에도 같으면 고객센터로
            알려 주세요.
          </SectionBody>
          {errorNotice}
        </SectionPanel>
      </SectionStack>
    )
  }

  if (mode === 'setup') {
    return (
      <SectionStack>
        <SectionPanel>
          <SectionTitle>비밀번호 설정</SectionTitle>
          <SectionBody>
            {memberInfo?.provider} 로그인으로 가입한 계정이라 아직 비밀번호가
            없어요. {PASSWORD_SETUP_NOTICE}
          </SectionBody>

          <Form
            onSubmit={event => {
              event.preventDefault()
              if (canSubmit && !isBusy) setupMutation.mutate()
            }}
          >
            <Field>
              <FieldLabel>새 비밀번호</FieldLabel>
              <TextInput
                type="password"
                value={newPassword}
                onChange={event => setNewPassword(event.target.value)}
                autoComplete="new-password"
                aria-label="새 비밀번호"
              />
            </Field>

            <Field>
              <FieldLabel>새 비밀번호 확인</FieldLabel>
              <TextInput
                type="password"
                value={confirmation}
                onChange={event => setConfirmation(event.target.value)}
                autoComplete="new-password"
                aria-label="새 비밀번호 확인"
              />
            </Field>

            <HelperText>{issue ?? PASSWORD_RULE_TEXT}</HelperText>
            {errorNotice}

            <ActionRow>
              <Button
                type="submit"
                size="medium"
                disabled={!canSubmit || isBusy}
                isLoading={setupMutation.isPending}
              >
                비밀번호 설정
              </Button>
            </ActionRow>
          </Form>
        </SectionPanel>
      </SectionStack>
    )
  }

  return (
    <SectionStack>
      <SectionPanel>
        <SectionTitle>비밀번호 변경</SectionTitle>
        <SectionBody>{PASSWORD_CHANGE_NOTICE}</SectionBody>

        <Form
          onSubmit={event => {
            event.preventDefault()
            if (currentPassword && canSubmit && !isBusy) {
              changeMutation.mutate()
            }
          }}
        >
          <Field>
            <FieldLabel>현재 비밀번호</FieldLabel>
            <TextInput
              type="password"
              value={currentPassword}
              onChange={event => setCurrentPassword(event.target.value)}
              autoComplete="current-password"
              aria-label="현재 비밀번호"
            />
          </Field>

          <Field>
            <FieldLabel>새 비밀번호</FieldLabel>
            <TextInput
              type="password"
              value={newPassword}
              onChange={event => setNewPassword(event.target.value)}
              autoComplete="new-password"
              aria-label="새 비밀번호"
            />
          </Field>

          <Field>
            <FieldLabel>새 비밀번호 확인</FieldLabel>
            <TextInput
              type="password"
              value={confirmation}
              onChange={event => setConfirmation(event.target.value)}
              autoComplete="new-password"
              aria-label="새 비밀번호 확인"
            />
          </Field>

          <HelperText>{issue ?? PASSWORD_RULE_TEXT}</HelperText>
          {errorNotice}

          <ActionRow>
            <Button
              type="submit"
              size="medium"
              disabled={!currentPassword || !canSubmit || isBusy}
              isLoading={changeMutation.isPending}
            >
              비밀번호 변경
            </Button>
          </ActionRow>
        </Form>
      </SectionPanel>

      {mode === 'change-with-unlink' ? (
        <SectionPanel>
          <SectionTitle>소셜 전용 계정으로 전환</SectionTitle>
          <SectionBody>
            비밀번호를 없애고 {memberInfo?.provider} 로그인만 쓰도록 바꿔요.
          </SectionBody>
          <ul>
            {SOCIAL_ONLY_CONSEQUENCES.map(line => (
              <SectionBody as="li" key={line}>
                {line}
              </SectionBody>
            ))}
          </ul>

          <Form
            onSubmit={event => {
              event.preventDefault()
              if (agreedToSocialOnly && !isBusy) removalMutation.mutate()
            }}
          >
            {/*
             * 마찰은 **체크박스 하나**다. A1(탈퇴)은 이메일을 직접 적게 했지만 그쪽은
             * 되돌릴 수 없다. 이 동작은 위 폼에서 비밀번호를 다시 설정하면 원래대로
             * 돌아온다 — 되돌릴 수 있는 동작에 타이핑을 요구하면 오클릭을 더 막지도
             * 못하면서 사용자를 괴롭힌다. 대신 **무엇을 잃는지 읽었다**는 확인은
             * 받는다(체크 문구가 곧 결과다).
             */}
            <CheckboxRow>
              <input
                type="checkbox"
                checked={agreedToSocialOnly}
                onChange={event => setAgreedToSocialOnly(event.target.checked)}
              />
              이메일 로그인을 더 이상 쓸 수 없고, 모든 기기에서 로그아웃되는
              것을 이해했어요.
            </CheckboxRow>

            <ActionRow>
              <Button
                type="submit"
                size="medium"
                variant="secondary"
                disabled={!agreedToSocialOnly || isBusy}
                isLoading={removalMutation.isPending}
              >
                소셜 전용으로 전환
              </Button>
            </ActionRow>
          </Form>
        </SectionPanel>
      ) : null}
    </SectionStack>
  )
}
