'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { useToast } from '@/components/ui/toast'
/*
  「지금은 예약만, 시간이 지나면 실행」 큐는 커뮤니티 댓글 지연 삭제(#581)가 먼저 만들었다. 같은 큐를 그대로 쓴다 —
  두 벌로 나뉘면 되돌리기·이탈 규칙이 화면마다 갈린다. 공용 위치(lib/ui)로 옮기는 일은 B18(공용 UI 정리)에 맡긴다.
*/
import { createDeferredCommit } from '@/lib/community/comment-delete'
import { describeRemovalFailure } from '@/lib/profile/removal-request'
import { TOAST_ACTION_DURATION_MS } from '@/lib/ui/toast-state'

/** 항목 하나를 지울 때 쓰는 문구 네 가지. 모두 무엇을 지웠는지 이름을 넣어 쓴다. */
export type UndoableRemovalCopy = {
  /** 숨기자마자 띄우는 토스트. 예) 「망원동 북마크를 해제했어요.」 */
  removed: string
  /** 보낸 삭제가 실패해 다시 보여 줄 때. 예) 「망원동 북마크를 해제하지 못해 다시 보여 드려요.」 */
  restored: string
  /**
   * 화면을 떠난 뒤 보낸 삭제가 실패했을 때. 되살릴 카드가 화면에 없으므로 「다시 보여 드려요」라고 하지 않는다.
   * 예) 「망원동 북마크를 해제하지 못했어요.」
   */
  failed: string
  /** 되돌리기를 눌렀는데 이미 보냈을 때. 예) 「망원동 북마크는 이미 해제됐어요.」 */
  alreadyDone: string
}

type Queue = ReturnType<typeof createDeferredCommit<string>>

/** 되돌리기 토스트 버튼 이름. 커뮤니티 댓글 삭제와 같다. */
export const UNDO_ACTION_LABEL = '되돌리기'

/**
 * 프로필 보관함의 「숨기고 → 10초 되돌리기 → 그 뒤에 DELETE」(#574).
 *
 * 확인 창 대신 이 패턴을 쓰는 이유: 보관함 삭제는 자주 하는 정리 동작이라 매번 묻는 창은 마찰만 늘고, 오삭제를
 * 막는 데는 「바로 되돌릴 수 있음」이 더 낫다. 서버에 되살리는 API 가 없으므로 되돌리기 시간 동안은 **보내지 않는다.**
 *
 * - `commit(key)` 이 성공하면 **숨김을 풀지 않는다.** 재조회가 늦거나 실패하면 옛 목록에 지운 카드가 남아 있어,
 *   풀면 지운 카드가 다시 비친다. 키(북마크·기록·세션 id)는 다시 쓰이지 않으므로 숨김을 남겨도 다른 항목을 가리지 않는다.
 * - 실패하면 숨김을 풀어 항목을 되살리고 이유를 토스트로 알린다. 화면을 떠난 뒤의 실패는 되살릴 카드가 없으므로
 *   「…하지 못했어요」만 알린다.
 * - 화면을 떠나면(언마운트·pagehide) 기다리던 삭제를 바로 보내고 남은 되돌리기 토스트를 닫는다 — 떠난 뒤 누르면
 *   되돌릴 것이 없는데 성공처럼 닫히는 버튼이 된다.
 */
export function useUndoableRemoval({
  scope,
  commit,
}: {
  /** 토스트 묶음 키 앞머리. 화면마다 달라야 다른 화면의 토스트를 닫지 않는다. */
  scope: string
  commit: (key: string) => Promise<void>
}) {
  const { showToast, dismissToast } = useToast()
  const [hiddenKeys, setHiddenKeys] = useState<ReadonlySet<string>>(
    () => new Set(),
  )
  const commitRef = useRef(commit)
  const copiesRef = useRef(new Map<string, UndoableRemovalCopy>())
  const queueRef = useRef<Queue | null>(null)
  const runRef = useRef<(key: string) => void>(() => undefined)
  const mountedRef = useRef(false)
  const dismissRef = useRef<(key: string) => void>(() => undefined)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const toastKey = useCallback((key: string) => `${scope}:${key}`, [scope])

  const unhide = useCallback((key: string) => {
    setHiddenKeys(current => {
      if (!current.has(key)) return current
      const next = new Set(current)
      next.delete(key)
      return next
    })
  }, [])

  // 큐는 처음 만든 뒤 바뀌지 않는다. 실행 함수는 렌더마다 바뀌는 값(쿼리 클라이언트 등)을 잡으므로 ref 로 최신을 잡는다.
  useEffect(() => {
    commitRef.current = commit
    dismissRef.current = key => dismissToast(toastKey(key))
    runRef.current = key => {
      const copy = copiesRef.current.get(key)
      copiesRef.current.delete(key)

      void commitRef.current(key).then(
        () => undefined,
        (error: unknown) => {
          unhide(key)
          if (!copy) return
          showToast({
            message: describeRemovalFailure(
              mountedRef.current ? copy.restored : copy.failed,
              error,
            ),
            tone: 'error',
          })
        },
      )
    }
  })

  /* 이벤트 핸들러에서만 부른다 — 처음 지울 때 만든다. */
  const getQueue = () => {
    queueRef.current ??= createDeferredCommit<string>({
      delayMs: TOAST_ACTION_DURATION_MS,
      commit: key => runRef.current(key),
    })
    return queueRef.current
  }

  /*
    의존성을 비운다 — 진짜 언마운트에만 flush 해야 한다. 토스트 함수나 scope 가 렌더마다 새로 오면 정리 함수가 매번 돌아
    되돌리기 시간도 안 됐는데 삭제가 나간다. 최신 함수는 ref 로 읽는다.
  */
  useEffect(() => {
    const queue = queueRef
    const dismiss = dismissRef
    const flush = () => {
      queue.current?.flush().forEach(key => dismiss.current(key))
    }

    window.addEventListener('pagehide', flush)
    return () => {
      window.removeEventListener('pagehide', flush)
      flush()
    }
  }, [])

  const remove = (key: string, copy: UndoableRemovalCopy) => {
    setHiddenKeys(current => new Set(current).add(key))
    copiesRef.current.set(key, copy)
    getQueue().schedule(key)

    showToast({
      message: copy.removed,
      dedupeKey: toastKey(key),
      action: {
        label: UNDO_ACTION_LABEL,
        onAction: () => {
          if (getQueue().undo(key)) {
            copiesRef.current.delete(key)
            unhide(key)
            return
          }
          showToast({ message: copy.alreadyDone, tone: 'info' })
        },
      },
    })
  }

  return { hiddenKeys, remove }
}
