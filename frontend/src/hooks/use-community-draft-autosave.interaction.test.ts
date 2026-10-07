// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useCommunityDraftAutosave } from '@/hooks/use-community-draft-autosave'
import type { CommunityStorageGetter } from '@/lib/community/editor-draft'

/*
  임시 저장(community.md §S4 「잃지 않게」)을 실제 타이머로 잠근다. 멈춘 뒤 1초, 키, 사진 제외,
  저장 중(pending)엔 잡힌 저장을 곧바로 밀어 쓰고 등록 성공(submitted)이면 버림, 이어 쓰기 뒤 되돌리면
  지움, 언마운트·새로고침 직전 밀어 쓰기.
*/

const KEY = 'community-draft:9001:new'
const district = {
  targetType: 'DISTRICT' as const,
  targetCode: '11200',
  targetName: '성동구',
}

type Props = Parameters<typeof useCommunityDraftAutosave>[0]

const baseProps = (overrides: Partial<Props> = {}): Props => ({
  storageKey: KEY,
  value: { title: '제목', content: '', location: district },
  dirty: true,
  pending: false,
  submitted: false,
  getStorage: () => window.localStorage,
  ...overrides,
})

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-10-01T00:00:00Z'))
  window.localStorage.clear()
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

const stored = () => {
  const raw = window.localStorage.getItem(KEY)
  return raw ? JSON.parse(raw) : null
}

