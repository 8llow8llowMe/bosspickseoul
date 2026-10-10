// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react'
import { createElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import SimulationSummaryBar from '@/components/simulation/simulation-summary-bar'

/*
 * #605 — 375 에서 고정 하단 바 뒤로 푸터 로고가 비쳤다. 바는 문서 흐름에 자리가 없어 본문 여백으로는 그 뒤의
 * 푸터를 지킬 수 없다. 문서 끝(body 끝, 푸터 뒤)에 바를 잰 높이만큼 빈 칸을 둔다.
 * 레이아웃 자체(겹치는지)는 jsdom 이 계산하지 않으므로 375·390 실측이 따로 있다.
 */

const BAR_HEIGHT = 105

let observed: ResizeObserverCallback | null = null

beforeEach(() => {
  // jsdom 에는 ResizeObserver 와 레이아웃이 없다. 관찰을 시작하면 한 번 알리는 실제 동작만 흉내 낸다.
  globalThis.ResizeObserver = class {
    constructor(callback: ResizeObserverCallback) {
      observed = callback
    }
    observe() {
      observed?.([], this as unknown as ResizeObserver)
    }
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(
    BAR_HEIGHT,
  )
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  observed = null
})

const renderBar = () =>
  render(
    createElement(SimulationSummaryBar, {
      totalPrice: null,
      reportHref: null,
      gap: null,
      progress: { done: 4, total: 4 },
      isPending: false,
      onCalculate: () => {},
      onViewResult: () => {},
    }),
  )

const spacer = () =>
  document.body.querySelector<HTMLElement>(
    ':scope > [data-simulation-bottom-bar-spacer]',
  )

describe('SimulationBottomBarSpacer (#605)', () => {
  it('문서 끝(body 의 마지막)에 바를 잰 높이만큼 자리를 둔다', () => {
    renderBar()

    expect(spacer()).not.toBeNull()
    expect(document.body.lastElementChild).toBe(spacer())
    expect(spacer()?.style.height).toBe(`${BAR_HEIGHT}px`)
    expect(spacer()?.getAttribute('aria-hidden')).toBe('true')
  })

  it('바가 사라지면 자리도 걷는다', () => {
    const { unmount } = renderBar()

    unmount()

    expect(spacer()).toBeNull()
  })
})
