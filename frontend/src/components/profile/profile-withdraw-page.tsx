'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import {
  CheckboxRow,
  PrimaryButton,
  SectionNotice,
  SectionPanel,
  SectionStack,
  SectionTitle,
  SectionBody,
} from '@/components/profile/profile-ui'
import { deleteAccount } from '@/lib/api/profile'
import { getApiMessage, isApiSuccess } from '@/lib/api/response'
import { logoutUser } from '@/lib/api/user'
import { useAuthStore } from '@/stores/auth-store'

export default function ProfileWithdrawPage() {
  const router = useRouter()
  const clearSession = useAuthStore(state => state.clearSession)
  const [agreed, setAgreed] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: deleteAccount,
    onSuccess: async response => {
      if (!isApiSuccess(response)) {
        setMessage(getApiMessage(response, '회원 탈퇴를 완료하지 못했습니다.'))
        return
      }

      try {
        await logoutUser()
      } catch {
        //
      }

      clearSession()
      router.push('/account-deleted')
    },
    onError: () => {
      setMessage('회원 탈퇴 요청 중 문제가 발생했습니다.')
    },
  })

  return (
    <SectionStack>
      <SectionPanel>
        <SectionTitle>회원 탈퇴</SectionTitle>
        <SectionBody>
          회원 탈퇴 후에는 계정 정보와 저장된 개인 데이터 복원이 불가능합니다.
          채팅, 북마크, 프로필 세션도 함께 정리됩니다.
        </SectionBody>
      </SectionPanel>

      <SectionPanel>
        {message ? (
          <SectionNotice $tone="error">{message}</SectionNotice>
        ) : null}
        <SectionNotice $tone="info">
          탈퇴 처리 후에는 동일 세션으로 복구할 수 없습니다. 운영 중 사용한 개인
          정보와 일부 저장 데이터는 영구 삭제됩니다.
        </SectionNotice>
        <CheckboxRow>
          <input
            type="checkbox"
            checked={agreed}
            onChange={event => setAgreed(event.target.checked)}
          />
          <span>안내 사항을 모두 확인했고 회원 탈퇴에 동의합니다.</span>
        </CheckboxRow>
        <PrimaryButton
          type="button"
          disabled={!agreed || mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending ? '탈퇴 처리 중...' : '회원 탈퇴하기'}
        </PrimaryButton>
      </SectionPanel>
    </SectionStack>
  )
}
