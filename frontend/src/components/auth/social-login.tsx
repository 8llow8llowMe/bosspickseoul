'use client'

import { useState } from 'react'
import styled from 'styled-components'
import { Divider, Notice } from '@/components/auth/auth-shell'
import {
  AUTH_RETURN_COOKIE,
  AUTH_RETURN_MAX_AGE_SECONDS,
  safeReturnPath,
} from '@/lib/auth/return-path'
import {
  isSignupConsentComplete,
  missingSignupConsent,
  signupConsentQuery,
  type SignupConsent,
  type SignupConsentKey,
} from '@/lib/auth/signup-consent'
import type { ApiResponse } from '@/types/api'

/**
 * 카카오 로그인 버튼 규격 색(#577, 사용자 결정 D-5).
 *
 * **DESIGN.md 토큰 체계 밖의 예외다.** 카카오 디자인 가이드가 컨테이너 `#FEE500`, 라벨
 * `rgba(0, 0, 0, 0.85)`, 심볼 `#000000` 을 정해 두었고 바꿔 쓰면 규격 위반이다. 그래서 토큰으로
 * 올리지 않고 이 한 곳에만 둔다 — DESIGN.md 「외부 브랜드 예외」 절이 근거를 적는다.
 * 다른 화면에서 이 색을 재사용하지 않는다.
 */
export const KAKAO_BRAND = {
  container: '#FEE500',
  label: 'rgba(0, 0, 0, 0.85)',
  symbol: '#000000',
} as const

/** 카카오 가이드가 허용하는 라벨. 로그인·가입 화면은 「카카오 로그인」(D-5). */
export type KakaoButtonLabel = '카카오 로그인' | '카카오로 시작하기'

const List = styled.div`
  display: grid;
  gap: 8px;
`

const KakaoButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 48px;
  padding: 0 18px;
  border: none;
  border-radius: var(--radius-control);
  background: ${KAKAO_BRAND.container};
  color: ${KAKAO_BRAND.label};
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;

  svg {
    width: 18px;
    height: 18px;
    flex: 0 0 auto;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: var(--button-disabled-opacity-color);
  }
`

/** 카카오 심볼(말풍선). 가이드대로 검정 단색이고, 라벨이 이름을 말하므로 보조기술에는 숨긴다. */
const KakaoSymbol = () => (
  <svg viewBox="0 0 18 18" aria-hidden="true" focusable="false">
    <path
      fill={KAKAO_BRAND.symbol}
      d="M9 1.5C4.58 1.5 1 4.33 1 7.82c0 2.25 1.49 4.22 3.74 5.34l-.95 3.48c-.08.3.26.55.53.37l4.14-2.75c.18.01.36.02.54.02 4.42 0 8-2.83 8-6.32S13.42 1.5 9 1.5Z"
    />
  </svg>
)

export type SocialLoginProps = {
  /** 로그인 후 되돌아갈 내부 경로. 홈이면 넘기지 않아도 된다. */
  returnTo?: string | null
  /**
   * 주어지면 **가입 모드**다(#495). 신규 회원은 authorize 를 부를 때 동의를 받으므로
   * (계약 §0-2) 세 항목이 모두 켜졌을 때만 동의 쿼리를 실어 시작한다.
   * 없으면(로그인 화면) 동의 없이 시작한다 — 기존 회원은 그대로 로그인된다.
   */
  consent?: SignupConsent
  /**
   * 가입 모드에서 동의가 모자란 채 눌렀을 때. 이동하지 않고 빠진 항목만 알린다 —
   * 버튼을 비활성화하지 않는 이유는, 눌렀을 때 무엇이 빠졌는지 보여 주는 편이 낫기 때문이다.
   */
  onConsentIncomplete?: (missing: SignupConsentKey[]) => void
  /**
   * 버튼 **아래**의 「또는 이메일로」 구분선(#577). 카카오가 맨 위에 오고 이메일 폼이 그 아래에
   * 이어진다. 카카오 버튼만 있는 화면(`/register/social`)에서는 끈다.
   */
  showDivider?: boolean
  /** 버튼 라벨. 기본은 「카카오 로그인」(D-5). */
  label?: KakaoButtonLabel
}

/**
 * 복귀 경로를 쿠키에 남긴다.
 *
 * 카카오는 `window.location.assign` 으로 **페이지를 통째로 떠나므로** 리액트 상태도
 * `?redirect=` 쿼리도 살아남지 못한다. 돌아왔을 때 목적지를 정하는 쪽은 서버 라우트
 * 핸들러(`/api/auth/social/[provider]`)라서, 그쪽이 읽을 수 있는 곳은 쿠키뿐이다.
 */
const rememberReturnPath = (returnTo: string | null | undefined) => {
  const path = safeReturnPath(returnTo)
  if (path === '/') return

  document.cookie = [
    `${AUTH_RETURN_COOKIE}=${encodeURIComponent(path)}`,
    'path=/',
    `max-age=${AUTH_RETURN_MAX_AGE_SECONDS}`,
    // 카카오에서 돌아오는 요청이 최상위 GET 내비게이션이라 Lax 로도 함께 전송된다.
    'samesite=lax',
    ...(window.location.protocol === 'https:' ? ['secure'] : []),
  ].join('; ')
}

export default function SocialLogin({
  returnTo,
  consent,
  onConsentIncomplete,
  showDivider = true,
  label = '카카오 로그인',
}: SocialLoginProps = {}) {
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const start = async (provider: string) => {
    if (consent && !isSignupConsentComplete(consent)) {
      onConsentIncomplete?.(missingSignupConsent(consent))
      return
    }
    setBusy(provider)
    setError(null)
    try {
      // 범용 BFF(`/api/bff/auth/...`)가 아니라 전용 라우트로 받는다 — 그쪽이 state 를
      // 이 브라우저의 HttpOnly 쿠키에 묶고, 콜백이 그 쿠키와 대조한다(#527).
      const query = consent ? signupConsentQuery(consent) : ''
      const res = await fetch(
        `/api/auth/social/${provider}/authorize${query}`,
        { cache: 'no-store' },
      )
      const data = (await res.json().catch(() => null)) as ApiResponse<{
        authorizationUrl: string
      }> | null
      const url = data?.dataBody?.authorizationUrl
      if (res.ok && data?.dataHeader?.success && url) {
        // 떠나기 직전에 남긴다. 인가 URL 을 못 받으면 쿠키도 남기지 않아
        // 다음 로그인이 엉뚱한 곳으로 가지 않는다.
        rememberReturnPath(returnTo)
        window.location.assign(url)
        return
      }
      setError('소셜 로그인을 시작하지 못했습니다. 잠시 후 다시 시도해 주세요.')
      setBusy(null)
    } catch {
      setError('소셜 로그인을 시작하지 못했습니다. 잠시 후 다시 시도해 주세요.')
      setBusy(null)
    }
  }
  return (
    <>
      {error ? <Notice $tone="error">{error}</Notice> : null}
      <List>
        <KakaoButton
          type="button"
          onClick={() => start('kakao')}
          disabled={busy !== null}
        >
          <KakaoSymbol />
          {label}
        </KakaoButton>
      </List>
      {showDivider ? <Divider>또는 이메일로</Divider> : null}
    </>
  )
}
