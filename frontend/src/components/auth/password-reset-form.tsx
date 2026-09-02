'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import styled from 'styled-components'

import AuthShell, {
  AuthForm,
  Field,
  FieldError,
  FieldLabel,
  FooterLink,
  FooterRow,
  Notice,
  PrimaryButton,
  TextInput,
} from '@/components/auth/auth-shell'
import GuestOnly from '@/components/auth/guest-only'
import { getAuthErrorMessage } from '@/lib/api/auth-errors'
import { PASSWORD_RULE_TEXT } from '@/lib/auth/password-rules'
import {
  canSubmitReset,
  describeResetPasswordIssue,
  isResetCodeInvalidated,
  isValidResetEmail,
  RESET_CODE_COOLDOWN,
  type PasswordResetStep,
} from '@/lib/auth/password-reset-machine'
import {
  RESEND_COOLDOWN_SECONDS,
  RESET_CODE_TTL_MINUTES,
} from '@/lib/auth/verification-cooldown'
import type { ApiResponse } from '@/types/api'

const NETWORK_ERROR_MESSAGE = '네트워크 상태를 확인한 뒤 다시 시도해 주세요.'

/* 회원가입 화면의 재전송 줄과 같은 모양을 쓴다 — 같은 동작이 다르게 보일 이유가 없다. */
const ResendRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
`

const ResendButton = styled.button`
  border: none;
  background: none;
  padding: 0;
  color: var(--color-primary-700);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;

  &:disabled {
    color: var(--color-text-500);
    cursor: not-allowed;
  }
`

const HelperText = styled.p`
  color: var(--color-text-500);
  font-size: 13px;
  line-height: 20px;
