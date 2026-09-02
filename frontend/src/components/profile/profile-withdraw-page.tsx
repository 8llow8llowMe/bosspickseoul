'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import {
  ActionRow,
  Field,
  FieldLabel,
  Form,
  SectionBody,
  SectionNotice,
  SectionPanel,
  SectionStack,
  SectionTitle,
  TextInput,
} from '@/components/profile/profile-ui'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { requestMemberWithdraw } from '@/lib/api/member-withdraw'
import { clearMemberInfoQuery } from '@/lib/member-info-query'
import { clearMemberBookmarksQuery } from '@/lib/recommend/recommend-bookmarks'
import { useAuthStore } from '@/stores/auth-store'

/**
 * 탈퇴가 실제로 무엇을 하는지. **백엔드 설명을 그대로 옮긴다** — 화면이 결과를
 * 부드럽게 고쳐 쓰면 사용자가 되돌릴 수 있다고 오해한다.
 */
export const WITHDRAW_CONSEQUENCES = [
  '개인 정보가 즉시 마스킹되고 복구할 수 없어요.',
  '로그인한 모든 기기에서 로그아웃돼요.',
  '같은 이메일로는 다시 가입할 수 없어요.',
] as const

/**
 * 탈퇴 버튼을 열어 줄지. **백엔드는 비밀번호를 요구하지 않는다**(요청 본문이 없다)
 * — 오클릭 방지는 전적으로 화면 몫이라 자기 이메일을 직접 적게 한다. 「이 이메일로
 * 재가입 불가」라는 결과를 가장 정확히 전달하는 마찰이기도 하다.
 *
 * 공백·대소문자는 눈감아 준다. 자동완성이 흔히 섞어 넣는 것이고, 그걸로 막아 봐야
 * 사용자를 괴롭힐 뿐 오클릭을 더 막지는 못한다.
 */
export const canConfirmWithdraw = (
  input: string,
  email: string | null | undefined,
): boolean => {
  const target = email?.trim().toLowerCase()
  if (!target) return false

  return input.trim().toLowerCase() === target
}

export default function ProfileWithdrawPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  const memberInfo = useAuthStore(state => state.memberInfo)
  const clearSession = useAuthStore(state => state.clearSession)
  const [confirmation, setConfirmation] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const email = memberInfo?.email ?? null
  const memberId = memberInfo?.memberId ?? null
  const canConfirm = canConfirmWithdraw(confirmation, email)

  const withdrawMutation = useMutation({
    mutationFn: async () => {
      setErrorMessage(null)
      await requestMemberWithdraw()
    },
    onSuccess: async () => {
      /*
       * 세션 파괴는 라우트가 서버에서 이미 했다. 여기서는 이 브라우저에 남은
       * 흔적을 지운다 — 로그아웃과 같은 순서다(회원 캐시 → 스토어 → 이동).
       */
      if (memberId) {
        await Promise.all([
          clearMemberBookmarksQuery(queryClient, memberId),
          clearMemberInfoQuery(queryClient, memberId),
        ])
      }
      clearSession()
      showToast({ message: '탈퇴가 완료되었어요.', tone: 'success' })
      router.replace('/')
    },
    onError: (error: unknown) => {
      // 실패했으면 계정이 살아 있다. 세션을 건드리지 않고 재시도할 수 있게 둔다.
      setErrorMessage(
        error instanceof Error
          ? error.message
          : '탈퇴에 실패했어요. 잠시 후 다시 시도해 주세요.',
      )
    },
  })

  return (
    <SectionStack>
      <SectionPanel>
        <SectionTitle>회원 탈퇴</SectionTitle>
        <SectionBody>
          탈퇴하면 아래 내용이 바로 적용돼요. 계속하기 전에 확인해 주세요.
        </SectionBody>
        <ul>
          {WITHDRAW_CONSEQUENCES.map(line => (
            <SectionBody as="li" key={line}>
              {line}
            </SectionBody>
          ))}
        </ul>
      </SectionPanel>

      <SectionPanel>
        <Form
          onSubmit={event => {
            event.preventDefault()
            if (canConfirm && !withdrawMutation.isPending) {
              withdrawMutation.mutate()
            }
          }}
        >
          <Field>
            <FieldLabel>
              확인을 위해 {email ?? '가입한 이메일'}을 입력해 주세요
            </FieldLabel>
            <TextInput
              value={confirmation}
              onChange={event => setConfirmation(event.target.value)}
              placeholder={email ?? ''}
              autoComplete="off"
              spellCheck={false}
              aria-label="탈퇴 확인용 이메일"
            />
          </Field>

          {errorMessage ? (
            <SectionNotice $tone="error" role="alert">
              {errorMessage}
            </SectionNotice>
          ) : null}

          <ActionRow>
            <Button
              type="submit"
              size="medium"
              variant="secondary"
              disabled={!canConfirm || withdrawMutation.isPending}
              isLoading={withdrawMutation.isPending}
            >
              회원 탈퇴
            </Button>
          </ActionRow>
        </Form>
      </SectionPanel>
    </SectionStack>
  )
}
