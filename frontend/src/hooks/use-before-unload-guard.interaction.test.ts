// @vitest-environment jsdom
import { cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useBeforeUnloadGuard } from '@/hooks/use-before-unload-guard'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

const fireBeforeUnload = () => {
  const event = new Event('beforeunload', { cancelable: true })
  window.dispatchEvent(event)
  return event
}

describe('useBeforeUnloadGuard — 새로고침·탭 닫기 확인(CM-035)', () => {
  it('켜져 있을 때만 막는다', () => {
    const { rerender } = renderHook(active => useBeforeUnloadGuard(active), {
      initialProps: false,
    })

    expect(fireBeforeUnload().defaultPrevented).toBe(false)

    rerender(true)
    expect(fireBeforeUnload().defaultPrevented).toBe(true)

    rerender(false)
    expect(fireBeforeUnload().defaultPrevented).toBe(false)
  })

  it('returnValue 를 참 값으로 채운다 — 빈 문자열이면 오래된 브라우저가 확인을 띄우지 않는다', () => {
    renderHook(() => useBeforeUnloadGuard(true))
    const event = new Event('beforeunload', { cancelable: true })
    let assigned: unknown = undefined
    Object.defineProperty(event, 'returnValue', {
      configurable: true,
      get: () => assigned,
      set: value => {
        assigned = value
      },
    })

    window.dispatchEvent(event)

    expect(assigned).toBe(true)
  })

  it('언마운트하면 리스너를 떼어 낸다', () => {
    const remove = vi.spyOn(window, 'removeEventListener')
    const { unmount } = renderHook(() => useBeforeUnloadGuard(true))

    unmount()

    expect(remove).toHaveBeenCalledWith('beforeunload', expect.any(Function))
    expect(fireBeforeUnload().defaultPrevented).toBe(false)
  })
})
