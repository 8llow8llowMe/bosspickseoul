'use client'

import { useEffect, useRef } from 'react'

import { useToast } from '@/components/ui/toast'
import { TOAST_ACTION_DURATION_MS } from '@/lib/ui/toast-state'
import {
  createUndoBatch,
  type UndoBatchCopy,
  type UndoItemCopy,
} from '@/lib/ui/undo-batch'

/**
 * 묶음 되돌리기 토스트(#631)를 화면에 붙인다. 규칙은 `lib/ui/undo-batch`, 여기서는 토스트·화면 수명만 잇는다.
 * 커뮤니티 댓글 삭제(#581)와 프로필 보관함 지연 삭제(#574)가 같이 쓴다 — 두 벌로 나뉘면 되돌리기·이탈 규칙이 화면마다 갈린다.
 *
 * - 토스트 키는 `scope` 하나다. 한 화면에서 연달아 지운 항목은 토스트 하나로 묶인다.
 * - 화면을 떠나면(언마운트·pagehide) 기다리던 항목을 바로 보내고 묶음 토스트를 닫는다 — 토스트는 앱 전역이라 남는데,
 *   떠난 뒤 누르면 되돌릴 것이 없다.
 * - `commit`·`restore`·토스트 함수는 렌더마다 바뀔 수 있어 ref 로 최신을 읽는다. 묶음(타이머)은 처음 지울 때 한 번 만들고
 *   바꾸지 않는다.
 */
export function useUndoBatch<Key, Copy extends UndoItemCopy>({
  scope,
  batchCopy,
  commit,
  restore,
}: {
  /** 묶음 토스트의 키. 화면마다 달라야 다른 화면의 토스트를 건드리지 않는다. */
  scope: string
  batchCopy: UndoBatchCopy
  /** 기한이 지났거나 화면을 떠날 때 보낸다. */
  commit: (key: Key, copy: Copy) => void
  /** 되돌리기로 되살린 항목들. */
  restore: (keys: Key[]) => void
}) {
  const { showToast, dismissToast, updateToast } = useToast()
  const latest = useRef({
    scope,
    batchCopy,
    commit,
    restore,
    showToast,
    dismissToast,
    updateToast,
  })
  const batchRef = useRef<ReturnType<typeof createUndoBatch<Key, Copy>> | null>(
    null,
  )

  useEffect(() => {
    latest.current = {
      scope,
      batchCopy,
      commit,
      restore,
      showToast,
      dismissToast,
      updateToast,
    }
  })

  /* 이벤트 핸들러에서만 부른다 — 처음 지울 때 만든다. */
  const getBatch = () => {
    batchRef.current ??= createUndoBatch<Key, Copy>({
      delayMs: TOAST_ACTION_DURATION_MS,
      batchCopy: {
        removedMany: count => latest.current.batchCopy.removedMany(count),
        pendingMany: count => latest.current.batchCopy.pendingMany(count),
        restoredMany: count => latest.current.batchCopy.restoredMany(count),
        alreadyDoneMany: count =>
          latest.current.batchCopy.alreadyDoneMany(count),
      },
      commit: (key, copy) => latest.current.commit(key, copy),
      restore: keys => latest.current.restore(keys),
      toast: {
        show: content =>
          latest.current.showToast({
            ...content,
            dedupeKey: latest.current.scope,
          }),
        update: content =>
          latest.current.updateToast(latest.current.scope, content),
        dismiss: () => latest.current.dismissToast(latest.current.scope),
        notify: message => latest.current.showToast({ message, tone: 'info' }),
      },
    })
    return batchRef.current
  }

  /*
    의존성을 비운다 — 진짜 언마운트에만 flush 해야 한다. 토스트 함수나 scope 가 렌더마다 새로 오면 정리 함수가 매번 돌아
    되돌리기 시간도 안 됐는데 삭제가 나간다.
  */
  useEffect(() => {
    const batch = batchRef
    const flush = () => {
      batch.current?.flush()
    }

    window.addEventListener('pagehide', flush)
    return () => {
      window.removeEventListener('pagehide', flush)
      flush()
    }
  }, [])

  return {
    /** 숨긴 직후 부른다. 묶음 토스트를 띄우고 기한을 재기 시작한다. */
    remove: (key: Key, copy: Copy) => getBatch().remove(key, copy),
  }
}
