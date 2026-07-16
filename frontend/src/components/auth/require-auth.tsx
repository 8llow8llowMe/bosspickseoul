'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import styled from 'styled-components'
import { useAuthStore } from '@/stores/auth-store'

const Fallback = styled.div`
  min-height: 320px;
  display: grid;
  place-items: center;
  padding: 40px 24px;
  color: var(--color-text-500);
`

type RequireAuthProps = {
  children: React.ReactNode
}

export default function RequireAuth({ children }: RequireAuthProps) {
  const router = useRouter()
  const hasHydrated = useAuthStore(state => state.hasHydrated)
  const isLoggedIn = useAuthStore(state => state.isLoggedIn)

  useEffect(() => {
    if (hasHydrated && !isLoggedIn) {
      router.replace('/login')
    }
  }, [hasHydrated, isLoggedIn, router])

  if (!hasHydrated) {
    return <Fallback>로그인 상태를 확인하는 중입니다.</Fallback>
  }

  if (!isLoggedIn) {
    return <Fallback>로그인 페이지로 이동합니다.</Fallback>
  }

  return children
}
