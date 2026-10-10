// @vitest-environment jsdom
import { createElement, type ReactNode } from 'react'
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  UNDO_ACTION_LABEL,
  useUndoableRemoval,
} from '@/components/profile/use-undoable-removal'
import ToastProvider from '@/components/ui/toast'
import { TOAST_ACTION_DURATION_MS } from '@/lib/ui/toast-state'

/*
  프로필 보관함 지연 삭제(#574). 누르면 숨기고, 10초 「되돌리기」가 지나야 DELETE 를 보낸다. 되돌리면 아무것도
  보내지 않고, 실패하면 숨겼던 항목을 되살리며, 화면을 떠나면 기다리던 삭제를 바로 보낸다.
*/

const ITEMS = ['a', 'b'] as const

function Harness({ commit }: { commit: (key: string) => Promise<void> }) {
  const removal = useUndoableRemoval({ scope: 'test-removal', commit })

  return createElement(
    'ul',
    null,
    ITEMS.filter(key => !removal.hiddenKeys.has(key)).map(key =>
      createElement(
        'li',
        { key },
        `항목 ${key}`,
        createElement(
          'button',
          {
            type: 'button',
            onClick: () =>
              removal.remove(key, {
                removed: `항목 ${key}을 삭제했어요.`,
                restored: `항목 ${key}을 삭제하지 못해 다시 보여 드려요.`,
                failed: `항목 ${key}을 삭제하지 못했어요.`,
                alreadyDone: `항목 ${key}은 이미 삭제됐어요.`,
              }),
          },
          `${key} 삭제`,
        ),
      ),
    ),
  )
}

const renderHarness = (commit: (key: string) => Promise<void>) => {
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(ToastProvider, null, children)
  return render(createElement(Harness, { commit }), { wrapper })
}

const text = () => document.body.textContent ?? ''

beforeEach(() => {
  /* setTimeout 만 가짜로 — 10초는 건너뛰되 나머지 비동기는 실제로 흐른다. */
  vi.useFakeTimers({
    toFake: ['setTimeout', 'clearTimeout'],
    shouldAdvanceTime: true,
  })
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('useUndoableRemoval', () => {
  it('누르면 바로 숨기고 되돌리기 토스트를 띄우지만, 요청은 아직 보내지 않는다', () => {
    const commit = vi.fn(async () => undefined)
    renderHarness(commit)

    fireEvent.click(screen.getByText('a 삭제'))

    expect(screen.queryByText('a 삭제')).toBeNull()
    expect(screen.getByText('b 삭제')).toBeTruthy()
    expect(text()).toContain('항목 a을 삭제했어요.')
    expect(screen.getByRole('button', { name: UNDO_ACTION_LABEL })).toBeTruthy()
    expect(commit).not.toHaveBeenCalled()
  })

  it('되돌리면 다시 보이고 요청은 끝까지 나가지 않는다', async () => {
    const commit = vi.fn(async () => undefined)
    renderHarness(commit)

    fireEvent.click(screen.getByText('a 삭제'))
    fireEvent.click(screen.getByRole('button', { name: UNDO_ACTION_LABEL }))

    expect(screen.getByText('a 삭제')).toBeTruthy()
    await act(async () => {
      vi.advanceTimersByTime(TOAST_ACTION_DURATION_MS)
    })
    expect(commit).not.toHaveBeenCalled()
  })

  it('되돌리기 시간이 지나면 그 항목 하나만 DELETE 하고, 성공하면 숨김을 유지한다', async () => {
    const commit = vi.fn(async () => undefined)
    renderHarness(commit)

    fireEvent.click(screen.getByText('a 삭제'))
    await act(async () => {
      vi.advanceTimersByTime(TOAST_ACTION_DURATION_MS)
    })

    await waitFor(() => expect(commit).toHaveBeenCalledExactlyOnceWith('a'))
    /*
      재조회가 늦거나 실패해 옛 목록에 남아 있어도 지운 카드가 다시 비치지 않는다(리뷰 지적 B16). 여기 목록은 고정이라
      숨김을 풀면 바로 다시 보인다 — 그래서 이 단언이 그 회귀를 잡는다.
    */
    await act(async () => {
      await Promise.resolve()
    })
    expect(screen.queryByText('a 삭제')).toBeNull()
    expect(screen.getByText('b 삭제')).toBeTruthy()
  })

  it('실패하면 숨겼던 항목을 되살리고 이유를 알린다', async () => {
    const commit = vi.fn(async () => {
      throw new Error('권한이 없어요.')
    })
    renderHarness(commit)

    fireEvent.click(screen.getByText('a 삭제'))
    await act(async () => {
      vi.advanceTimersByTime(TOAST_ACTION_DURATION_MS)
    })

    await waitFor(() =>
      expect(text()).toContain(
        '항목 a을 삭제하지 못해 다시 보여 드려요. 권한이 없어요.',
      ),
    )
    expect(screen.getByText('a 삭제')).toBeTruthy()
  })

  it('화면을 떠나면 기다리던 삭제를 바로 보내고 되돌리기 토스트를 닫는다', async () => {
    const commit = vi.fn(async () => undefined)

    function Page({ show }: { show: boolean }) {
      return show ? createElement(Harness, { commit }) : null
    }
    const view = render(
      createElement(ToastProvider, null, createElement(Page, { show: true })),
    )

    fireEvent.click(screen.getByText('a 삭제'))
    expect(commit).not.toHaveBeenCalled()

    view.rerender(
      createElement(ToastProvider, null, createElement(Page, { show: false })),
    )

    await waitFor(() => expect(commit).toHaveBeenCalledExactlyOnceWith('a'))
    // 떠난 뒤 누르면 되돌릴 것이 없다 — 성공처럼 닫히는 버튼을 남기지 않는다.
    expect(screen.queryByRole('button', { name: UNDO_ACTION_LABEL })).toBeNull()
  })
})
