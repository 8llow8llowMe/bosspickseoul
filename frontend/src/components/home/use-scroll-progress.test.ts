// @vitest-environment jsdom
import { createElement, useState } from 'react'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useScrollProgress } from '@/components/home/use-scroll-progress'

/*
 * 이 파일이 잡는 회귀는 하나다: **트랙 요소가 나중에 붙는 화면에서 스크롤 진행도가
 * 영영 0 에 머무는 것.**
 *
 * 예전 구현은 `RefObject` 를 받아 `useEffect(..., [ref])` 안에서 `ref.current` 를 읽었다.
 * 요소가 아직 없으면 effect 가 빠져나오는데, 의존성인 **ref 객체는 절대 바뀌지 않아**
 * 나중에 요소가 붙어도 effect 가 다시 돌지 않았다. `popular-districts` 가 로딩 동안
 * 스켈레톤을 반환하는 바로 그 경우라, 「지금 많이 본 지역」의 지표가 스크롤해도
 * 첫 값에 고정돼 있었다.
 *
 * 브라우저 자동화로는 이 동작을 확인할 수 없다 — pane 이 숨겨지면 rAF·scroll 이 아예
 * 발화하지 않는다(`interaction-polish.md` D8-10). 그래서 여기서 잠근다.
 */

let root: ReturnType<typeof createRoot> | null = null
let container: HTMLDivElement | null = null

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  // 이 훅은 reduced-motion 이면 진행도를 1 로 고정하고 리스너를 걸지 않는다.
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn() }),
  )
  // jsdom 은 rAF 를 늦게 부른다 — 즉시 실행해 테스트가 타이머에 기대지 않게 한다.
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    cb(0)
    return 1
  })
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
})

afterEach(() => {
  act(() => root?.unmount())
  container?.remove()
  root = null
  container = null
  vi.unstubAllGlobals()
})

/** 트랙을 `mounted` 일 때만 그리는 화면 — 로딩 뒤 트랙이 붙는 실제 구조 그대로다. */
const LateTrack = () => {
  const { ref, progress } = useScrollProgress()
  const [mounted, setMounted] = useState(false)

  return createElement(
    'div',
    null,
    createElement(
      'button',
      { type: 'button', onClick: () => setMounted(true) },
      '데이터 도착',
    ),
    createElement('output', null, String(progress)),
    mounted ? createElement('section', { ref }) : null,
  )
}

const readProgress = () =>
  Number(container?.querySelector('output')?.textContent ?? 'NaN')

describe('useScrollProgress', () => {
  it('트랙이 나중에 붙어도 스크롤을 듣기 시작한다', () => {
    const addSpy = vi.spyOn(window, 'addEventListener')

    act(() => {
      root = createRoot(container!)
      root.render(createElement(LateTrack))
    })

    // 트랙이 아직 없다 — 이 시점에 리스너가 걸리면 안 된다.
    expect(
      addSpy.mock.calls.filter(([type]) => type === 'scroll'),
    ).toHaveLength(0)

    // 데이터가 도착해 트랙이 붙는다.
    act(() => {
      container?.querySelector('button')?.click()
    })

    /*
     * 핵심 단언. 예전 구현은 여기서 0 이었다 — effect 가 다시 돌지 않아 리스너를
     * 영영 걸지 않았다.
     */
    expect(
      addSpy.mock.calls.filter(([type]) => type === 'scroll').length,
    ).toBeGreaterThan(0)
  })

  it('트랙이 붙는 순간 진행도를 한 번 잰다', () => {
    act(() => {
      root = createRoot(container!)
      root.render(createElement(LateTrack))
    })

    expect(readProgress()).toBe(0)

    act(() => {
      container?.querySelector('button')?.click()
    })

    // jsdom 의 rect 는 전부 0 이라 값 자체는 0 이지만, 측정이 **돌았다는** 것이
    // 위 테스트의 리스너 등록으로 확인된다. 여기서는 NaN·에러 없이 수가 나오는지만 본다.
    expect(Number.isFinite(readProgress())).toBe(true)
  })
})
