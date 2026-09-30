import { describe, expect, it, vi } from 'vitest'

import { createStatusHighlightStore } from './status-highlight-store'

describe('createStatusHighlightStore', () => {
  it('enter 로 강조하고 같은 구의 leave 로만 지운다', () => {
    const store = createStatusHighlightStore()

    store.enter('11680')
    store.leave('11650')
    expect(store.get()).toBe('11680')

    store.leave('11680')
    expect(store.get()).toBeNull()
  })

  it('다른 구로 옮긴 뒤 늦게 온 이전 구의 leave 는 새 강조를 지우지 않는다', () => {
    const store = createStatusHighlightStore()

    store.enter('11680')
    store.enter('11710')
    store.leave('11680')

    expect(store.get()).toBe('11710')
  })

  it('값이 바뀔 때만 구독자에게 알린다', () => {
    const store = createStatusHighlightStore()
    const listener = vi.fn()
    const unsubscribe = store.subscribe(listener)

    store.enter('11680')
    store.enter('11680')
    store.clear()
    store.clear()
    unsubscribe()
    store.enter('11710')

    expect(listener).toHaveBeenCalledTimes(2)
  })
})
