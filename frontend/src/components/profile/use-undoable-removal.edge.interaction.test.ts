// @vitest-environment jsdom
import { createElement } from 'react'
import { act, cleanup, render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  UNDO_ACTION_LABEL,
  UNDO_ALL_ACTION_LABEL,
  type ProfileRemovalBatchCopy,
  type UndoableRemovalCopy,
  useUndoableRemoval,
} from '@/components/profile/use-undoable-removal'
import type { ShowToastInput } from '@/components/ui/toast'
import { TOAST_ACTION_DURATION_MS } from '@/lib/ui/toast-state'

/*
  지연 삭제의 경계 경로(리뷰 B16). 실제 토스트는 되돌리기 버튼을 10초 뒤에 닫아 「커밋 뒤 되돌리기」를 재현할 수 없으므로,
  여기서는 토스트를 가로채 동작(onAction)을 원하는 순간에 직접 누른다.
*/

const toast = vi.hoisted(() => ({
  shown: [] as ShowToastInput[],
  dismissed: [] as string[],
  updated: [] as { key: string; input: Pick<ShowToastInput, 'message'> }[],
}))

vi.mock('@/components/ui/toast', () => ({
  useToast: () => ({
    showToast: (input: ShowToastInput) => {
      toast.shown.push(input)
    },
    dismissToast: (key: string) => {
      toast.dismissed.push(key)
    },
    updateToast: (key: string, input: Pick<ShowToastInput, 'message'>) => {
      toast.updated.push({ key, input })
    },
  }),
}))

const SCOPE = 'edge-removal'

const batchCopy: ProfileRemovalBatchCopy = {
  removedMany: count => `항목 ${count}개를 삭제했어요.`,
  pendingMany: count => `항목 ${count}개는 아직 되돌릴 수 있어요.`,
  restoredMany: count => `항목 ${count}개를 되살렸어요.`,
  alreadyDoneMany: count => `항목 ${count}개는 이미 삭제됐어요.`,
  restoredOnFailureMany: count =>
    `항목 ${count}개를 삭제하지 못해 다시 보여 드려요.`,
  failedMany: count => `항목 ${count}개를 삭제하지 못했어요.`,
}

const copyOf = (key: string): UndoableRemovalCopy => ({
  removed: `${key} 삭제했어요.`,
  pending: `${key} 아직 되돌릴 수 있어요.`,
  restored: `${key} 삭제하지 못해 다시 보여 드려요.`,
  failed: `${key} 삭제하지 못했어요.`,
  alreadyDone: `${key} 이미 삭제됐어요.`,
})

type Api = ReturnType<typeof useUndoableRemoval>

const mount = (commit: (key: string) => Promise<void>) => {
  const api: { current: Api | null } = { current: null }

  function Harness() {
    api.current = useUndoableRemoval({ scope: SCOPE, batchCopy, commit })
    return null
  }

  const view = render(createElement(Harness))
  return { api, view }
}

/** 마지막으로 띄운 묶음 토스트(키 = scope). 버튼은 그 순간의 대기 항목을 기억한다. */
const lastBatchToast = () =>
  [...toast.shown].reverse().find(item => item.dedupeKey === SCOPE)

/** 마지막으로 띄운 묶음 토스트의 되돌리기를 누른다(기한이 지난 뒤 늦게 눌린 상황을 재현한다). */
const pressUndo = () => {
  const removedToast = lastBatchToast()
  act(() => {
    removedToast?.action?.onAction()
  })
}

const skipUndoWindow = async () => {
  await act(async () => {
    vi.advanceTimersByTime(TOAST_ACTION_DURATION_MS)
  })
}

