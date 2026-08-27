/**
 * 로그인 때문에 중단된 동작을 **한 번만** 기억한다.
 *
 * 왜 필요한가: 저장·보관처럼 로그인이 필요한 버튼을 누르면 로그인 화면으로 나갔다가
 * 돌아온다. 돌아온 화면은 조건도 결과도 그대로지만, **무엇을 하려 했는지는 사라져 있다.**
 * 사용자는 같은 버튼을 다시 찾아 눌러야 한다.
 *
 * `sessionStorage` 인 이유: 탭 하나에 매인 값이고, 카카오처럼 오리진을 떠났다 돌아오는
 * 왕복에서도 살아남는다(같은 탭·같은 오리진). `localStorage` 는 다른 탭까지 오염시키고,
 * 쿠키는 서버로 새어 나간다.
 *
 * **읽으면 지운다.** 이게 이 모듈의 핵심이다 — 남겨 두면 새로고침할 때마다 되살아나고,
 * React StrictMode 가 effect 를 두 번 호출할 때 토스트가 두 장 뜬다.
 */

const STORAGE_KEY = 'bps_pending_action'

const storage = (): Storage | null => {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage
  } catch {
    // 사파리 프라이빗 모드 등에서 접근 자체가 throw 한다. 부가 기능이므로 조용히 포기한다.
    return null
  }
}

/**
 * 로그인 화면으로 나가기 **직전**에 부른다.
 *
 * `key` 는 "무엇을, 어느 화면에서" 를 함께 담아야 한다(예: `archive:${payloadKey}`).
 * 동작 이름만 담으면 다른 상권으로 돌아왔을 때 엉뚱한 화면에서 이어하기가 뜬다.
 */
export const rememberPendingAction = (key: string): void => {
  const store = storage()
  if (!store || !key) return

  try {
    store.setItem(STORAGE_KEY, key)
  } catch {
    // 용량 초과 등. 이어하기를 못 할 뿐이라 실패해도 원래 흐름은 그대로 간다.
  }
}

/** 기억해 둔 동작을 꺼내면서 **지운다.** 없으면 null. */
export const takePendingAction = (): string | null => {
  const store = storage()
  if (!store) return null

  try {
    const value = store.getItem(STORAGE_KEY)
    if (value !== null) store.removeItem(STORAGE_KEY)
    return value
  } catch {
    return null
  }
}

/** 이어하기를 포기할 때. (동작을 취소했거나 조건이 바뀐 경우) */
export const clearPendingAction = (): void => {
  try {
    storage()?.removeItem(STORAGE_KEY)
  } catch {
    // 무시한다.
  }
}
