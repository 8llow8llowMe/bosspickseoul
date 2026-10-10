import { EMAIL_PATTERN } from '@/components/auth/register-machine'
import { safeReturnPath } from '@/lib/auth/return-path'

/**
 * 로그인 ↔ 가입 사이를 오갈 때 「원래 가려던 화면」을 잃지 않게 하는 링크와,
 * 가입 직후 로그인 화면에 넘길 값(#576).
 *
 * 복귀 경로는 **언제나 `safeReturnPath` 를 거친다.** 이 링크가 만든 `?redirect=` 는 결국
 * 로그인 성공 뒤 `router.replace()` 나 카카오 콜백의 `Location` 으로 흘러가므로, 판정을 따로
 * 두면 그쪽이 오픈 리다이렉트 구멍이 된다. 안전하지 않은 값이면 쿼리를 아예 붙이지 않는다.
 */

const withRedirect = (base: string, returnTo: string | null | undefined) => {
  const path = safeReturnPath(returnTo)
  if (path === '/') return base
  const separator = base.includes('?') ? '&' : '?'
  return `${base}${separator}redirect=${encodeURIComponent(path)}`
}

/** 로그인 화면의 「회원가입」 링크. */
export const buildRegisterHref = (returnTo: string | null | undefined) =>
  withRedirect('/register', returnTo)

/** 가입을 마친 사람을 보낼 로그인 주소. `signup=1` 이 성공 안내를 띄운다. */
export const SIGNUP_COMPLETE_PARAM = 'signup'

export const buildSignupCompleteLoginHref = (
  returnTo: string | null | undefined,
) => withRedirect(`/login?${SIGNUP_COMPLETE_PARAM}=1`, returnTo)

/**
 * 가입한 이메일을 로그인 칸에 미리 채우려고 잠깐 맡겨 두는 곳.
 *
 * URL 에 싣지 않는 이유: 주소창·방문 기록·서버 접근 로그·Referer 에 이메일이 남는다.
 * `sessionStorage` 는 이 탭에만 있고 탭을 닫으면 사라진다. 로그인 화면이 한 번 읽고 바로 지운다.
 */
export const SIGNUP_EMAIL_STORAGE_KEY = 'bps:signup-email'

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

/** 브라우저 저장소. 막혀 있거나(사파리 비공개 등) 서버면 `null`. */
export const getBrowserSessionStorage = (): StorageLike | null => {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage
  } catch {
    return null
  }
}

export const rememberSignupEmail = (
  storage: StorageLike | null,
  email: string,
): void => {
  try {
    storage?.setItem(SIGNUP_EMAIL_STORAGE_KEY, email)
  } catch {
    // 저장이 막혀도 가입은 끝났다. 로그인 칸을 사용자가 채우면 된다.
  }
}

/** 한 번 꺼내고 지운다. 이메일 형식이 아니면 버린다. */
export const takeSignupEmail = (storage: StorageLike | null): string | null => {
  try {
    const value = storage?.getItem(SIGNUP_EMAIL_STORAGE_KEY) ?? null
    storage?.removeItem(SIGNUP_EMAIL_STORAGE_KEY)
    return value && EMAIL_PATTERN.test(value) ? value : null
  } catch {
    return null
  }
}
