'use client'

import { create } from 'zustand'
import type { MemberInfo } from '@/types/auth'

/**
 * 세션 확인(`/api/auth/me`)을 기다리는 상한. 넘기면 비로그인으로 확정한다.
 *
 * 응답이 오지 않으면 `hasHydrated` 가 영원히 false 라 헤더가 회색 자리에, 로그인 필요 화면이
 * 대기 문구에 머문다(#579). 비로그인으로 확정해도 쿠키 세션은 그대로라, 다음 확인(새로고침·
 * 다른 탭의 storage 이벤트)에서 회원으로 돌아온다.
 */
export const AUTH_HYDRATE_TIMEOUT_MS = 5000

type AuthState = {
  hasHydrated: boolean
  isLoggedIn: boolean
  memberInfo: MemberInfo | null
  hydrate: () => Promise<void>
  setSession: (memberInfo: MemberInfo) => void
  clearSession: () => void
}

export const useAuthStore = create<AuthState>(set => ({
  hasHydrated: false,
  isLoggedIn: false,
  memberInfo: null,
  hydrate: async () => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), AUTH_HYDRATE_TIMEOUT_MS)
    try {
      const res = await fetch('/api/auth/me', {
        credentials: 'same-origin',
        signal: controller.signal,
      })
      const data = await res.json()
      set({
        hasHydrated: true,
        isLoggedIn: Boolean(data.authenticated),
        memberInfo: data.authenticated ? (data.member as MemberInfo) : null,
      })
    } catch {
      // 네트워크 실패·타임아웃(abort)·JSON 아님 — 모두 비로그인으로 확정한다.
      set({ hasHydrated: true, isLoggedIn: false, memberInfo: null })
    } finally {
      clearTimeout(timer)
    }
  },
  setSession: memberInfo =>
    set({ hasHydrated: true, isLoggedIn: true, memberInfo }),
  clearSession: () =>
    set({ hasHydrated: true, isLoggedIn: false, memberInfo: null }),
}))
