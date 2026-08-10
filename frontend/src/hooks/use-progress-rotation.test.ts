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
})
