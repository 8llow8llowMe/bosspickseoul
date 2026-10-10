/*
  연달아 지운 항목의 「되돌리기」를 토스트 하나로 묶는다(#631). React 를 모르는 순수 모듈이다.

  예전에는 항목마다 되돌리기 토스트를 하나씩 띄웠다. 토스트 상한(`TOAST_LIMIT` 3) 때문에 4번째부터 가장 오래된 토스트가
  밀려나 사라지고, 그 항목의 지연 삭제는 10초 뒤 그대로 나가 사용자는 되돌릴 방법을 잃었다. 그래서 **한 화면(scope) =
  토스트 하나**로 묶는다.

  - 항목마다 기한은 독립이다(각자 10초). 기한이 지난 항목은 대기 집합에서 빠지고 토스트 문구를 고친다. 대기 항목이
    없어지면 토스트를 닫는다 — 되돌릴 것이 없는 버튼을 남기지 않는다(#584).
  - 새로 지울 때는 **한 일**을 말한다(「북마크 3개를 해제했어요.」 — 대기 항목이 하나면 그 이름으로). 기한이 지나 대기가
    줄어든 뒤에는 **되돌릴 수 있는 것**을 말한다(「북마크 2개는 아직 되돌릴 수 있어요.」). 줄어든 수로 「2개를 해제했어요」라고
    하면 실제로 해제한 3개와 어긋난다. 고친 문구는 스크린리더가 다시 읽지 않는다(토스트 `updateToast`).
  - 「모두 되돌리기」는 아직 보내지 않은 항목만 되살리고, 누른 순간 이미 나간 항목이 섞여 있었으면 결과로 알린다.

  커뮤니티 댓글 삭제(#581)와 프로필 보관함 지연 삭제(#574)가 `components/ui/use-undo-batch` 를 거쳐 이것을 쓴다.
*/

import { createDeferredCommit } from '@/lib/ui/deferred-commit'

type Timer = ReturnType<typeof setTimeout>

/** 대기 항목이 하나일 때의 버튼 이름. */
export const UNDO_ACTION_LABEL = '되돌리기'

/** 대기 항목이 둘 이상일 때의 버튼 이름. 하나만 되돌리는 줄 알고 누르지 않게 「모두」를 붙인다. */
export const UNDO_ALL_ACTION_LABEL = '모두 되돌리기'

/** 항목 하나의 문구. 이름이 든 완결 문장으로 쓴다. */
export type UndoItemCopy = {
  /** 예) 「망원동 북마크를 해제했어요.」 */
  removed: string
  /** 다른 항목의 기한이 지나 이 항목만 남았을 때. 예) 「망원동 북마크는 아직 되돌릴 수 있어요.」 */
  pending: string
  /** 되돌리기를 눌렀는데 이미 보냈을 때. 예) 「망원동 북마크는 이미 해제됐어요.」 */
  alreadyDone: string
}

/**
 * 여러 항목을 한꺼번에 말하는 문구. 명사·조사·단위가 화면마다 달라(「북마크 3개를」 · 「기기 3대의 로그인을」) 개수를 받는
 * 함수로 받는다. 모두 주어·목적어를 갖춘 완결 문장으로 쓴다.
 */
export type UndoBatchCopy = {
  /** 예) count 3 → 「북마크 3개를 해제했어요.」 */
  removedMany: (count: number) => string
  /** 기한이 지나 대기가 줄어든 뒤. 예) count 2 → 「북마크 2개는 아직 되돌릴 수 있어요.」 */
  pendingMany: (count: number) => string
  /** 예) count 2 → 「북마크 2개의 해제를 되돌렸어요.」 */
  restoredMany: (count: number) => string
  /** 예) count 2 → 「북마크 2개는 이미 해제됐어요.」 */
  alreadyDoneMany: (count: number) => string
}

export type UndoToastContent = {
  message: string
  action: { label: string; onAction: () => void }
}

/**
 * 대기 항목으로 토스트 문구와 버튼 이름을 정한다. 대기 항목이 없으면 null(토스트를 닫는다).
 *
 * `phase` — `removed` 는 방금 지운 때(한 일을 말한다), `pending` 은 기한이 지나거나 되돌리기로 대기가 줄어든 뒤(아직 되돌릴
 * 수 있는 것을 말한다).
 */
