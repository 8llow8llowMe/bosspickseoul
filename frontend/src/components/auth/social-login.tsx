'use client'

import { useState } from 'react'
import Image from 'next/image'
import styled from 'styled-components'
import { Divider, Notice } from '@/components/auth/auth-shell'
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

export default function SocialLogin() {
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
