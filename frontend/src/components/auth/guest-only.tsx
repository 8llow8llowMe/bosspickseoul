'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import styled from 'styled-components'
import { safeReturnPath } from '@/lib/auth/return-path'
import { useAuthStore } from '@/stores/auth-store'

const Fallback = styled.div`
  min-height: calc(100vh - 120px);
  display: grid;
  place-items: center;
  padding: 40px 24px;
  color: var(--color-text-500);
`

type GuestOnlyProps = {
  children: React.ReactNode
  /**
   * 서버가 요청에 세션 쿠키가 없다고 확인했다(#579). 그러면 `/api/auth/me` 응답을 기다리지 않고
   * 폼을 바로 그린다 — 쿠키가 없으면 로그인 상태일 수 없기 때문이다. 대부분인 비로그인 방문자가
   * BFF 왕복만큼 빈 화면을 보지 않게 된다.
   *
   * 쿠키가 있으면(만료된 쿠키일 수도 있다) 예전처럼 세션 확인을 기다린다. 어느 쪽이든 확인 결과가
   * 로그인이면 홈으로 보낸다.
   */
  assumeGuest?: boolean
  /**
   * 로그인 상태로 확인되면 보낼 곳. 기본은 홈이다. **`safeReturnPath` 를 다시 거친다.**
   *
   * 로그인 폼은 성공 뒤 세션을 확인(hydrate)하고 `router.replace(returnTo)` 를 부르는데, 같은 확인으로
   * 여기 effect 도 깨어나 이동을 부른다. 둘이 다른 곳을 가리키면 늦게 도는 이 effect 가 이겨
   * 사용자가 원래 가려던 화면 대신 홈으로 떨어졌다(`login-form-return.interaction.test.ts`).
   * 그래서 폼과 같은 복귀 경로를 받는다. 이미 로그인한 사람이 `?redirect=` 로 들어와도 그쪽으로 간다.
   */
  redirectTo?: string
}

export default function GuestOnly({
  children,
  assumeGuest = false,
  redirectTo,
}: GuestOnlyProps) {
  const router = useRouter()
  const hasHydrated = useAuthStore(state => state.hasHydrated)
  const isLoggedIn = useAuthStore(state => state.isLoggedIn)
  const destination = safeReturnPath(redirectTo)

  useEffect(() => {
    if (hasHydrated && isLoggedIn) {
      router.replace(destination)
    }
  }, [destination, hasHydrated, isLoggedIn, router])

  if (!hasHydrated && !assumeGuest) {
    return <Fallback>세션 상태를 확인하는 중입니다.</Fallback>
  }

  if (hasHydrated && isLoggedIn) {
    return (
      <Fallback>
        {destination === '/'
          ? '메인 페이지로 이동합니다.'
          : '원래 가려던 화면으로 이동합니다.'}
      </Fallback>
    )
  }

  return children
}
