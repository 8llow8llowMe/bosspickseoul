import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  UNDO_ACTION_LABEL,
  UNDO_ALL_ACTION_LABEL,
  createUndoBatch,
  describePendingUndo,
  describeUndoOutcome,
  type UndoBatchCopy,
  type UndoItemCopy,
  type UndoToastContent,
} from '@/lib/ui/undo-batch'

/*
  연달아 지운 항목의 되돌리기를 토스트 하나로 묶는다(#631). 토스트 상한(3) 때문에 밀려난 토스트의 항목은 되돌릴 수
  없었다 — 묶음 토스트가 대기 집합을 그대로 말하고, 기한과 수명이 어긋나지 않는지를 여기서 잠근다.
*/

const DELAY = 10_000

const batchCopy: UndoBatchCopy = {
  removedMany: count => `북마크 ${count}개를 해제했어요.`,
  pendingMany: count => `북마크 ${count}개는 아직 되돌릴 수 있어요.`,
  restoredMany: count => `북마크 ${count}개를 되돌렸어요.`,
  alreadyDoneMany: count => `북마크 ${count}개는 이미 해제됐어요.`,
}

const copyOf = (key: string): UndoItemCopy => ({
  removed: `${key} 북마크를 해제했어요.`,
  pending: `${key} 북마크는 아직 되돌릴 수 있어요.`,
  alreadyDone: `${key} 북마크는 이미 해제됐어요.`,
})

type ToastLog =
  | { kind: 'show' | 'update'; content: UndoToastContent }
  | { kind: 'dismiss' }
  | { kind: 'notify'; message: string }