export const describePendingUndo = <Key>(
  pending: readonly Key[],
  copyOf: (key: Key) => UndoItemCopy,
  batchCopy: UndoBatchCopy,
  phase: 'removed' | 'pending' = 'removed',
): { message: string; actionLabel: string } | null => {
  if (pending.length === 0) return null
  if (pending.length === 1) {
    const copy = copyOf(pending[0])
    return {
      message: phase === 'removed' ? copy.removed : copy.pending,
      actionLabel: UNDO_ACTION_LABEL,
    }
  }
  return {
    message:
      phase === 'removed'
        ? batchCopy.removedMany(pending.length)
        : batchCopy.pendingMany(pending.length),
    actionLabel: UNDO_ALL_ACTION_LABEL,
  }
}

/**
 * 되돌리기를 누른 결과 문구. 모두 되살렸으면 null — 다시 나타난 카드가 결과다. 이미 나간 항목이 있으면 그것을 말한다.
 * 아무 일 없이 토스트만 닫히면 사용자는 모두 돌아온 줄 안다.
 *
 * 되살린 것과 못 되살린 것이 섞였으면 **둘 다 개수로** 말한다(「댓글 2개를 되살렸어요. 댓글 1개는 이미 삭제됐어요.」).
 * 한쪽만 개수, 한쪽은 이름 없는 문장(「댓글이 이미 삭제됐어요.」)이면 무엇이 지워졌는지 모호하다. 못 되살린 것만 있으면
 * 하나일 때 그 항목의 문구로 말한다.
 */
export const describeUndoOutcome = <Key>(
  restored: readonly Key[],
  missed: readonly Key[],
  copyOf: (key: Key) => UndoItemCopy,
  batchCopy: UndoBatchCopy,
): string | null => {
  if (missed.length === 0) return null

  if (restored.length > 0) {
    return `${batchCopy.restoredMany(restored.length)} ${batchCopy.alreadyDoneMany(missed.length)}`
  }

  return missed.length === 1
    ? copyOf(missed[0]).alreadyDone
    : batchCopy.alreadyDoneMany(missed.length)
}

/** 토스트를 다루는 자리. 묶음 토스트 하나(같은 키)만 다룬다 — 키는 부르는 쪽이 붙인다. */
export type UndoBatchToastPort = {
  /** 새로 띄우거나 교체한다. 수명을 새로 잰다(새 항목의 기한과 같다). */
  show: (content: UndoToastContent) => void
  /** 떠 있으면 문구만 고친다. 수명은 이어서 잰다. 닫혔으면 아무 일도 없다. */
  update: (content: UndoToastContent) => void
  dismiss: () => void
  /** 되돌리기 결과 안내(묶음 토스트와 다른 토스트). */
  notify: (message: string) => void
}

export type UndoBatchOptions<Key, Copy extends UndoItemCopy> = {
  delayMs: number
  batchCopy: UndoBatchCopy
  /** 기한이 지났거나 화면을 떠나 보낼 때. 항목의 문구를 같이 넘긴다(실패 안내에 쓴다). */
  commit: (key: Key, copy: Copy) => void
  /** 되돌리기로 되살린 항목들. */
  restore: (keys: Key[]) => void
  toast: UndoBatchToastPort
  setTimer?: (callback: () => void, delayMs: number) => Timer
  clearTimer?: (timer: Timer) => void
}

/**
 * 묶음 되돌리기. `remove` 로 예약하고, 기한이 지나면 `commit`, 되돌리면 `restore`, `flush` 는 남은 것을 바로 보낸다.
 *
 * 토스트 수명과 기한이 어긋나지 않는 이유: 새 항목을 넣을 때만 토스트를 새로 띄워(`show`) 수명을 새로 재고, 그 수명은
 * 가장 늦게 넣은 항목의 기한과 같다. 앞 항목이 빠질 때는 문구만 고쳐(`update`) 수명을 늘리지 않는다. 마지막 항목이
 * 빠지면 닫는다. 그래서 토스트는 마지막 항목의 기한까지 떠 있고, 그 뒤에는 남지 않는다.
 */
