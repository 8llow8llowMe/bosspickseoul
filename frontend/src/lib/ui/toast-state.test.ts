import { describe, expect, it } from 'vitest'

import {
  TOAST_ACTION_DURATION_MS,
  TOAST_DURATION_MS,
  TOAST_LIMIT,
  appendToast,
  dismissToast,
  toastDurationMs,
  type Toast,
} from '@/lib/ui/toast-state'

const toast = (overrides: Partial<Toast> = {}): Toast => ({
  id: '1',
  tone: 'success',
  message: '저장했어요',
  ...overrides,
})

describe('appendToast', () => {
  it('뒤에 붙인다', () => {
    const next = appendToast([toast({ id: 'a' })], toast({ id: 'b' }))

    expect(next.map(item => item.id)).toEqual(['a', 'b'])
  })

  it('상한을 넘으면 가장 오래된 것부터 밀어낸다', () => {
    const filled = Array.from({ length: TOAST_LIMIT }, (_, index) =>
      toast({ id: String(index) }),
    )

    const next = appendToast(filled, toast({ id: 'new' }))

    expect(next).toHaveLength(TOAST_LIMIT)
    expect(next[0].id).toBe('1')
    expect(next.at(-1)?.id).toBe('new')
  })

  it('같은 dedupeKey 는 그 자리에서 교체한다', () => {
    // 보관 버튼을 연달아 누를 때 "저장했어요/해제했어요"가 쌓이면 지금 상태를 알 수 없다.
    const before = [
      toast({ id: 'a', dedupeKey: 'archive', message: '보관했어요' }),
      toast({ id: 'b', dedupeKey: 'share' }),
    ]

    const next = appendToast(
      before,
      toast({ id: 'c', dedupeKey: 'archive', message: '보관을 해제했어요' }),
    )

    expect(next).toHaveLength(2)
    // 자리를 옮기지 않는다 — 교체마다 아래로 튀면 읽던 문구를 놓친다.
    expect(next[0].message).toBe('보관을 해제했어요')
    expect(next[1].id).toBe('b')
  })

  it('dedupeKey 가 없으면 교체하지 않는다', () => {
    const next = appendToast([toast({ id: 'a' })], toast({ id: 'b' }))

    expect(next).toHaveLength(2)
  })
})

describe('dismissToast', () => {
  it('해당 id 만 걷어낸다', () => {
    const next = dismissToast([toast({ id: 'a' }), toast({ id: 'b' })], 'a')

    expect(next.map(item => item.id)).toEqual(['b'])
  })

  it('없는 id 는 아무것도 바꾸지 않는다', () => {
    const before = [toast({ id: 'a' })]

    expect(dismissToast(before, 'zzz')).toEqual(before)
  })
})

describe('toastDurationMs', () => {
  it('오류를 더 오래 둔다', () => {
    // 오류 문구는 서버 메시지가 그대로 실려 읽을 내용이 많다.
    expect(toastDurationMs(toast({ tone: 'error' }))).toBe(
      TOAST_DURATION_MS.error,
    )
    expect(TOAST_DURATION_MS.error).toBeGreaterThan(TOAST_DURATION_MS.success)
  })

  it('액션이 달리면 누를 시간을 준다', () => {
    const withAction = toast({
      action: { label: '이어서 보관하기', onAction: () => undefined },
    })

    expect(toastDurationMs(withAction)).toBe(TOAST_ACTION_DURATION_MS)
    expect(TOAST_ACTION_DURATION_MS).toBeGreaterThan(TOAST_DURATION_MS.success)
  })
})
