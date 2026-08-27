'use client'

import { useState } from 'react'
import Image from 'next/image'
import styled from 'styled-components'
import { Divider, Notice } from '@/components/auth/auth-shell'
import {
  AUTH_RETURN_COOKIE,
  AUTH_RETURN_MAX_AGE_SECONDS,
  safeReturnPath,
} from '@/lib/auth/return-path'
import type { ApiResponse } from '@/types/api'

const PROVIDERS = [
  { id: 'kakao', label: '카카오로 계속하기', img: '/images/KakaoBtnSmall.png' },
] as const

const List = styled.div`
  display: grid;
  gap: 8px;
`
const ProviderButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 48px;
  border: 1px solid var(--color-border-200);
  border-radius: var(--radius-control);
  background: var(--color-surface);
  cursor: pointer;
  &:disabled {
    cursor: not-allowed;
    opacity: var(--button-disabled-opacity-color);
  }
`

export type SocialLoginProps = {
  /** 로그인 후 되돌아갈 내부 경로. 홈이면 넘기지 않아도 된다. */
  returnTo?: string | null
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

export default function SocialLogin({ returnTo }: SocialLoginProps = {}) {
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const start = async (provider: string) => {
    setBusy(provider)
    setError(null)
    try {
      const res = await fetch(`/api/bff/auth/${provider}/authorize`)
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
      <Divider>또는</Divider>
      {error ? <Notice $tone="error">{error}</Notice> : null}
      <List>
        {PROVIDERS.map(p => (
          <ProviderButton
            key={p.id}
            type="button"
            onClick={() => start(p.id)}
            disabled={busy !== null}
          >
            <Image src={p.img} alt="" width={20} height={20} aria-hidden />
            {p.label}
          </ProviderButton>
        ))}
      </List>
    </>
  )
}
