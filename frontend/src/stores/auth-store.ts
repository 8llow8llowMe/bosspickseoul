'use client'

import { create } from 'zustand'
import { deleteCookie, getAccessTokenCookie } from '@/lib/auth/cookies'
import {
  clearLegacyLoginStorage,
  clearSessionEmail,
  getLocalStorageItem,
  getStoredMemberInfo,
  localStorageKeys,
  persistSessionEmail,
  setStoredMemberInfo,
} from '@/lib/auth/storage'
import type { MemberInfo } from '@/types/auth'

type AuthState = {
  hasHydrated: boolean
  isLoggedIn: boolean
  memberInfo: MemberInfo | null
  hydrate: () => void
  setSession: (memberInfo: MemberInfo) => void
  updateMemberInfo: (memberInfo: MemberInfo) => void
  clearSession: () => void
}

const hasLegacyLoginFlag = () =>
  getLocalStorageItem(localStorageKeys.isLogIn) === 'true'

const resolveLoggedInState = (memberInfo: MemberInfo | null) =>
  Boolean(memberInfo) &&
  (Boolean(getAccessTokenCookie()) || hasLegacyLoginFlag())

const syncAuthenticatedState = (memberInfo: MemberInfo) => {
  setStoredMemberInfo(memberInfo)
  persistSessionEmail(memberInfo.email)
}

export const useAuthStore = create<AuthState>(set => ({
  hasHydrated: false,
  isLoggedIn: false,
  memberInfo: null,
  hydrate: () => {
    const memberInfo = getStoredMemberInfo()
    const isLoggedIn = resolveLoggedInState(memberInfo)

    if (memberInfo && isLoggedIn) {
      persistSessionEmail(memberInfo.email)
    } else {
      clearLegacyLoginStorage()
      clearSessionEmail()
    }

    set({
      hasHydrated: true,
      isLoggedIn,
      memberInfo: isLoggedIn ? memberInfo : null,
    })
  },
  setSession: memberInfo => {
    syncAuthenticatedState(memberInfo)
    set({
      hasHydrated: true,
      isLoggedIn: true,
      memberInfo,
    })
  },
  updateMemberInfo: memberInfo => {
    syncAuthenticatedState(memberInfo)
    set({
      hasHydrated: true,
      isLoggedIn: true,
      memberInfo,
    })
  },
  clearSession: () => {
    clearLegacyLoginStorage()
    clearSessionEmail()
    deleteCookie('accessToken')

    set({
      hasHydrated: true,
      isLoggedIn: false,
      memberInfo: null,
    })
  },
}))
