'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { useToast } from '@/components/ui/toast'
/*
  묶음 되돌리기(#631)는 커뮤니티 댓글 지연 삭제(#581)와 같은 것(components/ui/use-undo-batch → lib/ui/undo-batch)을 쓴다 —
  두 벌로 나뉘면 되돌리기·이탈 규칙이 화면마다 갈린다.
*/
import { useUndoBatch } from '@/components/ui/use-undo-batch'
import type { ProfileRemovalBatchCopy } from '@/lib/profile/removal-batch-copy'
import {
  createFailureTally,
  describeRemovalFailure,
} from '@/lib/profile/removal-request'
import { TOAST_DURATION_MS } from '@/lib/ui/toast-state'

export { UNDO_ACTION_LABEL, UNDO_ALL_ACTION_LABEL } from '@/lib/ui/undo-batch'
export type { ProfileRemovalBatchCopy } from '@/lib/profile/removal-batch-copy'

/** 항목 하나를 지울 때 쓰는 문구. 모두 무엇을 지웠는지 이름을 넣어 쓴다. */
export type UndoableRemovalCopy = {
  /** 숨기자마자 띄우는 토스트. 예) 「망원동 북마크를 해제했어요.」 */
  removed: string
  /** 다른 항목의 기한이 지나 이 항목만 되돌릴 수 있게 남았을 때. 예) 「망원동 북마크는 아직 되돌릴 수 있어요.」 */
  pending: string
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

/**
 * 프로필 보관함의 「숨기고 → 10초 되돌리기 → 그 뒤에 DELETE」(#574).
 *
 * 확인 창 대신 이 패턴을 쓰는 이유: 보관함 삭제는 자주 하는 정리 동작이라 매번 묻는 창은 마찰만 늘고, 오삭제를
 * 막는 데는 「바로 되돌릴 수 있음」이 더 낫다. 서버에 되살리는 API 가 없으므로 되돌리기 시간 동안은 **보내지 않는다.**
 *
 * - 한 화면(scope)에서 연달아 지운 항목은 되돌리기 토스트 하나로 묶는다(#631). 항목마다 기한은 각자 10초이고, 토스트는
 *   아직 보내지 않은 항목을 말한다(하나면 이름, 둘 이상이면 개수 + 「모두 되돌리기」).
 * - `commit(key)` 이 성공하면 **숨김을 풀지 않는다.** 재조회가 늦거나 실패하면 옛 목록에 지운 카드가 남아 있어,
 *   풀면 지운 카드가 다시 비친다. 키(북마크·기록·세션 id)는 다시 쓰이지 않으므로 숨김을 남겨도 다른 항목을 가리지 않는다.
 * - 실패하면 숨김을 풀어 항목을 되살리고 이유를 토스트로 알린다. 화면을 떠난 뒤의 실패는 되살릴 카드가 없으므로
 *   「…하지 못했어요」만 알린다. 실패 토스트는 화면마다 **한 장**이다(키 `${scope}:failed`) — 여러 장이 쌓이면 토스트
 *   상한(3)에 묶음 되돌리기 토스트가 밀려 남은 항목을 되돌릴 수 없다. 그 한 장이 떠 있는 동안 또 실패하면 개수로 말한다.
 * - 화면을 떠나면(언마운트·pagehide) 기다리던 삭제를 바로 보내고 묶음 토스트를 닫는다 — 떠난 뒤 누르면
 *   되돌릴 것이 없는데 성공처럼 닫히는 버튼이 된다.
 */
export function useUndoableRemoval({
  scope,
  batchCopy,
  commit,
}: {
  /** 묶음 토스트 키. 화면마다 달라야 다른 화면의 토스트를 닫지 않는다. */
  scope: string
  /** 둘 이상을 한꺼번에 말하는 문구. 예) 「북마크 3개를 해제했어요.」 */
  batchCopy: ProfileRemovalBatchCopy
  commit: (key: string) => Promise<void>
}) {
  const { showToast } = useToast()
  const [hiddenKeys, setHiddenKeys] = useState<ReadonlySet<string>>(
    () => new Set(),
  )
  const mountedRef = useRef(false)
  /* 실패 토스트 한 장이 떠 있을 동안의 실패 수. 오류 토스트 수명만큼 센다. */
  const [failureTally] = useState(() =>
    createFailureTally(TOAST_DURATION_MS.error),
  )

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const unhide = useCallback((keys: readonly string[]) => {
    setHiddenKeys(current => {
      if (!keys.some(key => current.has(key))) return current
      const next = new Set(current)
      keys.forEach(key => next.delete(key))
      return next
    })
  }, [])

  const batch = useUndoBatch<string, UndoableRemovalCopy>({
    scope,
    batchCopy,
    commit: (key, copy) => {
      void commit(key).then(
        () => undefined,
        (error: unknown) => {
          unhide([key])
          const count = failureTally.add()
          const mounted = mountedRef.current
          const lead =
            count === 1
              ? mounted
                ? copy.restored
                : copy.failed
              : mounted
                ? batchCopy.restoredOnFailureMany(count)
                : batchCopy.failedMany(count)
          showToast({
            message: describeRemovalFailure(lead, error),
            tone: 'error',
            dedupeKey: `${scope}:failed`,
          })
        },
      )
    },
    restore: unhide,
  })

  const remove = (key: string, copy: UndoableRemovalCopy) => {
    setHiddenKeys(current => new Set(current).add(key))
    batch.remove(key, copy)
  }

  return { hiddenKeys, remove }
}
