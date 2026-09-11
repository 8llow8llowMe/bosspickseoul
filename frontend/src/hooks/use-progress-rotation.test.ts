// @vitest-environment jsdom
import { renderHook, act } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useProgressRotation } from '@/hooks/use-progress-rotation'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('useProgressRotation', () => {
  it('interval마다 다음 문구로 순환한다', () => {
    const { result } = renderHook(() => useProgressRotation(['a', 'b'], 4000))
    expect(result.current).toBe('a')
    act(() => void vi.advanceTimersByTime(4000))
    expect(result.current).toBe('b')
    act(() => void vi.advanceTimersByTime(4000))
    expect(result.current).toBe('a')
  })
  it('빈 배열이면 빈 문자열', () => {
    const { result } = renderHook(() => useProgressRotation([], 4000))
    expect(result.current).toBe('')
  })
  it('문구 목록이 바뀌면 첫 문구부터 다시 돈다', () => {
    // 렌더마다 반환값을 적어 둔다. 초기화를 effect 에서 하면 「이전 index 로 한 번
    // 렌더한 뒤 0 으로 되돌리는」 중간 렌더가 남아 새 목록의 둘째 문구가 스쳐 간다.
    // 최종값만 보는 단언은 act() 가 effect 를 흘려보내므로 그 차이를 못 잡는다.
    const rendered: string[] = []
    const { rerender } = renderHook(
      ({ messages }) => {
        const current = useProgressRotation(messages, 4000)
        rendered.push(current)
        return current
      },
      { initialProps: { messages: ['a', 'b'] } },
    )
    act(() => void vi.advanceTimersByTime(4000))
    expect(rendered.at(-1)).toBe('b')

    rendered.length = 0
    rerender({ messages: ['x', 'y'] })
    expect(rendered).not.toContain('y')
    expect(rendered.at(-1)).toBe('x')

    act(() => void vi.advanceTimersByTime(4000))
    expect(rendered.at(-1)).toBe('y')
  })
  it('같은 내용으로 다시 렌더하면 회전을 처음으로 되돌리지 않는다', () => {
    const { result, rerender } = renderHook(
      ({ messages }) => useProgressRotation(messages, 4000),
      { initialProps: { messages: ['a', 'b'] } },
    )
    act(() => void vi.advanceTimersByTime(4000))
    expect(result.current).toBe('b')

    // 매 렌더 새 배열이 와도 내용이 같으면 key 가 같아 유지된다
    rerender({ messages: ['a', 'b'] })
    expect(result.current).toBe('b')
  })
})