`

/**
 * 코드가 오지 않을 수 있다는 사실을 **미리** 적는다.
 *
 * 백엔드는 계정 존재 여부를 숨기려고 **어떤 이메일에도 성공으로 응답한다.** 대신
 * 미가입 이메일과 소셜 전용 계정에는 코드가 아니라 각각 다른 **안내 메일**이 간다
 * (`PasswordResetProcessorTest`: `notRegisteredMails` / `socialOnlyMails`).
 *
 * 그래서 "메일을 보냈어요" 만 적으면, 그 두 경우의 사용자는 오지 않을 코드를 기다리며
 * 재전송만 반복한다. 화면은 **어느 경우인지 말해서는 안 되지만**(그게 곧 계정 존재
 * 여부 노출이다) "코드가 아니라 안내 메일이 갈 수도 있다"는 **일반적인 사실**은
 * 말할 수 있다. 그것이 노출 없이 막다른 골목을 없애는 유일한 방법이다.
 */
export const CODE_MAY_NOT_ARRIVE_NOTICE =
  '가입되지 않은 이메일이거나 소셜 로그인 전용 계정이라면 인증코드 대신 안내 메일이 도착해요. 메일 내용을 확인해 주세요.'

export const SESSION_RESET_NOTICE =
  '재설정하면 로그인된 모든 기기에서 다시 로그인해야 해요.'

const parseJsonResponse = async (
  response: Response,
): Promise<ApiResponse<unknown> | null> => {
  try {
    return (await response.json()) as ApiResponse<unknown>
  } catch {
    return null
  }
}

type ResetError = {
  field: 'email' | 'code' | 'password' | 'general'
  message: string
} | null

export default function PasswordResetForm() {
  const router = useRouter()
  const [step, setStep] = useState<PasswordResetStep>('request')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState<ResetError>(null)
  const [cooldown, setCooldown] = useState(0)
  const [isSending, setIsSending] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setInterval(() => {
      setCooldown(current => (current <= 1 ? 0 : current - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [cooldown])

  const issue = describeResetPasswordIssue(newPassword, confirmation)
  const canSubmit = canSubmitReset(code, newPassword, confirmation)

  const handleSendCode = async () => {
    const trimmed = email.trim()
    if (!isValidResetEmail(trimmed)) {
      setError({
        field: 'email',
        message: '올바른 이메일 형식을 입력해 주세요.',
      })
      return
    }

    setError(null)
    setIsSending(true)
    try {
      const response = await fetch('/api/bff/auth/password/reset/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed }),
      })
      const data = await parseJsonResponse(response)

      if (response.ok && data?.dataHeader?.success) {
        /*
         * 성공이라고 계정이 있다는 뜻이 **아니다.** 백엔드는 계정 존재 여부를 숨기려고
         * 어떤 이메일에도 성공으로 답한다. 그래서 다음 단계로 넘기되, 코드가 오지
         * 않을 수 있다는 사실을 함께 적는다(`CODE_MAY_NOT_ARRIVE_NOTICE`).
         */
        setEmail(trimmed)
        setStep('verify')
        setCooldown(RESEND_COOLDOWN_SECONDS)
        return
      }

      const resultCode = data?.dataHeader?.resultCode
      /*
       * 서버가 아직 쿨다운이라고 답했다면 화면 카운트다운이 실제와 어긋난 것이다
       * (다른 탭에서 보냈을 수 있다). 남은 시간을 알 수 없으므로 한 주기를 통째로
       * 다시 잠근다 — 과대추정이 안전하다. 회원가입과 같은 처리다.
       */
      if (resultCode === RESET_CODE_COOLDOWN) {
        setCooldown(RESEND_COOLDOWN_SECONDS)
      }
      setError({
        field: 'general',
        message: getAuthErrorMessage(
          data,
          '인증코드를 보내지 못했어요. 잠시 후 다시 시도해 주세요.',
        ),
      })
    } catch {
      setError({ field: 'general', message: NETWORK_ERROR_MESSAGE })
    } finally {
      setIsSending(false)
    }
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canSubmit || isSubmitting) return

    setError(null)
    setIsSubmitting(true)
    try {
      const response = await fetch('/api/bff/auth/password/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          code: code.trim(),
          newPassword,
        }),
      })
      const data = await parseJsonResponse(response)

      if (response.ok && data?.dataHeader?.success) {
        router.replace('/login?reset=1')
        return
      }

      const resultCode = data?.dataHeader?.resultCode
      /*
       * 코드가 무효화됐으면(만료 AUTH_005 / 시도초과 AUTH_017) 백엔드에 코드가 남아
       * 있지 않다. 죽은 값을 입력란에 남겨 두고 재전송까지 잠가 두면 안내만 하고 길은
       * 막는 꼴이 된다 — 회원가입에서 실제로 겪은 문제라 같은 처리를 한다.
       */
      if (isResetCodeInvalidated(resultCode)) {
        setCode('')
        setCooldown(0)
      }
      setError({
        field: isResetCodeInvalidated(resultCode) ? 'code' : 'general',
        message: getAuthErrorMessage(
          data,
          '비밀번호를 재설정하지 못했어요. 잠시 후 다시 시도해 주세요.',
        ),
      })
    } catch {
      setError({ field: 'general', message: NETWORK_ERROR_MESSAGE })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <GuestOnly>
      <AuthShell
        eyebrow="비밀번호 재설정"
        title="비밀번호를 잊으셨나요?"
        description="가입한 이메일로 인증코드를 보내 드려요."
      >
        {step === 'request' ? (
          <AuthForm
            onSubmit={event => {
              event.preventDefault()
              if (!isSending) void handleSendCode()
            }}
          >
            <Field>
              <FieldLabel>이메일</FieldLabel>
              <TextInput
                type="email"
                value={email}
                onChange={event => setEmail(event.target.value)}
                placeholder="가입한 이메일을 입력하세요."
                autoComplete="email"
                aria-label="가입한 이메일"
              />
              {error?.field === 'email' ? (
                <FieldError>{error.message}</FieldError>
              ) : null}
            </Field>

            <Notice>{CODE_MAY_NOT_ARRIVE_NOTICE}</Notice>

            {error?.field === 'general' ? (
              <FieldError role="alert">{error.message}</FieldError>
            ) : null}

            <PrimaryButton type="submit" disabled={isSending}>
              {isSending ? '보내는 중...' : '인증코드 받기'}
            </PrimaryButton>
          </AuthForm>
        ) : (
          <AuthForm onSubmit={handleSubmit}>
            <Notice>
              {email}로 인증코드를 보냈어요. {RESET_CODE_TTL_MINUTES}분 안에
              입력해 주세요.
            </Notice>
            <Notice>{CODE_MAY_NOT_ARRIVE_NOTICE}</Notice>

            <Field>
              <FieldLabel>인증코드</FieldLabel>
              <TextInput
                value={code}
                onChange={event => setCode(event.target.value)}
                placeholder="메일로 받은 인증코드"
                autoComplete="one-time-code"
                aria-label="인증코드"
              />
              {error?.field === 'code' ? (
                <FieldError>{error.message}</FieldError>
              ) : null}
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
              {issue ? (
                <FieldError>{issue}</FieldError>
              ) : (
                <HelperText>{PASSWORD_RULE_TEXT}</HelperText>
              )}
            </Field>

            <Notice>{SESSION_RESET_NOTICE}</Notice>

            {error?.field === 'general' ? (
              <FieldError role="alert">{error.message}</FieldError>
            ) : null}

            <PrimaryButton type="submit" disabled={!canSubmit || isSubmitting}>
              {isSubmitting ? '재설정 중...' : '비밀번호 재설정'}
            </PrimaryButton>

            <ResendRow>
              <HelperText>인증코드가 오지 않았다면 재전송해 주세요.</HelperText>
              <ResendButton
                type="button"
                onClick={() => void handleSendCode()}
                disabled={cooldown > 0 || isSending}
              >
                {cooldown > 0 ? `재전송 (${cooldown}초)` : '인증코드 재전송'}
              </ResendButton>
            </ResendRow>
          </AuthForm>
        )}

        <FooterRow>
          <span>비밀번호가 기억났나요?</span>
          <FooterLink href="/login">로그인</FooterLink>
        </FooterRow>
      </AuthShell>
    </GuestOnly>
  )
}