describe('useCommunityDraftAutosave', () => {
  it('입력이 멈추고 1초 뒤에 한 번 쓴다 — 그 전에 다시 치면 미룬다', () => {
    const { rerender } = renderHook(props => useCommunityDraftAutosave(props), {
      initialProps: baseProps(),
    })

    act(() => {
      vi.advanceTimersByTime(900)
    })
    expect(stored()).toBeNull()

    rerender(
      baseProps({ value: { title: '제목2', content: '', location: district } }),
    )
    act(() => {
      vi.advanceTimersByTime(900)
    })
    expect(stored()).toBeNull()

    act(() => {
      vi.advanceTimersByTime(100)
    })
    expect(stored()).toEqual({
      title: '제목2',
      content: '',
      location: district,
      // 말머리를 넘기지 않았으면 「없음」으로 적는다 — 필드가 빠진 옛 저장본(「모름」)과 가른다(#529).
      category: null,
      savedAt: Date.parse('2026-10-01T00:00:01.900Z'),
    })
  })

  it('고른 말머리도 저장한다(#529)', () => {
    renderHook(() =>
      useCommunityDraftAutosave(
        baseProps({
          value: {
            title: '제목',
            content: '',
            location: district,
            category: 'EXPERIENCE',
          },
        }),
      ),
    )

    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(stored()).toMatchObject({ title: '제목', category: 'EXPERIENCE' })
  })

  it('사진은 저장하지 않는다 — 값에 섞여 와도 키를 쓰지 않는다', () => {
    renderHook(() =>
      useCommunityDraftAutosave(
        baseProps({
          value: {
            title: '제목',
            content: '본문',
            location: district,
            // 폼이 통째로 넘겨도 저장본에는 빠져야 한다.
            ...({
              images: [{ imageKey: 'k', imageUrl: 'u', sortOrder: 0 }],
            } as object),
          },
        }),
      ),
    )

    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(window.localStorage.getItem(KEY)).not.toContain('imageKey')
    expect(Object.keys(stored())).toEqual([
      'title',
      'content',
      'location',
      'category',
      'savedAt',
    ])
  })

  it('키가 없거나(비교 초안·회원 id 없음) 등록 성공 뒤면 쓰지 않는다', () => {
    const { rerender } = renderHook(props => useCommunityDraftAutosave(props), {
      initialProps: baseProps({ storageKey: null }),
    })

    act(() => {
      vi.advanceTimersByTime(2000)
    })
    expect(window.localStorage.length).toBe(0)

    rerender(baseProps({ submitted: true }))
    act(() => {
      vi.advanceTimersByTime(2000)
    })
    expect(stored()).toBeNull()
  })

  it('등록 성공(submitted)이 걸리면 이미 잡힌 저장도 버린다 — 저장본이 되살아나지 않는다', () => {
    const { rerender, unmount } = renderHook(
      props => useCommunityDraftAutosave(props),
      { initialProps: baseProps() },
    )

    act(() => {
      vi.advanceTimersByTime(500)
    })
    rerender(baseProps({ pending: true, submitted: true }))
    act(() => {
      vi.advanceTimersByTime(2000)
    })
    unmount()

    expect(stored()).toBeNull()
  })

  it('저장 중(pending)이 되면 잡힌 저장을 버리지 않고 그 자리에서 밀어 쓴다', () => {
    const { rerender } = renderHook(props => useCommunityDraftAutosave(props), {
      initialProps: baseProps(),
    })

    act(() => {
      vi.advanceTimersByTime(300)
    })
    rerender(baseProps({ pending: true }))

    // 1초를 기다리지 않는다 — 401 로 로그인에 보내지며 언마운트돼도 남아 있어야 한다.
    expect(stored()?.title).toBe('제목')
  })

  it('저장 중(pending)에 언마운트돼도(401 → 로그인 이동) 1초 안에 친 글이 남는다', () => {
    const { rerender, unmount } = renderHook(
      props => useCommunityDraftAutosave(props),
      { initialProps: baseProps() },
    )

    act(() => {
      vi.advanceTimersByTime(300)
    })
    rerender(baseProps({ pending: true }))
    unmount()

    expect(stored()?.title).toBe('제목')
  })

  it('이어 쓰기로 시작해 원래 값으로 되돌리면 저장본을 지운다', () => {
    window.localStorage.setItem(
      KEY,
      JSON.stringify({
        title: '쓰던 제목',
        content: '',
        location: {},
        savedAt: 1,
      }),
    )
    const { rerender } = renderHook(props => useCommunityDraftAutosave(props), {
      initialProps: baseProps({
        startedFromStored: true,
        value: { title: '쓰던 제목', content: '', location: {} },
      }),
    })

    // 1초가 차기 전에 되돌린다 — 이 훅은 아직 한 번도 쓰지 않았다.
    act(() => {
      vi.advanceTimersByTime(200)
    })
    rerender(
      baseProps({
        startedFromStored: true,
        dirty: false,
        value: { title: '', content: '', location: {} },
      }),
    )
    act(() => {
      vi.advanceTimersByTime(1000)
    })

    expect(stored()).toBeNull()
  })

  it('처음 값으로 되돌리면 앞서 쓴 저장본을 지운다', () => {
    const { rerender } = renderHook(props => useCommunityDraftAutosave(props), {
      initialProps: baseProps(),
    })

    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(stored()).not.toBeNull()

    rerender(
      baseProps({
        dirty: false,
        value: { title: '', content: '', location: district },
      }),
    )
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(stored()).toBeNull()
  })

  it('처음부터 바뀐 것이 없으면 storage 를 건드리지 않는다', () => {
    const getStorage = vi.fn(() => window.localStorage)

    renderHook(() =>
      useCommunityDraftAutosave(baseProps({ dirty: false, getStorage })),
    )
    act(() => {
      vi.advanceTimersByTime(2000)
    })

    expect(getStorage).not.toHaveBeenCalled()
  })

  it('1초가 지나기 전에 나가거나 새로고침하면 그 자리에서 밀어 쓴다', () => {
    const first = renderHook(() => useCommunityDraftAutosave(baseProps()))

    act(() => {
      vi.advanceTimersByTime(300)
    })
    first.unmount()
    expect(stored()?.title).toBe('제목')

    window.localStorage.clear()
    renderHook(() =>
      useCommunityDraftAutosave(
        baseProps({ value: { title: '새로고침', content: '', location: {} } }),
      ),
    )
    act(() => {
      window.dispatchEvent(new Event('pagehide'))
    })
    expect(stored()?.title).toBe('새로고침')
  })

  it('storage 가 던져도 화면은 멀쩡하다', () => {
    const blocked: CommunityStorageGetter = () => {
      throw new Error('SecurityError')
    }

    const { unmount } = renderHook(() =>
      useCommunityDraftAutosave(baseProps({ getStorage: blocked })),
    )

    expect(() => {
      act(() => {
        vi.advanceTimersByTime(1000)
      })
      unmount()
    }).not.toThrow()
  })
})