beforeEach(() => {
  toast.shown = []
  toast.dismissed = []
  toast.updated = []
  vi.useFakeTimers({
    toFake: ['setTimeout', 'clearTimeout'],
    shouldAdvanceTime: true,
  })
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('useUndoableRemoval — 경계 경로', () => {
  it('탭을 닫거나 새로고침하면(pagehide) 기다리던 삭제를 바로 보내고 토스트를 닫는다', async () => {
    const commit = vi.fn(async () => undefined)
    const { api } = mount(commit)

    act(() => api.current!.remove('a', copyOf('a')))
    expect(commit).not.toHaveBeenCalled()

    act(() => {
      window.dispatchEvent(new Event('pagehide'))
    })

    await waitFor(() => expect(commit).toHaveBeenCalledExactlyOnceWith('a'))
    expect(toast.dismissed).toContain(SCOPE)

    // 이미 보냈으니 시간이 지나도 다시 보내지 않는다.
    await skipUndoWindow()
    expect(commit).toHaveBeenCalledTimes(1)
  })

  it('이미 보낸 뒤 되돌리기를 누르면 되살리지 않고 「이미 삭제됐어요」라고 알린다', async () => {
    const commit = vi.fn(async () => undefined)
    const { api } = mount(commit)

    act(() => api.current!.remove('a', copyOf('a')))
    await skipUndoWindow()
    await waitFor(() => expect(commit).toHaveBeenCalledTimes(1))

    pressUndo()

    expect(toast.shown.at(-1)).toMatchObject({
      message: 'a 이미 삭제됐어요.',
      tone: 'info',
    })
    expect(api.current!.hiddenKeys.has('a')).toBe(true)
  })

  it('잇달아 지운 항목은 토스트 하나로 묶고, 「모두 되돌리기」는 모두 되살리며 아무것도 보내지 않는다', async () => {
    const commit = vi.fn(async () => undefined)
    const { api } = mount(commit)

    ;['a', 'b', 'c', 'd'].forEach(key => {
      act(() => api.current!.remove(key, copyOf(key)))
    })
    expect([...api.current!.hiddenKeys]).toEqual(['a', 'b', 'c', 'd'])

    // 토스트는 키 하나로만 뜬다 — 상한(3)에 밀려 사라질 토스트가 없다.
    expect(new Set(toast.shown.map(item => item.dedupeKey))).toEqual(
      new Set([SCOPE]),
    )
    expect(lastBatchToast()).toMatchObject({
      message: '항목 4개를 삭제했어요.',
      action: { label: UNDO_ALL_ACTION_LABEL },
    })

    pressUndo()
    expect([...api.current!.hiddenKeys]).toEqual([])

    await skipUndoWindow()
    expect(commit).not.toHaveBeenCalled()
  })

  it('먼저 지운 항목의 기한이 지나면 그 항목만 보내고, 토스트는 남은 항목의 이름으로 고친다(수명 유지)', async () => {
    const commit = vi.fn(async () => undefined)
    const { api } = mount(commit)

    act(() => api.current!.remove('a', copyOf('a')))
    await act(async () => {
      vi.advanceTimersByTime(4_000)
    })
    act(() => api.current!.remove('b', copyOf('b')))

    await act(async () => {
      vi.advanceTimersByTime(TOAST_ACTION_DURATION_MS - 4_000)
    })
    await waitFor(() => expect(commit).toHaveBeenCalledExactlyOnceWith('a'))
    expect(toast.updated.at(-1)).toMatchObject({
      key: SCOPE,
      input: {
        message: 'b 아직 되돌릴 수 있어요.',
        action: { label: UNDO_ACTION_LABEL },
      },
    })

    await act(async () => {
      vi.advanceTimersByTime(4_000)
    })
    await waitFor(() => expect(commit).toHaveBeenLastCalledWith('b'))
    expect(toast.dismissed.at(-1)).toBe(SCOPE)
  })

  it('누른 순간 이미 보낸 항목이 섞여 있으면 남은 것만 되살리고 결과를 알린다', async () => {
    const commit = vi.fn(async () => undefined)
    const { api } = mount(commit)

    act(() => api.current!.remove('a', copyOf('a')))
    await act(async () => {
      vi.advanceTimersByTime(1_000)
    })
    act(() => api.current!.remove('b', copyOf('b')))
    act(() => api.current!.remove('c', copyOf('c')))
    await act(async () => {
      vi.advanceTimersByTime(TOAST_ACTION_DURATION_MS - 1_000)
    })
    await waitFor(() => expect(commit).toHaveBeenCalledExactlyOnceWith('a'))

    // a·b·c 를 기억한 버튼이 a 의 기한 뒤에 눌렸다.
    pressUndo()

    expect([...api.current!.hiddenKeys]).toEqual(['a'])
    expect(toast.shown.at(-1)).toMatchObject({
      message: '항목 2개를 되살렸어요. 항목 1개는 이미 삭제됐어요.',
      tone: 'info',
    })
    await skipUndoWindow()
    expect(commit).toHaveBeenCalledTimes(1)
  })

  it('시간이 다 돼 보낸 뒤 화면을 떠나도 DELETE 는 한 번이다', async () => {
    const commit = vi.fn(async () => undefined)
    const { api, view } = mount(commit)

    act(() => api.current!.remove('a', copyOf('a')))
    await skipUndoWindow()
    view.unmount()

    await waitFor(() => expect(commit).toHaveBeenCalledTimes(1))
  })

  it('화면을 떠나 먼저 보낸 뒤 원래 시간이 와도 DELETE 는 한 번이다', async () => {
    const commit = vi.fn(async () => undefined)
    const { api, view } = mount(commit)

    act(() => api.current!.remove('a', copyOf('a')))
    view.unmount()
    await skipUndoWindow()

    await waitFor(() => expect(commit).toHaveBeenCalledTimes(1))
  })

  /* 떠난 뒤에는 되살릴 카드가 화면에 없다 — 「다시 보여 드려요」는 틀린 말이다. */
  it('화면을 떠난 뒤 실패하면 「…하지 못했어요」로 알린다', async () => {
    const commit = vi.fn(async () => {
      throw new Error('잠시 후 다시 시도해 주세요.')
    })
    const { api, view } = mount(commit)

    act(() => api.current!.remove('a', copyOf('a')))
    view.unmount()

    await waitFor(() =>
      expect(toast.shown.at(-1)).toMatchObject({
        message: 'a 삭제하지 못했어요. 잠시 후 다시 시도해 주세요.',
        tone: 'error',
      }),
    )
  })

  it('화면에 있는 동안 실패하면 되살리고 「다시 보여 드려요」로 알린다', async () => {
    const commit = vi.fn(async () => {
      throw new Error('권한이 없어요.')
    })
    const { api } = mount(commit)

    act(() => api.current!.remove('a', copyOf('a')))
    await skipUndoWindow()

    await waitFor(() =>
      expect(toast.shown.at(-1)?.message).toBe(
        'a 삭제하지 못해 다시 보여 드려요. 권한이 없어요.',
      ),
    )
    expect(api.current!.hiddenKeys.has('a')).toBe(false)
  })

  /*
    실패 토스트가 여러 장 쌓이면 토스트 상한(3)에 묶음 되돌리기 토스트가 밀려 남은 항목을 되돌릴 수 없다 — 화면마다 한 장으로
    묶고, 이어진 실패는 개수로 말한다.
  */
  it('여러 건이 실패해도 실패 토스트는 한 장이고, 이어진 실패는 개수로 말한다', async () => {
    const commit = vi.fn(async () => {
      throw new Error('권한이 없어요.')
    })
    const { api } = mount(commit)

    act(() => api.current!.remove('a', copyOf('a')))
    act(() => api.current!.remove('b', copyOf('b')))
    await skipUndoWindow()

    await waitFor(() => expect(commit).toHaveBeenCalledTimes(2))
    await waitFor(() =>
      expect(toast.shown.at(-1)).toMatchObject({
        message: '항목 2개를 삭제하지 못해 다시 보여 드려요. 권한이 없어요.',
        tone: 'error',
        dedupeKey: `${SCOPE}:failed`,
      }),
    )
    const failures = toast.shown.filter(item => item.tone === 'error')
    expect(failures.map(item => item.dedupeKey)).toEqual([
      `${SCOPE}:failed`,
      `${SCOPE}:failed`,
    ])
    expect(failures[0]?.message).toBe(
      'a 삭제하지 못해 다시 보여 드려요. 권한이 없어요.',
    )
  })
})
