// @vitest-environment jsdom
import { createElement, useEffect } from 'react'
import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import ToastProvider, {
  announcementOf,
  useToast,
  type ShowToastInput,
} from '@/components/ui/toast'
import { TOAST_DURATION_MS, TOAST_LIMIT } from '@/lib/ui/toast-state'

/*
  토스트 읽기·타이머(#584) — live region 이 토스트보다 먼저 DOM 에 있는지, 오류만 assertive 인지,
  포인터·포커스가 머무는 동안 자동 해제가 멈추는지를 실제 DOM 에서 잠근다.
*/

let show: (input: ShowToastInput) => void = () => undefined
let dismissByKey: (dedupeKey: string) => void = () => undefined

function Trigger() {
  const { showToast, dismissToast } = useToast()
  useEffect(() => {
    show = showToast
    dismissByKey = dismissToast
  }, [showToast, dismissToast])
  return null
}

const mount = () =>
  render(createElement(ToastProvider, null, createElement(Trigger)))

const politeRegion = () =>
  document.body.querySelector('[data-toast-live="polite"]')
const assertiveRegion = () =>
  document.body.querySelector('[data-toast-live="assertive"]')

/** 보이는 카드(문구 → Body → Card). live region 안의 같은 문구는 건너뛴다. */
const cardOf = (message: string): Element | null => {
  const text = [...document.body.querySelectorAll('p')].find(
    node => node.textContent === message && !node.closest('[data-toast-live]'),
  )
  return text?.parentElement?.parentElement ?? null
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('ToastProvider live region', () => {
  it('토스트를 띄우기 전부터 빈 status·alert 영역이 DOM 에 있다', () => {
    mount()

    const polite = politeRegion()
    const assertive = assertiveRegion()

    expect(polite?.getAttribute('role')).toBe('status')
    expect(polite?.getAttribute('aria-live')).toBe('polite')
    expect(polite?.textContent).toBe('')
    expect(assertive?.getAttribute('role')).toBe('alert')
    expect(assertive?.getAttribute('aria-live')).toBe('assertive')
    expect(assertive?.textContent).toBe('')
  })

  it('같은 영역 노드에 내용만 갈아 끼운다 — 성공은 polite, 오류는 assertive', () => {
    mount()
    const polite = politeRegion()
    const assertive = assertiveRegion()

    act(() => show({ message: '보관함에 저장했어요.' }))
    act(() => show({ message: '저장하지 못했어요.', tone: 'error' }))

    // 영역 노드가 새로 생기지 않았다(처음 잡은 노드 그대로).
    expect(politeRegion()).toBe(polite)
    expect(assertiveRegion()).toBe(assertive)
    expect(polite?.textContent).toBe('보관함에 저장했어요.')
    expect(assertive?.textContent).toBe('저장하지 못했어요.')

    act(() => {
      vi.advanceTimersByTime(TOAST_DURATION_MS.error)
    })

    expect(politeRegion()).toBe(polite)
    expect(assertiveRegion()).toBe(assertive)
    expect(polite?.textContent).toBe('')
    expect(assertive?.textContent).toBe('')
  })
})

describe('ToastProvider 자동 해제 멈춤', () => {
  const message = '보관함에 저장했어요.'

  it('포인터가 카드 위에 있는 동안 사라지지 않고, 떠나면 남은 시간만큼 뒤에 사라진다', () => {
    mount()
    act(() => show({ message }))
    const card = cardOf(message)
    expect(card).not.toBeNull()

    act(() => {
      vi.advanceTimersByTime(1000)
    })
    act(() => {
      fireEvent.pointerEnter(card as Element)
    })
    act(() => {
      vi.advanceTimersByTime(TOAST_DURATION_MS.success * 3)
    })
    expect(politeRegion()?.textContent).toBe(message)

    act(() => {
      fireEvent.pointerLeave(card as Element)
    })
    act(() => {
      vi.advanceTimersByTime(TOAST_DURATION_MS.success - 1000 - 50)
    })
    expect(politeRegion()?.textContent).toBe(message)

    act(() => {
      vi.advanceTimersByTime(100)
    })
    expect(politeRegion()?.textContent).toBe('')
  })

  it('카드 안에 포커스가 있는 동안 사라지지 않고, 포커스가 떠나면 다시 잰다', () => {
    mount()
    act(() =>
      show({
        message,
        action: { label: '되돌리기', onAction: () => undefined },
      }),
    )
    const close = document.body.querySelector(
      'button[aria-label="알림 닫기"]',
    ) as HTMLButtonElement

    const announced = announcementOf({
      id: 'x',
      tone: 'success',
      message,
      action: { label: '되돌리기', onAction: () => undefined },
    })
    expect(politeRegion()?.textContent).toBe(announced)

    act(() => {
      close.focus()
    })
    act(() => {
      vi.advanceTimersByTime(60_000)
    })
    expect(politeRegion()?.textContent).toBe(announced)

    act(() => {
      close.blur()
    })
    act(() => {
      vi.advanceTimersByTime(60_000)
    })
    expect(politeRegion()?.textContent).toBe('')
  })
})

/*
  붙잡은 카드가 pointerleave·blur 없이 사라지는 세 경로(키로 닫기·상한 밀어내기·같은 키 교체). 사라진 카드의 id 가
  멈춤 판정에 남으면 이후 토스트가 영영 닫히지 않는다(리뷰 HIGH).
*/
describe('ToastProvider — 붙잡은 카드가 사라지면 남은 토스트는 다시 닫힌다', () => {
  const hover = (message: string) => {
    const card = cardOf(message)
    expect(card).not.toBeNull()
    act(() => {
      fireEvent.pointerEnter(card as Element)
    })
  }
  const advance = (ms: number) => {
    act(() => {
      vi.advanceTimersByTime(ms)
    })
  }

  it('키로 닫힌 경우(dismissToast)', () => {
    mount()
    act(() => show({ message: '첫째 알림이에요.', dedupeKey: 'first' }))
    act(() => show({ message: '둘째 알림이에요.' }))
    hover('첫째 알림이에요.')

    act(() => dismissByKey('first'))
    expect(cardOf('첫째 알림이에요.')).toBeNull()

    advance(TOAST_DURATION_MS.success)
    expect(politeRegion()?.textContent).toBe('')
  })

  it('상한을 넘어 밀려난 경우(TOAST_LIMIT)', () => {
    mount()
    act(() => show({ message: '밀려날 알림이에요.' }))
    hover('밀려날 알림이에요.')

    for (let index = 0; index < TOAST_LIMIT; index += 1) {
      act(() => show({ message: `새 알림 ${index}번이에요.` }))
    }
    expect(cardOf('밀려날 알림이에요.')).toBeNull()

    advance(TOAST_DURATION_MS.success)
    expect(politeRegion()?.textContent).toBe('')
  })

  it('같은 키로 교체된 경우(dedupe)', () => {
    mount()
    act(() => show({ message: '보관했어요.', dedupeKey: 'save' }))
    hover('보관했어요.')

    act(() => show({ message: '보관을 해제했어요.', dedupeKey: 'save' }))
    expect(cardOf('보관했어요.')).toBeNull()

    advance(TOAST_DURATION_MS.success)
    expect(politeRegion()?.textContent).toBe('')
  })
})
