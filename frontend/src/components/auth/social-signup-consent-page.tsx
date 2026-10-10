'use client'

import { useState } from 'react'
import AuthShell, {
  FooterLink,
  FooterRow,
  Notice,
} from '@/components/auth/auth-shell'
import GuestOnly from '@/components/auth/guest-only'
import SignupConsentFieldset, {
  useSignupConsentFocus,
} from '@/components/auth/signup-consent-fieldset'
import SocialLogin from '@/components/auth/social-login'
import {
  EMPTY_SIGNUP_CONSENT,
  SOCIAL_SIGNUP_CONSENT_REQUIRED_MESSAGE,
  isSignupConsentComplete,
  type SignupConsent,
  type SignupConsentKey,
  type SocialSignupReason,
} from '@/lib/auth/signup-consent'

const CONSENT_ID_PREFIX = 'social-signup-consent'

/**
 * 상단 안내는 **왜 이 화면에 왔는지만** 말한다(info). 빨간 표시는 체크박스 인라인 오류 하나로 둔다 —
 * 같은 오류 문장을 Notice 에도 띄우면 두 번 읽히고, 체크한 뒤에도 빨간 Notice 가 남는다.
 */
const REASON_NOTICE: Record<SocialSignupReason, string> = {
  terms: '카카오 계정으로 처음 오셨어요. 아래 필수 항목에 동의해 주세요.',
  age: '카카오 가입을 마치려면 만 14세 이상인지 확인해 주세요.',
}

export type SocialSignupConsentPageProps = {
  reason: SocialSignupReason
  /** `safeReturnPath` 를 거친 복귀 경로. 카카오 버튼이 쿠키에 다시 남긴다. */
  returnTo: string
}

/**
 * 카카오 첫 가입 동의 화면 (#495, 계약 §0-2).
 *
 * 로그인 화면에서 동의 없이 카카오를 시작한 신규 회원을 콜백이 이리로 보낸다
 * (`AUTH_021` → `reason=terms`, `AUTH_022` → `reason=age`). 인가코드는 1회용이라
 * 여기서는 동의를 받은 뒤 **authorize 부터 다시** 시작한다. 카카오 앱 동의를 이미 마친
 * 사용자는 대개 곧바로 콜백으로 돌아온다.
 */
export default function SocialSignupConsentPage({
  reason,
  returnTo,
}: SocialSignupConsentPageProps) {
  const [consent, setConsent] = useState<SignupConsent>(EMPTY_SIGNUP_CONSENT)
  // 만 14세 미확인으로 돌아왔으면 그 체크박스를 처음부터 강조한다.
  const [invalid, setInvalid] = useState<SignupConsentKey[]>(
    reason === 'age' ? ['ageOver14Confirmed'] : [],
  )
  const [showRequired, setShowRequired] = useState(false)
  const focusConsent = useSignupConsentFocus(CONSENT_ID_PREFIX)

  const handleChange = (next: SignupConsent) => {
    setConsent(next)
    setInvalid(current => current.filter(key => !next[key]))
    if (isSignupConsentComplete(next)) setShowRequired(false)
  }

  const handleIncomplete = (missing: SignupConsentKey[]) => {
    setShowRequired(true)
    setInvalid(missing)
    focusConsent(missing[0])
  }

  return (
    <GuestOnly>
      <AuthShell
        eyebrow="카카오로 가입"
        title="약관에 동의하면 가입이 끝납니다."
        description="필수 항목에 동의한 뒤 「카카오로 시작하기」를 누르면 가입이 끝나요."
      >
        <Notice>{REASON_NOTICE[reason]}</Notice>

        <SignupConsentFieldset
          value={consent}
          onChange={handleChange}
          invalid={invalid}
          idPrefix={CONSENT_ID_PREFIX}
        />

        {showRequired ? (
          <Notice $tone="error">
            {SOCIAL_SIGNUP_CONSENT_REQUIRED_MESSAGE}
          </Notice>
        ) : null}

        <SocialLogin
          consent={consent}
          onConsentIncomplete={handleIncomplete}
          returnTo={returnTo}
          showDivider={false}
          label="카카오로 시작하기"
        />

        <FooterRow>
          <FooterLink href="/register">이메일로 가입하기</FooterLink>
          <span aria-hidden="true">·</span>
          <FooterLink href="/login">로그인으로 돌아가기</FooterLink>
        </FooterRow>
      </AuthShell>
    </GuestOnly>
  )
}
