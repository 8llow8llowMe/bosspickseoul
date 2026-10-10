/*
  「지금은 예약만, 시간이 지나면 실행」 큐 — 되돌리기 토스트가 붙는 삭제의 공용 바탕.

  화면에서 먼저 숨기고 되돌리기 시간이 지나면 그때 서버로 보낸다. 묶음 되돌리기 토스트(#631, `lib/ui/undo-batch`)가
  이 위에 올라가고, 커뮤니티 댓글 삭제(#581)와 프로필 보관함 삭제(#574)가 그것을 쓴다. React 를 모르는 순수 모듈이다.
*/

type Timer = ReturnType<typeof setTimeout>

export type DeferredCommitOptions<Key> = {
  delayMs: number
  commit: (key: Key) => void
  /** 테스트가 가짜 타이머를 넣는 자리. 기본은 전역 setTimeout. */
  setTimer?: (callback: () => void, delayMs: number) => Timer
  clearTimer?: (timer: Timer) => void
}

/**
 * 「지금은 예약만, 시간이 지나면 실행」 큐. 되돌리면 예약을 지운다. `flush` 는 남은 예약을 즉시 실행한다
 * (페이지 이탈). 같은 키를 두 번 예약하면 앞 예약을 지우고 다시 잰다.
 */
export const createDeferredCommit = <Key>({
  delayMs,
  commit,
  setTimer = (callback, ms) => setTimeout(callback, ms),
  clearTimer = timer => clearTimeout(timer),
}: DeferredCommitOptions<Key>) => {
  const timers = new Map<Key, Timer>()

  return {
    schedule: (key: Key) => {
      const existing = timers.get(key)
      if (existing !== undefined) {
        clearTimer(existing)
      }

      timers.set(
        key,
        setTimer(() => {
          timers.delete(key)
          commit(key)
        }, delayMs),
      )
    },
    /** 예약을 지운다. 이미 실행됐거나 없으면 false — 되돌릴 수 없다. */
    undo: (key: Key) => {
      const timer = timers.get(key)
      if (timer === undefined) {
        return false
      }

      clearTimer(timer)
      timers.delete(key)
      return true
    },
    flush: () => {
      const keys = [...timers.keys()]
      timers.forEach(timer => clearTimer(timer))
      timers.clear()
      keys.forEach(key => commit(key))
      return keys
    },
    has: (key: Key) => timers.has(key),
  }
}
