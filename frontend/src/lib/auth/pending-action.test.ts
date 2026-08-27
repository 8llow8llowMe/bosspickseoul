import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  clearPendingAction,
  rememberPendingAction,
  takePendingAction,
} from '@/lib/auth/pending-action'

const createStorage = () => {
  const map = new Map<string, string>()
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, value),
    removeItem: (key: string) => void map.delete(key),
    size: () => map.size,
  }
}

let store: ReturnType<typeof createStorage>

beforeEach(() => {
  store = createStorage()
  vi.stubGlobal('window', { sessionStorage: store })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('rememberPendingAction / takePendingAction', () => {
  it('기억한 값을 돌려준다', () => {
    rememberPendingAction('archive:commercial-1|CS100001')

    expect(takePendingAction()).toBe('archive:commercial-1|CS100001')
  })

  it('읽으면 지운다', () => {
    // 남겨 두면 새로고침마다 되살아나고, StrictMode 가 effect 를 두 번 호출할 때
    // 이어하기 토스트가 두 장 뜬다.
    rememberPendingAction('archive:x')

    expect(takePendingAction()).toBe('archive:x')
    expect(takePendingAction()).toBeNull()
    expect(store.size()).toBe(0)
  })

  it('기억한 적 없으면 null 이다', () => {
    expect(takePendingAction()).toBeNull()
  })

  it('빈 키는 기억하지 않는다', () => {
    rememberPendingAction('')

    expect(takePendingAction()).toBeNull()
  })
})

describe('clearPendingAction', () => {
  it('기억을 버린다', () => {
    rememberPendingAction('archive:x')
    clearPendingAction()

    expect(takePendingAction()).toBeNull()
  })
})

describe('저장소를 쓸 수 없을 때', () => {
  it('서버에서는 조용히 아무 일도 하지 않는다', () => {
    vi.stubGlobal('window', undefined)

    expect(() => rememberPendingAction('archive:x')).not.toThrow()
    expect(takePendingAction()).toBeNull()
  })

  it('접근이 막혀 있어도 원래 흐름을 깨지 않는다', () => {
    // 사파리 프라이빗 모드 등에서 sessionStorage 접근 자체가 throw 한다.
    vi.stubGlobal('window', {
      get sessionStorage(): Storage {
        throw new Error('blocked')
      },
    })

    expect(() => rememberPendingAction('archive:x')).not.toThrow()
    expect(() => clearPendingAction()).not.toThrow()
    expect(takePendingAction()).toBeNull()
  })
})
