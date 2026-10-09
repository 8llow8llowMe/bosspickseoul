// @vitest-environment jsdom
import { createElement, useState } from 'react'
import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import ConfirmSheet, {
  type ConfirmSheetProps,
} from '@/components/ui/confirm-sheet'

/*
  확인 시트(#581) — window.confirm 대신 쓰는 앱 확인 창. 포커스 가두기 · Esc · 포커스 복귀를 실제 DOM 에서 잠근다.
*/

afterEach(() => {
  cleanup()
  document.body.style.overflow = ''
  vi.restoreAllMocks()
})

const flushFrames = async (count = 2) => {
  for (let index = 0; index < count; index += 1) {
    await act(async () => {
      await new Promise(resolve => requestAnimationFrame(() => resolve(null)))
    })
  }
}

const baseProps: ConfirmSheetProps = {
  open: true,
  title: '글을 삭제할까요?',
  description: '글을 삭제하면 달린 댓글도 함께 사라져요.',
  confirmLabel: '삭제',
  onConfirm: () => undefined,
  onCancel: () => undefined,
}

/** 트리거 버튼으로 열고 닫는 하네스 — 포커스 복귀를 본다. */
function Harness(props: Partial<ConfirmSheetProps>) {
  const [open, setOpen] = useState(false)

  return createElement(
    'div',
    null,
    createElement(
      'button',
      { type: 'button', onClick: () => setOpen(true) },
      '열기',
    ),
    createElement(ConfirmSheet, {
      ...baseProps,
      ...props,
      open,
      onCancel: () => {
        props.onCancel?.()
        setOpen(false)
      },
      onConfirm: () => {
        props.onConfirm?.()
        setOpen(false)
      },
    }),
  )
}

const dialog = () =>
  document.body.querySelector<HTMLElement>('[role="alertdialog"]')
const button = (text: string) =>
  Array.from(document.body.querySelectorAll<HTMLButtonElement>('button')).find(
    item => item.textContent?.trim() === text,
  )!

const openHarness = async (props: Partial<ConfirmSheetProps> = {}) => {
  render(createElement(Harness, props))
  const trigger = button('열기')
  trigger.focus()
  fireEvent.click(trigger)
  await flushFrames()
  return trigger
}

describe('ConfirmSheet', () => {
  it('제목과 결과 한 줄을 alertdialog 이름·설명으로 잇고, danger 확인 · ghost 취소 두 버튼을 그린다', async () => {
    await openHarness()
    const panel = dialog()!

    expect(panel.getAttribute('aria-modal')).toBe('true')
    expect(
      document.getElementById(panel.getAttribute('aria-labelledby')!)
        ?.textContent,
    ).toBe('글을 삭제할까요?')
    expect(
      document.getElementById(panel.getAttribute('aria-describedby')!)
        ?.textContent,
    ).toBe('글을 삭제하면 달린 댓글도 함께 사라져요.')
    expect(panel.querySelectorAll('button')).toHaveLength(2)
    expect(document.body.style.overflow).toBe('hidden')
  })

  it('첫 포커스는 취소다 — 실수로 Enter 를 눌러도 지우지 않는다', async () => {
    await openHarness()

    expect(document.activeElement).toBe(button('취소'))
  })

  it('Tab 은 시트 안을 돈다(포커스 가두기)', async () => {
    await openHarness()
    const panel = dialog()!

    fireEvent.keyDown(panel, { key: 'Tab' })
    expect(document.activeElement).toBe(button('삭제'))
    fireEvent.keyDown(panel, { key: 'Tab' })
    expect(document.activeElement).toBe(button('취소'))
    fireEvent.keyDown(panel, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(button('삭제'))
  })

  it('Esc 는 취소다 — 닫고 연 버튼으로 포커스를 돌려준다', async () => {
    const onCancel = vi.fn()
    const onConfirm = vi.fn()
    const trigger = await openHarness({ onCancel, onConfirm })

    fireEvent.keyDown(dialog()!, { key: 'Escape' })

    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(onConfirm).not.toHaveBeenCalled()
    expect(dialog()).toBeNull()
    expect(document.activeElement).toBe(trigger)
    expect(document.body.style.overflow).toBe('')
  })

  it('바깥을 누르면 취소, 확인을 누르면 확인만 부른다', async () => {
    const onCancel = vi.fn()
    const onConfirm = vi.fn()
    await openHarness({ onCancel, onConfirm })

    fireEvent.mouseDown(dialog()!.parentElement!)
    expect(onCancel).toHaveBeenCalledTimes(1)

    fireEvent.click(button('열기'))
    await flushFrames()
    fireEvent.click(button('삭제'))
    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('요청 중이면 Esc·취소·확인이 듣지 않는다', async () => {
    const onCancel = vi.fn()
    const onConfirm = vi.fn()
    render(
      createElement(ConfirmSheet, {
        ...baseProps,
        pending: true,
        pendingLabel: '삭제 중',
        onCancel,
        onConfirm,
      }),
    )
    await flushFrames()

    fireEvent.keyDown(dialog()!, { key: 'Escape' })
    fireEvent.mouseDown(dialog()!.parentElement!)

    expect(onCancel).not.toHaveBeenCalled()
    expect(
      dialog()!.querySelector('[role="status"]')?.getAttribute('aria-label'),
    ).toBe('삭제 중')
  })

  it('요청이 시작돼 버튼이 잠겨도 포커스는 시트(패널)에 남아 Esc·Tab 을 시트가 받는다', async () => {
    const onCancel = vi.fn()
    const props: ConfirmSheetProps = { ...baseProps, onCancel }
    const view = render(createElement(ConfirmSheet, props))
    await flushFrames()

    button('삭제').focus()
    view.rerender(
      createElement(ConfirmSheet, {
        ...props,
        pending: true,
        pendingLabel: '삭제 중',
      }),
    )
    await flushFrames()

    const panel = dialog()!
    // 잠긴 버튼에 머물면 브라우저가 포커스를 body 로 떨어뜨려 시트의 키 처리가 끊긴다.
    expect(document.activeElement).toBe(panel)

    fireEvent.keyDown(document.activeElement!, { key: 'Tab' })
    expect(document.activeElement).toBe(panel)
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' })
    expect(onCancel).not.toHaveBeenCalled()

    // 요청이 실패해 풀리면 다시 Esc 로 닫을 수 있다.
    view.rerender(createElement(ConfirmSheet, props))
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' })
    expect(onCancel).toHaveBeenCalledTimes(1)
  })
})
