import type { MemberInfo } from '@/types/auth'

const isBrowser = () => typeof window !== 'undefined'

export const localStorageKeys = {
  memberInfo: 'memberInfo',
  isLogIn: 'isLogIn',
} as const

export const sessionStorageKeys = {
  email: 'email',
} as const

const getStorageItem = (
  storage: Storage | undefined,
  key: string,
): string | null => {
  if (!storage) {
    return null
  }

  try {
    return storage.getItem(key)
  } catch {
    return null
  }
}

const setStorageItem = (
  storage: Storage | undefined,
  key: string,
  value: string,
) => {
  if (!storage) {
    return
  }

  try {
    storage.setItem(key, value)
  } catch {
    //
  }
}

const removeStorageItem = (storage: Storage | undefined, key: string) => {
  if (!storage) {
    return
  }

  try {
    storage.removeItem(key)
  } catch {
    //
  }
}

export const getLocalStorageItem = (key: string) =>
  getStorageItem(isBrowser() ? window.localStorage : undefined, key)

export const setLocalStorageItem = (key: string, value: string) =>
  setStorageItem(isBrowser() ? window.localStorage : undefined, key, value)

export const removeLocalStorageItem = (key: string) =>
  removeStorageItem(isBrowser() ? window.localStorage : undefined, key)

export const getSessionStorageItem = (key: string) =>
  getStorageItem(isBrowser() ? window.sessionStorage : undefined, key)

export const setSessionStorageItem = (key: string, value: string) =>
  setStorageItem(isBrowser() ? window.sessionStorage : undefined, key, value)

export const removeSessionStorageItem = (key: string) =>
  removeStorageItem(isBrowser() ? window.sessionStorage : undefined, key)

export const clearLegacyLoginStorage = () => {
  removeLocalStorageItem(localStorageKeys.memberInfo)
  removeLocalStorageItem(localStorageKeys.isLogIn)
}

export const getStoredMemberInfo = (): MemberInfo | null => {
  const rawMemberInfo = getLocalStorageItem(localStorageKeys.memberInfo)

  if (!rawMemberInfo) {
    return null
  }

  try {
    return JSON.parse(rawMemberInfo) as MemberInfo
  } catch {
    return null
  }
}

export const setStoredMemberInfo = (memberInfo: MemberInfo) => {
  setLocalStorageItem(localStorageKeys.memberInfo, JSON.stringify(memberInfo))
  setLocalStorageItem(localStorageKeys.isLogIn, 'true')
}

export const persistSessionEmail = (email: string) => {
  setSessionStorageItem(sessionStorageKeys.email, JSON.stringify({ email }))
}

export const clearSessionEmail = () =>
  removeSessionStorageItem(sessionStorageKeys.email)

export const getStoredSessionEmail = () => {
  const rawEmailSession = getSessionStorageItem(sessionStorageKeys.email)

  if (!rawEmailSession) {
    return null
  }

  try {
    const parsed = JSON.parse(rawEmailSession)

    if (typeof parsed?.state?.email === 'string') {
      return parsed.state.email
    }

    if (typeof parsed?.email === 'string') {
      return parsed.email
    }

    return null
  } catch {
    return null
  }
}