const setup = () => {
  const log: ToastLog[] = []
  const commit = vi.fn()
  const restore = vi.fn()
  const batch = createUndoBatch<string, UndoItemCopy>({
    delayMs: DELAY,
    batchCopy,
    commit,
    restore,
    toast: {
      show: content => log.push({ kind: 'show', content }),
      update: content => log.push({ kind: 'update', content }),
      dismiss: () => log.push({ kind: 'dismiss' }),
      notify: message => log.push({ kind: 'notify', message }),
    },
  })

  /** 지금 화면에 떠 있을 묶음 토스트 내용(마지막 show·update, dismiss 뒤면 null). */
  const current = (): UndoToastContent | null => {
    for (let index = log.length - 1; index >= 0; index -= 1) {
      const entry = log[index]
      if (entry.kind === 'dismiss') return null
      if (entry.kind === 'show' || entry.kind === 'update') return entry.content
    }
    return null
  }

  return { batch, log, commit, restore, current }
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('describePendingUndo', () => {
  it('하나면 이름이 든 문구와 「되돌리기」, 둘 이상이면 개수 문구와 「모두 되돌리기」', () => {
    expect(describePendingUndo(['망원동'], copyOf, batchCopy)).toEqual({
      message: '망원동 북마크를 해제했어요.',
      actionLabel: UNDO_ACTION_LABEL,
    })
    expect(
      describePendingUndo(['망원동', '연남동', '합정동'], copyOf, batchCopy),
    ).toEqual({
      message: '북마크 3개를 해제했어요.',
      actionLabel: UNDO_ALL_ACTION_LABEL,
    })
    expect(describePendingUndo([], copyOf, batchCopy)).toBeNull()
  })

  it('대기가 줄어든 뒤(pending)는 한 일이 아니라 아직 되돌릴 수 있는 것을 말한다', () => {
    expect(
      describePendingUndo(['망원동'], copyOf, batchCopy, 'pending'),
    ).toEqual({
      message: '망원동 북마크는 아직 되돌릴 수 있어요.',
      actionLabel: UNDO_ACTION_LABEL,
    })
    expect(
      describePendingUndo(['a', 'b'], copyOf, batchCopy, 'pending'),
    ).toEqual({
      message: '북마크 2개는 아직 되돌릴 수 있어요.',
      actionLabel: UNDO_ALL_ACTION_LABEL,
    })
  })
})

describe('describeUndoOutcome', () => {
  it('모두 되살렸으면 알릴 것이 없다', () => {
    expect(describeUndoOutcome(['a', 'b'], [], copyOf, batchCopy)).toBeNull()
  })

  it('이미 나간 항목만 있으면 그것만 말한다 — 하나면 이름으로', () => {
    expect(describeUndoOutcome([], ['망원동'], copyOf, batchCopy)).toBe(
      '망원동 북마크는 이미 해제됐어요.',
    )
    expect(describeUndoOutcome([], ['a', 'b'], copyOf, batchCopy)).toBe(
      '북마크 2개는 이미 해제됐어요.',
    )
  })

  it('섞여 있으면 되살린 것과 못 되살린 것을 둘 다 개수로 말한다 — 하나여도', () => {
    expect(describeUndoOutcome(['a', 'b'], ['망원동'], copyOf, batchCopy)).toBe(
      '북마크 2개를 되돌렸어요. 북마크 1개는 이미 해제됐어요.',
    )
  })
})

describe('createUndoBatch', () => {
  it('연달아 4개를 지워도 토스트는 하나이고, 모두 되돌리면 하나도 보내지 않는다', () => {
    const { batch, log, commit, restore, current } = setup()

    ;['a', 'b', 'c', 'd'].forEach(key => batch.remove(key, copyOf(key)))

    expect(log.every(entry => entry.kind === 'show')).toBe(true)
    expect(current()).toMatchObject({
      message: '북마크 4개를 해제했어요.',
      action: { label: UNDO_ALL_ACTION_LABEL },
    })

    current()?.action.onAction()

    expect(restore).toHaveBeenCalledExactlyOnceWith(['a', 'b', 'c', 'd'])
    expect(current()).toBeNull()
    expect(log.some(entry => entry.kind === 'notify')).toBe(false)

    vi.advanceTimersByTime(DELAY)
    expect(commit).not.toHaveBeenCalled()
  })

  it('항목마다 기한은 독립이다 — 먼저 지운 항목이 빠지면 문구만 고치고(수명 유지), 마지막이 빠지면 닫는다', () => {
    const { batch, log, commit, current } = setup()

    batch.remove('a', copyOf('a'))
    vi.advanceTimersByTime(3_000)
    batch.remove('b', copyOf('b'))
    expect(current()?.message).toBe('북마크 2개를 해제했어요.')

    vi.advanceTimersByTime(7_000)
    expect(commit).toHaveBeenCalledExactlyOnceWith('a', copyOf('a'))
    // 빠질 때는 update — 토스트 수명을 새로 주지 않는다.
    expect(log.at(-1)).toMatchObject({
      kind: 'update',
      content: {
        message: 'b 북마크는 아직 되돌릴 수 있어요.',
        action: { label: UNDO_ACTION_LABEL },
      },
    })

    vi.advanceTimersByTime(3_000)
    expect(commit).toHaveBeenLastCalledWith('b', copyOf('b'))
    expect(log.at(-1)).toEqual({ kind: 'dismiss' })
  })

  it('갱신된 토스트의 되돌리기는 아직 남은 항목만 되살린다', () => {
    const { batch, commit, restore, current } = setup()

    batch.remove('a', copyOf('a'))
    vi.advanceTimersByTime(5_000)
    batch.remove('b', copyOf('b'))
    batch.remove('c', copyOf('c'))
    vi.advanceTimersByTime(5_000)
    expect(commit).toHaveBeenCalledExactlyOnceWith('a', copyOf('a'))
    // 실제로 해제한 것은 3개다 — 「2개를 해제했어요」가 아니라 되돌릴 수 있는 수를 말한다.
    expect(current()?.message).toBe('북마크 2개는 아직 되돌릴 수 있어요.')

    current()?.action.onAction()

    expect(restore).toHaveBeenCalledExactlyOnceWith(['b', 'c'])
    vi.advanceTimersByTime(DELAY)
    expect(commit).toHaveBeenCalledTimes(1)
  })

  it('누른 순간 이미 나간 항목이 섞여 있었으면(경쟁) 되살린 것과 못 되살린 것을 알린다', () => {
    const { batch, log, restore, current } = setup()

    batch.remove('a', copyOf('a'))
    vi.advanceTimersByTime(1_000)
    batch.remove('b', copyOf('b'))
    batch.remove('c', copyOf('c'))
    // 버튼이 만들어진 순간의 묶음(a·b·c)을 잡아 둔다 — a 의 기한이 지난 뒤 늦게 눌린 상황.
    const stale = current()!
    vi.advanceTimersByTime(9_000)

    stale.action.onAction()

    expect(restore).toHaveBeenCalledExactlyOnceWith(['b', 'c'])
    expect(log.at(-1)).toEqual({
      kind: 'notify',
      message: '북마크 2개를 되돌렸어요. 북마크 1개는 이미 해제됐어요.',
    })
  })

  it('모두 이미 나갔으면 되살리지 않고 그렇다고만 알린다', () => {
    const { batch, log, restore, current } = setup()

    batch.remove('a', copyOf('a'))
    const stale = current()!
    vi.advanceTimersByTime(DELAY)

    stale.action.onAction()

    expect(restore).not.toHaveBeenCalled()
    expect(log.at(-1)).toEqual({
      kind: 'notify',
      message: 'a 북마크는 이미 해제됐어요.',
    })
  })

  it('옛 버튼이 늦게 눌려 그 뒤에 지운 항목이 남으면, 남은 항목으로 토스트를 다시 띄운다', () => {
    const { batch, log, restore, commit } = setup()

    batch.remove('a', copyOf('a'))
    // a 만 기억한 버튼. 그 뒤 b 를 지워 토스트는 교체됐지만, 옛 버튼이 눌린 상황.
    const stale = log.at(-1) as { kind: 'show'; content: UndoToastContent }
    batch.remove('b', copyOf('b'))

    stale.content.action.onAction()

    expect(restore).toHaveBeenCalledExactlyOnceWith(['a'])
    expect(log.at(-1)).toEqual({
      kind: 'show',
      content: {
        message: 'b 북마크는 아직 되돌릴 수 있어요.',
        action: { label: UNDO_ACTION_LABEL, onAction: expect.any(Function) },
      },
    })
    expect(batch.pendingKeys()).toEqual(['b'])

    vi.advanceTimersByTime(DELAY)
    expect(commit).toHaveBeenCalledExactlyOnceWith('b', copyOf('b'))
    expect(log.at(-1)).toEqual({ kind: 'dismiss' })
  })

  it('flush 는 남은 항목을 바로 보내고 토스트를 닫는다. 그 뒤 기한이 와도 다시 보내지 않는다', () => {
    const { batch, log, commit } = setup()

    batch.remove('a', copyOf('a'))
    batch.remove('b', copyOf('b'))

    expect(batch.flush()).toEqual(['a', 'b'])
    expect(commit.mock.calls.map(([key]) => key)).toEqual(['a', 'b'])
    expect(log.at(-1)).toEqual({ kind: 'dismiss' })
    expect(batch.pendingKeys()).toEqual([])

    vi.advanceTimersByTime(DELAY)
    expect(commit).toHaveBeenCalledTimes(2)
  })
})
