'use client'

import { create } from 'zustand'
import type { MemberInfo } from '@/types/auth'

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
    try {
      const res = await fetch('/api/auth/me', { credentials: 'same-origin' })
      const data = await res.json()
      set({
        hasHydrated: true,
        isLoggedIn: Boolean(data.authenticated),
        memberInfo: data.authenticated ? (data.member as MemberInfo) : null,
      })
    } catch {
      set({ hasHydrated: true, isLoggedIn: false, memberInfo: null })
    }
  },
  setSession: memberInfo =>
    set({ hasHydrated: true, isLoggedIn: true, memberInfo }),
  clearSession: () =>
    set({ hasHydrated: true, isLoggedIn: false, memberInfo: null }),
}))
