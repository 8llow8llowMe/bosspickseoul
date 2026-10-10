// @vitest-environment jsdom
import { createElement } from 'react'
import { act, cleanup, render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
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
}))

vi.mock('@/components/ui/toast', () => ({
  useToast: () => ({
    showToast: (input: ShowToastInput) => {
      toast.shown.push(input)
    },
    dismissToast: (key: string) => {
      toast.dismissed.push(key)
    },
  }),
}))

const SCOPE = 'edge-removal'

const copyOf = (key: string): UndoableRemovalCopy => ({
  removed: `${key} 삭제했어요.`,
  restored: `${key} 삭제하지 못해 다시 보여 드려요.`,
  failed: `${key} 삭제하지 못했어요.`,
  alreadyDone: `${key} 이미 삭제됐어요.`,
})

type Api = ReturnType<typeof useUndoableRemoval>

const mount = (commit: (key: string) => Promise<void>) => {
  const api: { current: Api | null } = { current: null }

  function Harness() {
    api.current = useUndoableRemoval({ scope: SCOPE, commit })
    return null
  }

  const view = render(createElement(Harness))
  return { api, view }
}

/** 마지막으로 띄운 「삭제했어요」 토스트의 되돌리기를 누른다. */
const pressUndo = (key: string) => {
  const removedToast = [...toast.shown]
    .reverse()
    .find(item => item.dedupeKey === `${SCOPE}:${key}`)
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
    expect(toast.dismissed).toContain(`${SCOPE}:a`)

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

    pressUndo('a')

    expect(toast.shown.at(-1)).toMatchObject({
      message: 'a 이미 삭제됐어요.',
      tone: 'info',
    })
    expect(api.current!.hiddenKeys.has('a')).toBe(true)
  })

  it('두 항목을 잇달아 지우고 하나만 되돌리면 다른 하나는 그대로 지워진다', async () => {
    const commit = vi.fn(async () => undefined)
    const { api } = mount(commit)

    act(() => api.current!.remove('a', copyOf('a')))
    act(() => api.current!.remove('b', copyOf('b')))
    expect([...api.current!.hiddenKeys]).toEqual(['a', 'b'])

    pressUndo('a')
    expect([...api.current!.hiddenKeys]).toEqual(['b'])

    await skipUndoWindow()
    await waitFor(() => expect(commit).toHaveBeenCalledExactlyOnceWith('b'))
    expect(api.current!.hiddenKeys.has('b')).toBe(true)
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
})