export const createUndoBatch = <Key, Copy extends UndoItemCopy>({
  delayMs,
  batchCopy,
  commit,
  restore,
  toast,
  setTimer,
  clearTimer,
}: UndoBatchOptions<Key, Copy>) => {
  /* 아직 보내지 않은 항목. 넣은 순서를 지킨다. */
  const pending = new Set<Key>()
  /*
    항목별 문구. 보낸 뒤에도 남긴다 — 누른 순간 이미 나간 항목을 「망원동 북마크는 이미 해제됐어요.」처럼 이름으로 알려야
    한다. 되살린 항목만 지운다. 한 화면에서 지운 개수만큼만 쌓이고 화면을 떠나면 함께 사라진다.
  */
  const copies = new Map<Key, Copy>()
  const copyOf = (key: Key): Copy => copies.get(key) as Copy

  /* 지금 대기 집합으로 토스트 내용을 만든다. 버튼은 만든 순간의 집합을 기억한다(누른 순간과의 경쟁은 undoAll 이 가린다). */
  const contentOf = (phase: 'removed' | 'pending'): UndoToastContent | null => {
    const keys = [...pending]
    const described = describePendingUndo(keys, copyOf, batchCopy, phase)
    if (!described) return null
    return {
      message: described.message,
      action: { label: described.actionLabel, onAction: () => undoAll(keys) },
    }
  }

  const queue = createDeferredCommit<Key>({
    delayMs,
    setTimer,
    clearTimer,
    commit: key => {
      pending.delete(key)

      /*
        문구만 고친다 — 수명을 새로 주면 마지막 항목의 기한이 지난 뒤에도 토스트가 남는다. 문구는 「아직 되돌릴 수 있어요」:
        줄어든 수로 「…했어요」라고 하면 실제로 한 일과 어긋난다.
      */
      const content = contentOf('pending')
      if (content) {
        toast.update(content)
      } else {
        toast.dismiss()
      }

      commit(key, copyOf(key))
    },
  })

  /**
   * 버튼이 만들어질 때 대기 중이던 항목을 되살린다. 그 사이 기한이 지나 이미 보낸 항목은 되살리지 못하므로 결과로 알린다.
   */
  const undoAll = (keys: readonly Key[]) => {
    const restored: Key[] = []
    const missed: Key[] = []

    keys.forEach(key => {
      if (queue.undo(key)) {
        restored.push(key)
        pending.delete(key)
      } else {
        missed.push(key)
      }
    })

    const outcome = describeUndoOutcome(restored, missed, copyOf, batchCopy)
    restored.forEach(key => copies.delete(key))

    if (restored.length > 0) restore(restored)

    /*
      남은 대기 항목이 있으면(버튼이 만들어진 뒤에 들어온 것) 그 집합으로 다시 띄운다. 없으면 닫는다 — 버튼을 누르면
      토스트도 닫히지만, 키로도 닫아 두면 경쟁으로 남은 토스트가 없다. 방금 지운 것이 아니므로 「아직 되돌릴 수 있어요」로
      말한다. 수명이 새로 잡혀도 남은 항목의 기한이 오면 그 항목이 빠지며 닫힌다.
    */
    const content = contentOf('pending')
    if (content) {
      toast.show(content)
    } else {
      toast.dismiss()
    }

    if (outcome) toast.notify(outcome)

    return { restored, missed }
  }

  return {
    /** 숨긴 직후 부른다. 기한을 재기 시작하고 묶음 토스트를 새로 띄운다(수명 = 이 항목의 기한). */
    remove: (key: Key, copy: Copy) => {
      copies.set(key, copy)
      pending.delete(key)
      pending.add(key)
      queue.schedule(key)

      const content = contentOf('removed')
      if (content) toast.show(content)
    },
    /** 남은 예약을 바로 보낸다(화면 이탈). 토스트는 닫는다 — 떠난 뒤 누르면 되돌릴 것이 없다. */
    flush: () => {
      const keys = queue.flush()
      toast.dismiss()
      return keys
    },
    pendingKeys: () => [...pending],
  }
}
